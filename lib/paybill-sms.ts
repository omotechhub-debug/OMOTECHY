import { formatPurchaseItems } from '@/lib/purchase-confirmation-sms';
import { getPaybillNumber } from '@/lib/paybill-account';
import { renderSmsTemplate } from '@/lib/sms-templates';
import { smsService } from '@/lib/sms';

export async function sendPaybillInstructionsSms(order: {
  customer?: { phone?: string; name?: string };
  services?: Array<{ serviceName?: string; name?: string; quantity?: number }>;
  totalAmount?: number;
  remainingBalance?: number;
  orderNumber?: string;
  paybillAccount?: string;
}) {
  const phone = order.customer?.phone;
  const account = String(order.paybillAccount || '').trim();
  const paybill = getPaybillNumber();
  if (!phone || !account || !paybill) {
    return { sent: false, reason: 'missing_paybill_details' };
  }

  const amount = Number(order.remainingBalance ?? order.totalAmount) || 0;
  const message = await renderSmsTemplate('paybill_instructions', {
    paybill,
    account,
    amount: `KSh ${amount.toLocaleString('en-KE')}`,
    items: formatPurchaseItems(order.services),
    order_no: String(order.orderNumber || '').replace(/^#/, ''),
    customer: order.customer?.name || '',
  });

  await smsService.sendSMS(phone, message);
  return { sent: true, paybill, account, phone };
}
