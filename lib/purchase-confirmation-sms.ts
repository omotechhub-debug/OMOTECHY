import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { smsService } from '@/lib/sms';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';
import { applySmsTemplate, DEFAULT_SMS_TEMPLATES } from '@/lib/sms-template-defs';
import { renderSmsTemplate } from '@/lib/sms-templates';

export function formatPurchaseItems(services: Array<{ serviceName?: string; name?: string; quantity?: number }> | undefined) {
  const parts = (services || []).map((service) => {
    const name = (service.serviceName || service.name || '').trim().replace(/\s+/g, ' ');
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
    amount: `Ksh ${amount.toLocaleString('en-US')}`,
    order_no: orderNo,
  };
}

function hasUnfilledPlaceholders(message: string) {
  return /\{\{\s*[a-z0-9_]+\s*\}\}/i.test(message || '');
}

export function formatPurchaseConfirmationMessage(params: {
  items: string;
  amount: number;
  orderNumber: string;
}) {
  return applySmsTemplate(DEFAULT_SMS_TEMPLATES.purchase_confirmation, purchaseVars(params));
}

export async function sendPurchaseConfirmationIfNeeded(orderId: unknown) {
  if (!orderId) return { sent: false, reason: 'missing_order' };

  await connectDB();

  const order = await Order.findOneAndUpdate(
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

  if (!order) {
    return { sent: false, reason: 'already_sent_or_unpaid' };
  }

  const phone = normalizeKenyaPhoneLocal(order.customer?.phone);
  if (!phone) {
    await Order.updateOne({ _id: order._id }, { $unset: { purchaseConfirmationSmsSentAt: 1 } });
    return { sent: false, reason: 'no_phone' };
  }

  const vars = purchaseVars({
    items: formatPurchaseItems(order.services),
    amount: order.totalAmount || order.amountPaid || 0,
    orderNumber: order.orderNumber,
  });

  let message = '';
  try {
    message = await renderSmsTemplate('purchase_confirmation', vars);
  } catch (error) {
    console.error(`Purchase confirmation template render failed for ${order.orderNumber}:`, error);
  }

  if (!message || hasUnfilledPlaceholders(message)) {
    message = formatPurchaseConfirmationMessage({
      items: vars.items,
      amount: order.totalAmount || order.amountPaid || 0,
      orderNumber: order.orderNumber,
    });
  }

  if (!message || hasUnfilledPlaceholders(message)) {
    await Order.updateOne({ _id: order._id }, { $unset: { purchaseConfirmationSmsSentAt: 1 } });
    console.error(`Purchase confirmation SMS skipped for ${order.orderNumber}: template was not filled`);
    return { sent: false, reason: 'template_unfilled' };
  }

  try {
    await smsService.sendSMS(phone, message);
    console.log(`Purchase confirmation SMS sent for order ${order.orderNumber} to ${phone}`);
    return { sent: true };
  } catch (error) {
    await Order.updateOne({ _id: order._id }, { $unset: { purchaseConfirmationSmsSentAt: 1 } });
    console.error(`Purchase confirmation SMS failed for order ${order.orderNumber}:`, error);
    return { sent: false, reason: 'sms_failed' };
  }
}
