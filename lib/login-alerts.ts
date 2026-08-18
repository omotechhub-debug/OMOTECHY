import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import MpesaTransaction from '@/lib/models/MpesaTransaction';
import SmsSettings from '@/lib/models/SmsSettings';
import { smsService } from '@/lib/sms';
import { getSmsRuntimeConfig } from '@/lib/sms-config';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';
import { formatPurchaseItems } from '@/lib/purchase-confirmation-sms';
import { kenyaDateKey } from '@/lib/daily-business-report';
import { kenyaHour, publicAppUrl, sendStockAlertIfMorningLogin } from '@/lib/stock-alert';
import { applySmsTemplate, DEFAULT_SMS_TEMPLATES, ensureRequiredPlaceholders } from '@/lib/sms-template-defs';
import { getSmsTemplates, renderSmsTemplate } from '@/lib/sms-templates';

const SMS_MAX_LENGTH = 1600;

function remainingOf(order: {
  remainingBalance?: number;
  remainingAmount?: number;
  totalAmount?: number;
  amountPaid?: number;
}) {
  const explicit = Number(order.remainingBalance ?? order.remainingAmount);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const total = Number(order.totalAmount) || 0;
  const paid = Number(order.amountPaid) || 0;
  return Math.max(0, total - paid);
}

function formatKes(amount: number) {
  return `KSh ${Math.round(amount).toLocaleString('en-KE')}`;
}

function deficitOrderLines(orders: Array<{
  phone: string;
  items: string;
  remaining: number;
}>) {
  return orders.map((order) => {
    const items = order.items.length > 42 ? `${order.items.slice(0, 39).trim()}...` : order.items;
    return `${order.phone} | ${items} | ${formatKes(order.remaining)} left`;
  });
}

function formatDeficitWithTemplate(
  template: string,
  orders: Array<{ phone: string; items: string; remaining: number }>
) {
  const safeTemplate = ensureRequiredPlaceholders('deficit_orders', template);
  if (orders.length === 0) {
    return applySmsTemplate(safeTemplate, {
      orders_list: 'No orders with a remaining balance.',
      count: '0',
      total_left: formatKes(0),
    });
  }

  const totalLeft = orders.reduce((sum, order) => sum + order.remaining, 0);
  const lines = deficitOrderLines(orders);
  let included = orders.length;
  let message = applySmsTemplate(safeTemplate, {
    orders_list: lines.join('\n'),
    count: String(orders.length),
    total_left: formatKes(totalLeft),
  });

  while (message.length > SMS_MAX_LENGTH && included > 1) {
    included -= 1;
    const hidden = orders.length - included;
    message = applySmsTemplate(safeTemplate, {
      orders_list: `${lines.slice(0, included).join('\n')}\n+${hidden} more`,
      count: String(orders.length),
      total_left: formatKes(totalLeft),
    });
  }

  return message.slice(0, SMS_MAX_LENGTH);
}

export function formatDeficitOrdersMessage(orders: Array<{
  phone: string;
  items: string;
  remaining: number;
}>) {
  return formatDeficitWithTemplate(DEFAULT_SMS_TEMPLATES.deficit_orders, orders);
}

export async function sendDeficitOrdersIfAfternoonLogin(options?: { force?: boolean }) {
  if (!options?.force && kenyaHour() < 13) {
    return { sent: false, reason: 'before_1pm' };
  }

  const dateKey = kenyaDateKey();
  const force = Boolean(options?.force);

  await connectDB();
  const settings = await SmsSettings.findOne({ key: 'txtlink' });
  const phone = normalizeKenyaPhoneLocal(settings?.dailyReportPhone);
  if (!settings || settings.dailyReportEnabled === false || !phone) {
    return { sent: false, reason: 'not_configured', dateKey };
  }

  const runtime = await getSmsRuntimeConfig();
  if (!runtime.configured || !runtime.enabled) {
    return { sent: false, reason: 'sms_disabled', dateKey };
  }

  if (!force) {
    const claimed = await SmsSettings.findOneAndUpdate(
      {
        key: 'txtlink',
        $or: [
          { lastDeficitAlertDate: { $exists: false } },
          { lastDeficitAlertDate: null },
          { lastDeficitAlertDate: '' },
          { lastDeficitAlertDate: { $ne: dateKey } },
        ],
      },
      { $set: { lastDeficitAlertDate: dateKey, lastDeficitAlertAt: new Date() } },
      { new: false }
    );
    if (!claimed) {
      return { sent: false, reason: 'already_sent', dateKey };
    }
  }

  try {
    const rows = await Order.find({
      paymentStatus: 'partial',
      status: { $ne: 'cancelled' },
    })
      .select('orderNumber customer services totalAmount amountPaid remainingBalance remainingAmount')
      .sort({ createdAt: -1 })
      .lean()
      .maxTimeMS(15000);

    const orders = rows
      .map((order: any) => {
        const remaining = remainingOf(order);
        const customerPhone = normalizeKenyaPhoneLocal(order.customer?.phone) || String(order.customer?.phone || '').trim();
        return {
          phone: customerPhone || 'No number',
          items: formatPurchaseItems(order.services),
          remaining,
        };
      })
      .filter((order) => order.remaining > 0);

    const templates = await getSmsTemplates();
    const message = formatDeficitWithTemplate(templates.deficit_orders, orders);
    await smsService.sendSMS(phone, message);
    if (force) {
      await SmsSettings.updateOne(
        { key: 'txtlink' },
        { $set: { lastDeficitAlertAt: new Date() } }
      );
    }
    return { sent: true, dateKey, phone, count: orders.length };
  } catch (error) {
    if (!force) {
      await SmsSettings.updateOne(
        { key: 'txtlink', lastDeficitAlertDate: dateKey },
        { $unset: { lastDeficitAlertDate: 1 } }
      );
    }
    throw error;
  }
}

export async function sendPendingConfirmationsIfEveningLogin(options?: { force?: boolean }) {
  if (!options?.force && kenyaHour() < 20) {
    return { sent: false, reason: 'before_8pm' };
  }

  const dateKey = kenyaDateKey();
  const force = Boolean(options?.force);

  await connectDB();
  const settings = await SmsSettings.findOne({ key: 'txtlink' });
  const phone = normalizeKenyaPhoneLocal(settings?.dailyReportPhone);
  if (!settings || settings.dailyReportEnabled === false || !phone) {
    return { sent: false, reason: 'not_configured', dateKey };
  }

  const runtime = await getSmsRuntimeConfig();
  if (!runtime.configured || !runtime.enabled) {
    return { sent: false, reason: 'sms_disabled', dateKey };
  }

  const [pendingWithOrder, unmatched] = await Promise.all([
    MpesaTransaction.countDocuments({
      confirmationStatus: 'pending',
      pendingOrderId: { $ne: null },
    }).maxTimeMS(5000),
    MpesaTransaction.countDocuments({
      confirmationStatus: 'pending',
      pendingOrderId: null,
      isConnectedToOrder: false,
    }).maxTimeMS(5000),
  ]);
  const count = pendingWithOrder + unmatched;

  if (count === 0 && !force) {
    return { sent: false, reason: 'none_pending', dateKey, count: 0 };
  }

  if (!force) {
    const claimed = await SmsSettings.findOneAndUpdate(
      {
        key: 'txtlink',
        $or: [
          { lastPendingConfirmationsAlertDate: { $exists: false } },
          { lastPendingConfirmationsAlertDate: null },
          { lastPendingConfirmationsAlertDate: '' },
          { lastPendingConfirmationsAlertDate: { $ne: dateKey } },
        ],
      },
      { $set: { lastPendingConfirmationsAlertDate: dateKey, lastPendingConfirmationsAlertAt: new Date() } },
      { new: false }
    );
    if (!claimed) {
      return { sent: false, reason: 'already_sent', dateKey, count };
    }
  }

  try {
    const reviewUrl = `${publicAppUrl()}/admin/mpesa-transactions`;
    const countLabel = count === 1
      ? '1 M-Pesa payment needs verification before it is linked to an order.'
      : `${count} M-Pesa payments need verification before they are linked to orders.`;
    const message = await renderSmsTemplate('pending_confirmations', {
      count: String(count),
      count_label: countLabel,
      review_url: reviewUrl,
    });

    await smsService.sendSMS(phone, message);
    if (force) {
      await SmsSettings.updateOne(
        { key: 'txtlink' },
        { $set: { lastPendingConfirmationsAlertAt: new Date() } }
      );
    }
    return { sent: true, dateKey, phone, count };
  } catch (error) {
    if (!force) {
      await SmsSettings.updateOne(
        { key: 'txtlink', lastPendingConfirmationsAlertDate: dateKey },
        { $unset: { lastPendingConfirmationsAlertDate: 1 } }
      );
    }
    throw error;
  }
}

export async function notifySuperadminOnLogin() {
  const results = {
    stock: await sendStockAlertIfMorningLogin(),
    deficit: await sendDeficitOrdersIfAfternoonLogin(),
    pendingConfirmations: await sendPendingConfirmationsIfEveningLogin(),
  };
  return results;
}
