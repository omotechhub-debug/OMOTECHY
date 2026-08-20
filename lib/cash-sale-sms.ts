import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import SmsSettings from '@/lib/models/SmsSettings';
import { smsService } from '@/lib/sms';
import { getSmsRuntimeConfig } from '@/lib/sms-config';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';
import { kenyaDateKey, kenyaDayBounds, previousKenyaDateKey } from '@/lib/daily-business-report';
import { kenyaHour } from '@/lib/stock-alert';
import { renderSmsTemplate } from '@/lib/sms-templates';

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

export async function getCashSalesSummary(dateKey: string) {
  await connectDB();
  const { start, end } = kenyaDayBounds(dateKey);

  const rows = await Order.aggregate([
    {
      $match: {
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        status: { $ne: 'cancelled' },
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: { $ifNull: ['$station.name', 'Unassigned'] },
        count: { $sum: 1 },
        total: { $sum: { $ifNull: ['$totalAmount', 0] } },
      },
    },
    { $sort: { total: -1 } },
  ]);

  const count = rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  const total = rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
  const stations = rows.map((row) => ({
    name: String(row._id || 'Unassigned'),
    count: Number(row.count) || 0,
    total: Number(row.total) || 0,
  }));

  return { dateKey, count, total, stations };
}

export async function sendYesterdayCashSalesIfMorningLogin(options?: { force?: boolean }) {
  if (!options?.force && kenyaHour() < 9) {
    return { sent: false, reason: 'before_9am' };
  }

  const todayKey = kenyaDateKey();
  const dateKey = previousKenyaDateKey();
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
          { lastCashSalesAlertDate: { $exists: false } },
          { lastCashSalesAlertDate: null },
          { lastCashSalesAlertDate: '' },
          { lastCashSalesAlertDate: { $ne: todayKey } },
        ],
      },
      { $set: { lastCashSalesAlertDate: todayKey, lastCashSalesAlertAt: new Date() } },
      { new: false }
    );
    if (!claimed) {
      return { sent: false, reason: 'already_sent', dateKey };
    }
  }

  try {
    const summary = await getCashSalesSummary(dateKey);
    const stationsList = summary.stations.length
      ? summary.stations
          .map((station) => `${station.name}: ${station.count} sale${station.count === 1 ? '' : 's'} · ${formatKes(station.total)}`)
          .join('\n')
      : 'No cash sales';

    const message = await renderSmsTemplate('cash_sale_admin', {
      date: formatDisplayDate(dateKey),
      count: String(summary.count),
      total: formatKes(summary.total),
      stations_list: stationsList,
    });

    await smsService.sendSMS(phone, message);
    if (force) {
      await SmsSettings.updateOne(
        { key: 'txtlink' },
        { $set: { lastCashSalesAlertAt: new Date() } }
      );
    }
    return { sent: true, dateKey, phone, count: summary.count, total: summary.total };
  } catch (error) {
    if (!force) {
      await SmsSettings.updateOne(
        { key: 'txtlink', lastCashSalesAlertDate: todayKey },
        { $unset: { lastCashSalesAlertDate: 1 } }
      );
    }
    throw error;
  }
}
