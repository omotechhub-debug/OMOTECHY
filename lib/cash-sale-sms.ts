import { formatPurchaseItems } from '@/lib/purchase-confirmation-sms';
import { getSmsRuntimeConfig } from '@/lib/sms-config';
import { renderSmsTemplate } from '@/lib/sms-templates';
import { smsService } from '@/lib/sms';

export async function sendCashSaleAdminSms(order: {
  customer?: { phone?: string; name?: string };
  services?: Array<{ serviceName?: string; name?: string; quantity?: number }>;
  totalAmount?: number;
  orderNumber?: string;
  station?: { name?: string };
}) {
  const runtime = await getSmsRuntimeConfig();
  const phone = runtime.dailyReportPhone || '+254757883799';
  const amount = Number(order.totalAmount) || 0;
  const message = await renderSmsTemplate('cash_sale_admin', {
    items: formatPurchaseItems(order.services),
    amount: `KSh ${amount.toLocaleString('en-KE')}`,
    order_no: String(order.orderNumber || '').replace(/^#/, ''),
    customer: order.customer?.name || 'Customer',
    phone: order.customer?.phone || '',
    station: order.station?.name || '',
  });

  await smsService.sendSMS(phone, message);
  return { sent: true, phone };
}
