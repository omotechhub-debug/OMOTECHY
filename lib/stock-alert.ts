import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Inventory from '@/lib/models/Inventory';
import StockAlertLink, { IStockAlertItem } from '@/lib/models/StockAlertLink';
import { smsService } from '@/lib/sms';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';
import { kenyaDateKey } from '@/lib/daily-business-report';
import { renderSmsTemplate } from '@/lib/sms-templates';

const OTP_TTL_MS = 10 * 60 * 1000;
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

export async function sendMorningStockAlert(_options?: { force?: boolean }) {
  return { sent: false, reason: 'disabled', dateKey: kenyaDateKey() };
}

export async function sendStockAlertIfMorningLogin() {
  return { sent: false, reason: 'disabled', dateKey: kenyaDateKey() };
}

export function startMorningStockAlertScheduler() {
  return;
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
