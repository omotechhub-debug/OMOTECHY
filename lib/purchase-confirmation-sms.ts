import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { smsService } from '@/lib/sms';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';

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

export function formatPurchaseConfirmationMessage(params: {
  items: string;
  amount: number;
  orderNumber: string;
}) {
  const orderNo = String(params.orderNumber || '').replace(/^#/, '');
  const amount = Number(params.amount) || 0;

  return [
    'OMOTECH HUB COMPUTERS',
    '',
    'Thank you for shopping with us.',
    '',
    `Purchase: ${params.items}`,
    `Amount: KSh ${amount.toLocaleString('en-KE')}`,
    `Order No: #${orderNo}`,
    '',
    'Your purchase has been confirmed successfully.',
    '',
    'Thank you for choosing Omotech Hub Computers.',
    'We appreciate your business.',
  ].join('\n');
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

  const message = formatPurchaseConfirmationMessage({
    items: formatPurchaseItems(claimed.services),
    amount: claimed.totalAmount || claimed.amountPaid || 0,
    orderNumber: claimed.orderNumber,
  });

  try {
    await smsService.sendSMS(phone, message);
    console.log(`Purchase confirmation SMS sent for order ${claimed.orderNumber} to ${phone}`);
    return { sent: true };
  } catch (error) {
    await Order.updateOne({ _id: claimed._id }, { $unset: { purchaseConfirmationSmsSentAt: 1 } });
    console.error(`Purchase confirmation SMS failed for order ${claimed.orderNumber}:`, error);
    return { sent: false, reason: 'sms_failed' };
  }
}
