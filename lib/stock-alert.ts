import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Inventory from '@/lib/models/Inventory';
import SmsSettings from '@/lib/models/SmsSettings';
import StockAlertLink, { IStockAlertItem } from '@/lib/models/StockAlertLink';
import { smsService } from '@/lib/sms';
import { getSmsRuntimeConfig } from '@/lib/sms-config';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';
import { kenyaDateKey } from '@/lib/daily-business-report';
import { renderSmsTemplate } from '@/lib/sms-templates';

const OTP_TTL_MS = 10 * 60 * 1000;
const LINK_TTL_MS = 18 * 60 * 60 * 1000;
const SESSION_COOKIE = 'stock_alert_session';
const MAX_OTP_SENDS = 5;
const MAX_OTP_ATTEMPTS = 5;

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

export function publicAppUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://www.omotech.co.ke'
  ).replace(/\/$/, '');
}

export function maskPhone(phone: string) {
  const local = normalizeKenyaPhoneLocal(phone) || phone.replace(/\D/g, '');
  if (local.length < 7) return '***********';
  return `${local.slice(0, 4)}***${local.slice(-3)}`;
}

export function hashAlertToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashOtp(tokenHash: string, otp: string) {
  return crypto.createHmac('sha256', jwtSecret()).update(`${tokenHash}:${otp}`).digest('hex');
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function kenyaHour(date = new Date()) {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    hour: '2-digit',
    hour12: false,
  }).format(date);
  return Number(hour);
}

export function nextKenyaEightAm(from = new Date()) {
  const eightToday = new Date(`${kenyaDateKey(from)}T08:00:00+03:00`);
  if (from.getTime() < eightToday.getTime()) return eightToday;
  return new Date(eightToday.getTime() + 24 * 60 * 60 * 1000);
}

export async function getStockAlertItems(): Promise<IStockAlertItem[]> {
  await connectDB();
  const rows = await Inventory.find({
    status: 'active',
    $or: [
      { stock: { $lte: 0 } },
      { $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$minStock'] }] } },
    ],
  })
    .select('name sku stock minStock category unit')
    .sort({ stock: 1, name: 1 })
    .lean()
    .maxTimeMS(15000);

  return rows.map((item: any) => {
    const stock = Number(item.stock) || 0;
    return {
      name: String(item.name || 'Unnamed item'),
      sku: String(item.sku || ''),
      stock,
      minStock: Number(item.minStock) || 0,
      category: String(item.category || ''),
      unit: String(item.unit || 'piece'),
      status: stock <= 0 ? 'out_of_stock' : 'low_stock',
    };
  });
}

export async function sendMorningStockAlert(options?: { force?: boolean }) {
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
          { lastStockAlertDate: { $exists: false } },
          { lastStockAlertDate: null },
          { lastStockAlertDate: '' },
          { lastStockAlertDate: { $ne: dateKey } },
        ],
      },
      { $set: { lastStockAlertDate: dateKey, lastStockAlertAt: new Date() } },
      { new: false }
    );
    if (!claimed) {
      return { sent: false, reason: 'already_sent', dateKey };
    }
  }

  try {
    const items = await getStockAlertItems();
    const outCount = items.filter((item) => item.status === 'out_of_stock').length;
    const lowCount = items.filter((item) => item.status === 'low_stock').length;

    let link: string | undefined;
    if (items.length > 0) {
      const token = crypto.randomBytes(32).toString('base64url');
      const tokenHash = hashAlertToken(token);
      await StockAlertLink.create({
        tokenHash,
        phone,
        dateKey,
        expiresAt: new Date(Date.now() + LINK_TTL_MS),
        items,
      });
      link = `${publicAppUrl()}/stock-alert/${token}`;
    }

    const message = await renderSmsTemplate('stock_alert', {
      date: dateKey,
      out_count: String(outCount),
      low_count: String(lowCount),
      link: link || 'All watched stock levels look fine.',
    });
    await smsService.sendSMS(phone, message);
    if (force) {
      await SmsSettings.updateOne(
        { key: 'txtlink' },
        { $set: { lastStockAlertAt: new Date() } }
      );
    }
    return { sent: true, dateKey, phone, outCount, lowCount, hasLink: Boolean(link) };
  } catch (error) {
    if (!force) {
      await SmsSettings.updateOne(
        { key: 'txtlink', lastStockAlertDate: dateKey },
        { $unset: { lastStockAlertDate: 1 } }
      );
    }
    throw error;
  }
}

export async function sendStockAlertIfMorningLogin() {
  if (kenyaHour() < 8) {
    return { sent: false, reason: 'before_8am' };
  }
  return sendMorningStockAlert();
}

export function startMorningStockAlertScheduler() {
  const globalKey = '__omotechMorningStockAlertScheduler';
  const globalState = globalThis as typeof globalThis & { [globalKey]?: boolean };
  if (globalState[globalKey]) return;
  globalState[globalKey] = true;

  const run = async () => {
    try {
      if (kenyaHour() < 8) return;
      const result = await sendMorningStockAlert();
      console.log('Morning stock alert SMS:', result);
    } catch (error) {
      console.error('Morning stock alert SMS failed:', error);
    }
  };

  const scheduleNext = () => {
    const delay = Math.max(5000, nextKenyaEightAm().getTime() - Date.now() + 2000);
    setTimeout(async () => {
      await run();
      scheduleNext();
    }, delay);
  };

  void run();
  scheduleNext();
  console.log(`Morning stock alert scheduler started. Next run at ${nextKenyaEightAm().toISOString()}`);
}

export async function findStockAlertByToken(token: string) {
  if (!token || token.length < 20) return null;
  await connectDB();
  return StockAlertLink.findOne({
    tokenHash: hashAlertToken(token),
    expiresAt: { $gt: new Date() },
  });
}

export async function requestStockAlertOtp(token: string) {
  const link = await findStockAlertByToken(token);
  if (!link) {
    return { success: false, error: 'This link is invalid or has expired' };
  }

  const now = Date.now();
  if (link.otpLastSentAt && now - new Date(link.otpLastSentAt).getTime() < 60 * 1000) {
    return { success: false, error: 'Wait a minute before requesting another OTP' };
  }
  if (link.otpSentCount >= MAX_OTP_SENDS) {
    return { success: false, error: 'OTP limit reached for this link' };
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  link.otpHash = hashOtp(link.tokenHash, otp);
  link.otpExpiresAt = new Date(now + OTP_TTL_MS);
  link.otpAttempts = 0;
  link.otpSentCount += 1;
  link.otpLastSentAt = new Date(now);
  await link.save();

  await smsService.sendSMS(
    link.phone,
    await renderSmsTemplate('stock_otp', { otp })
  );

  return { success: true, phoneMasked: maskPhone(link.phone) };
}

export async function verifyStockAlertOtp(token: string, otp: string) {
  const link = await findStockAlertByToken(token);
  if (!link) {
    return { success: false, error: 'This link is invalid or has expired' };
  }
  if (link.otpAttempts >= MAX_OTP_ATTEMPTS) {
    return { success: false, error: 'Too many attempts. Request a new OTP.' };
  }
  if (!link.otpHash || !link.otpExpiresAt || Date.now() > new Date(link.otpExpiresAt).getTime()) {
    return { success: false, error: 'OTP expired. Request a new one.' };
  }

  const incoming = String(otp || '').replace(/\D/g, '');
  const expected = hashOtp(link.tokenHash, incoming);
  if (!safeEqual(expected, link.otpHash)) {
    link.otpAttempts += 1;
    await link.save();
    return { success: false, error: 'Incorrect OTP' };
  }

  link.verifiedAt = new Date();
  link.otpHash = '';
  link.otpAttempts = 0;
  await link.save();

  const session = jwt.sign(
    { typ: 'stock-alert', hid: link.tokenHash },
    jwtSecret(),
    { expiresIn: '2h' }
  );

  return { success: true, session, cookieName: SESSION_COOKIE };
}

export function readStockAlertSession(token: string, cookieValue?: string) {
  if (!cookieValue) return null;
  try {
    const decoded = jwt.verify(cookieValue, jwtSecret()) as { typ?: string; hid?: string };
    if (decoded.typ !== 'stock-alert') return null;
    if (decoded.hid !== hashAlertToken(token)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function stockAlertCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 2,
  };
}

export { SESSION_COOKIE };
