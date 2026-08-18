import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Expense from '@/lib/models/Expense';
import SmsSettings from '@/lib/models/SmsSettings';
import { smsService } from '@/lib/sms';
import { getSmsRuntimeConfig } from '@/lib/sms-config';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';
import { applySmsTemplate, DEFAULT_SMS_TEMPLATES } from '@/lib/sms-template-defs';
import { renderSmsTemplate } from '@/lib/sms-templates';

export function kenyaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function kenyaDayBounds(dateKey: string) {
  const start = new Date(`${dateKey}T00:00:00+03:00`);
  const end = new Date(`${dateKey}T23:59:59.999+03:00`);
  return { start, end };
}

export function previousKenyaDateKey(from = new Date()) {
  const todayStart = new Date(`${kenyaDateKey(from)}T00:00:00+03:00`);
  return kenyaDateKey(new Date(todayStart.getTime() - 24 * 60 * 60 * 1000));
}

export function nextKenyaMidnight(from = new Date()) {
  const todayStart = new Date(`${kenyaDateKey(from)}T00:00:00+03:00`);
  return new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
}

function formatKes(amount: number) {
  return `KSh ${Math.round(amount).toLocaleString('en-KE')}`;
}

function formatDisplayDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00+03:00`);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export async function getDailyBusinessSummary(dateKey: string) {
  await connectDB();
  const { start, end } = kenyaDayBounds(dateKey);

  const [orderStats] = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        sales: { $sum: { $ifNull: ['$totalAmount', 0] } },
        collected: { $sum: { $ifNull: ['$amountPaid', 0] } },
      },
    },
  ]);

  const [expenseStats] = await Expense.aggregate([
    { $match: { date: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: null,
        expenses: { $sum: { $ifNull: ['$amount', 0] } },
      },
    },
  ]);

  const orders = Number(orderStats?.orders) || 0;
  const sales = Number(orderStats?.sales) || 0;
  const collected = Number(orderStats?.collected) || 0;
  const expenses = Number(expenseStats?.expenses) || 0;
  const profit = sales - expenses;

  return { dateKey, orders, sales, collected, expenses, profit };
}

function dailyReportVars(summary: Awaited<ReturnType<typeof getDailyBusinessSummary>>) {
  return {
    date: formatDisplayDate(summary.dateKey),
    orders: String(summary.orders),
    sales: formatKes(summary.sales),
    collected: formatKes(summary.collected),
    expenses: formatKes(summary.expenses),
    profit_label: summary.profit >= 0 ? 'Profit' : 'Loss',
    profit: formatKes(Math.abs(summary.profit)),
  };
}

export function formatDailyBusinessSms(summary: Awaited<ReturnType<typeof getDailyBusinessSummary>>) {
  return applySmsTemplate(DEFAULT_SMS_TEMPLATES.daily_report, dailyReportVars(summary));
}

export async function sendDailyBusinessReport(options?: {
  dateKey?: string;
  force?: boolean;
}) {
  const dateKey = options?.dateKey || previousKenyaDateKey();
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
          { lastDailyReportDate: { $exists: false } },
          { lastDailyReportDate: null },
          { lastDailyReportDate: '' },
          { lastDailyReportDate: { $ne: dateKey } },
        ],
      },
      { $set: { lastDailyReportDate: dateKey, lastDailyReportAt: new Date() } },
      { new: false }
    );
    if (!claimed) {
      return { sent: false, reason: 'already_sent', dateKey };
    }
  }

  try {
    const summary = await getDailyBusinessSummary(dateKey);
    const message = await renderSmsTemplate('daily_report', dailyReportVars(summary));
    await smsService.sendSMS(phone, message);
    if (force) {
      await SmsSettings.updateOne(
        { key: 'txtlink' },
        { $set: { lastDailyReportAt: new Date() } }
      );
    }
    return { sent: true, dateKey, phone, summary };
  } catch (error) {
    if (!force) {
      await SmsSettings.updateOne(
        { key: 'txtlink', lastDailyReportDate: dateKey },
        { $unset: { lastDailyReportDate: 1 } }
      );
    }
    throw error;
  }
}

export function startDailyBusinessReportScheduler() {
  const globalKey = '__omotechDailyReportScheduler';
  const globalState = globalThis as typeof globalThis & { [globalKey]?: boolean };
  if (globalState[globalKey]) return;
  globalState[globalKey] = true;

  const run = async () => {
    try {
      const result = await sendDailyBusinessReport({ dateKey: previousKenyaDateKey() });
      console.log('Daily business report SMS:', result);
    } catch (error) {
      console.error('Daily business report SMS failed:', error);
    }
  };

  const scheduleNext = () => {
    const delay = Math.max(5000, nextKenyaMidnight().getTime() - Date.now() + 2000);
    setTimeout(async () => {
      await run();
      scheduleNext();
    }, delay);
  };

  void run();
  scheduleNext();
  console.log(`Daily business report scheduler started. Next run at ${nextKenyaMidnight().toISOString()}`);
}
