import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Customer from '@/lib/models/Customer';
import { smsService } from '@/lib/sms';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';
import { applySmsTemplate, DEFAULT_SMS_TEMPLATES } from '@/lib/sms-template-defs';
import { renderSmsTemplate } from '@/lib/sms-templates';
import { kenyaDateKey, kenyaDayBounds } from '@/lib/daily-business-report';

export function formatPurchaseItems(services: Array<{ serviceName?: string; name?: string; quantity?: number }> | undefined) {
  const parts = (services || []).map((service) => {
    const name = (service.serviceName || service.name || '').trim();
    if (!name) return '';
    const quantity = Number(service.quantity) || 1;
    return quantity > 1 ? `${name} x${quantity}` : name;
  }).filter(Boolean);

  if (parts.length === 0) return 'Item/Service';
  if (parts.length <= 3) return parts.join(', ');
  return `${parts.slice(0, 2).join(', ')} + ${parts.length - 2} more`;
}

function purchaseVars(params: {
  items: string;
  amount: number;
  orderNumber: string;
}) {
  const orderNo = String(params.orderNumber || '').replace(/^#/, '');
  const amount = Number(params.amount) || 0;
  return {
    items: params.items,
    amount: `KSh ${amount.toLocaleString('en-KE')}`,
    order_no: orderNo,
  };
}

export function formatPurchaseConfirmationMessage(params: {
  items: string;
  amount: number;
  orderNumber: string;
}) {
  return applySmsTemplate(DEFAULT_SMS_TEMPLATES.purchase_confirmation, purchaseVars(params));
}

async function alreadySentPurchaseSmsToday(phone: string, excludeOrderId: unknown) {
  const todayKey = kenyaDateKey();
  const { start, end } = kenyaDayBounds(todayKey);

  const customer = await Customer.findOne({ phone }).select('lastPurchaseConfirmationDate').lean();
  if (customer?.lastPurchaseConfirmationDate === todayKey) {
    return true;
  }

  const otherToday = await Order.exists({
    _id: { $ne: excludeOrderId },
    paymentStatus: 'paid',
    'customer.phone': phone,
    purchaseConfirmationSmsSentAt: { $gte: start, $lte: end },
  });
  return Boolean(otherToday);
}

async function claimCustomerPurchaseSmsDay(phone: string, name?: string) {
  const todayKey = kenyaDateKey();
  const existing = await Customer.findOne({ phone }).select('_id lastPurchaseConfirmationDate');
  if (existing) {
    if (existing.lastPurchaseConfirmationDate === todayKey) {
      return false;
    }
    const claimed = await Customer.findOneAndUpdate(
      {
        _id: existing._id,
        $or: [
          { lastPurchaseConfirmationDate: { $exists: false } },
          { lastPurchaseConfirmationDate: null },
          { lastPurchaseConfirmationDate: '' },
          { lastPurchaseConfirmationDate: { $ne: todayKey } },
        ],
      },
      { $set: { lastPurchaseConfirmationDate: todayKey, lastPurchaseConfirmationAt: new Date() } },
      { new: false }
    );
    return Boolean(claimed);
  }

  try {
    await Customer.create({
      name: (name || '').trim() || 'Customer',
      phone,
      lastPurchaseConfirmationDate: todayKey,
      lastPurchaseConfirmationAt: new Date(),
    });
    return true;
  } catch {
    const created = await Customer.findOne({ phone }).select('lastPurchaseConfirmationDate');
    if (created?.lastPurchaseConfirmationDate === todayKey) {
      return false;
    }
    const claimed = await Customer.findOneAndUpdate(
      {
        phone,
        $or: [
          { lastPurchaseConfirmationDate: { $exists: false } },
          { lastPurchaseConfirmationDate: null },
          { lastPurchaseConfirmationDate: '' },
          { lastPurchaseConfirmationDate: { $ne: todayKey } },
        ],
      },
      { $set: { lastPurchaseConfirmationDate: todayKey, lastPurchaseConfirmationAt: new Date() } },
      { new: false }
    );
    return Boolean(claimed);
  }
}

export async function sendPurchaseConfirmationIfNeeded(orderId: unknown) {
  if (!orderId) return { sent: false, reason: 'missing_order' };

  await connectDB();

  const claimed = await Order.findOneAndUpdate(
    {
      _id: orderId,
      paymentStatus: 'paid',
      $or: [
        { purchaseConfirmationSmsSentAt: { $exists: false } },
        { purchaseConfirmationSmsSentAt: null },
      ],
    },
    { $set: { purchaseConfirmationSmsSentAt: new Date() } },
    { new: false }
  );

  if (!claimed) {
    return { sent: false, reason: 'already_sent_or_unpaid' };
  }

  const phone = normalizeKenyaPhoneLocal(claimed.customer?.phone);
  if (!phone) {
    await Order.updateOne({ _id: claimed._id }, { $unset: { purchaseConfirmationSmsSentAt: 1 } });
    return { sent: false, reason: 'no_phone' };
  }

  if (await alreadySentPurchaseSmsToday(phone, claimed._id)) {
    console.log(`Purchase confirmation SMS skipped for ${claimed.orderNumber}: already sent to ${phone} today`);
    return { sent: false, reason: 'already_sent_today' };
  }

  const claimedDay = await claimCustomerPurchaseSmsDay(phone, claimed.customer?.name);
  if (!claimedDay) {
    console.log(`Purchase confirmation SMS skipped for ${claimed.orderNumber}: already sent to ${phone} today`);
    return { sent: false, reason: 'already_sent_today' };
  }

  const message = await renderSmsTemplate(
    'purchase_confirmation',
    purchaseVars({
      items: formatPurchaseItems(claimed.services),
      amount: claimed.totalAmount || claimed.amountPaid || 0,
      orderNumber: claimed.orderNumber,
    })
  );

  try {
    await smsService.sendSMS(phone, message);
    console.log(`Purchase confirmation SMS sent for order ${claimed.orderNumber} to ${phone}`);
    return { sent: true };
  } catch (error) {
    const todayKey = kenyaDateKey();
    await Order.updateOne({ _id: claimed._id }, { $unset: { purchaseConfirmationSmsSentAt: 1 } });
    await Customer.updateOne(
      { phone, lastPurchaseConfirmationDate: todayKey },
      { $unset: { lastPurchaseConfirmationDate: 1, lastPurchaseConfirmationAt: 1 } }
    );
    console.error(`Purchase confirmation SMS failed for order ${claimed.orderNumber}:`, error);
    return { sent: false, reason: 'sms_failed' };
  }
}
