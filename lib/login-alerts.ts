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

export function formatDeficitOrdersMessage(orders: Array<{
  phone: string;
  items: string;
  remaining: number;
}>) {
  if (orders.length === 0) {
    return [
      'OMOTECH HUB COMPUTERS',
      '',
      'Partial payments due',
      '',
      'No orders with a remaining balance.',
    ].join('\n');
  }

  const header = [
    'OMOTECH HUB COMPUTERS',
    '',
    'Partial payments due',
    '',
  ];
  const totalLeft = orders.reduce((sum, order) => sum + order.remaining, 0);
  const footer = [
    '',
    `Orders: ${orders.length}`,
    `Total left: ${formatKes(totalLeft)}`,
  ];

  const lines = orders.map((order) => {
    const items = order.items.length > 42 ? `${order.items.slice(0, 39).trim()}...` : order.items;
    return `${order.phone} | ${items} | ${formatKes(order.remaining)} left`;
  });

  let included = orders.length;
  let body = lines.join('\n');
  let message = [...header, body, ...footer].join('\n');

  while (message.length > SMS_MAX_LENGTH && included > 1) {
    included -= 1;
    const visible = lines.slice(0, included);
    const hidden = orders.length - included;
    body = `${visible.join('\n')}\n+${hidden} more`;
    message = [...header, body, ...footer].join('\n');
  }

  return message.slice(0, SMS_MAX_LENGTH);
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

    const message = formatDeficitOrdersMessage(orders);
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
    const message = [
      'OMOTECH HUB COMPUTERS',
      '',
      'Payments awaiting confirmation',
      '',
      count === 1
        ? '1 M-Pesa payment needs verification before it is linked to an order.'
        : `${count} M-Pesa payments need verification before they are linked to orders.`,
      '',
      'Confirm them now so tonight\'s report stays accurate.',
      '',
      `Review: ${reviewUrl}`,
    ].join('\n');

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
