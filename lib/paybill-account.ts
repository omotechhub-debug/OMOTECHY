import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';

export function getPaybillNumber() {
  return (process.env.MPESA_SHORT_CODE || process.env.MPESA_PAYBILL || '').trim();
}

export function normalizeAccountRef(value: string) {
  return String(value || '').replace(/\D/g, '');
}

export function accountRefsMatch(left: string, right: string) {
  const a = normalizeAccountRef(left);
  const b = normalizeAccountRef(right);
  if (!a || !b) return false;
  return a === b || a.replace(/^0+/, '') === b.replace(/^0+/, '');
}

function accountCandidatesFromPhone(phone: string) {
  const digits = (normalizeKenyaPhoneLocal(phone) || String(phone || '')).replace(/\D/g, '');
  const last4 = digits.slice(-4);
  const last5 = digits.slice(-5);
  const candidates: string[] = [];
  if (last4.length === 4) {
    candidates.push(last4);
    for (let extra = 1; extra <= 9; extra += 1) {
      candidates.push(`${last4}${extra}`);
    }
  }
  if (last5.length === 5 && !candidates.includes(last5)) {
    candidates.push(last5);
  }
  return candidates;
}

async function isAccountTaken(account: string, excludeOrderId?: string) {
  const query: Record<string, unknown> = {
    paybillAccount: account,
    paymentStatus: { $in: ['unpaid', 'pending', 'partial'] },
  };
  if (excludeOrderId) {
    query._id = { $ne: excludeOrderId };
  }
  const existing = await Order.findOne(query).select('_id').lean();
  return Boolean(existing);
}

export async function assignPaybillAccount(phone: string, excludeOrderId?: string) {
  await connectDB();
  const candidates = accountCandidatesFromPhone(phone);
  for (const account of candidates) {
    if (!(await isAccountTaken(account, excludeOrderId))) {
      return account;
    }
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const account = String(1000 + Math.floor(Math.random() * 9000));
    if (!(await isAccountTaken(account, excludeOrderId))) {
      return account;
    }
  }

  return String(Date.now()).slice(-4);
}

export async function findOrderByPaybillAccount(billRefNumber: string) {
  const raw = String(billRefNumber || '').trim();
  if (!raw) return null;

  await connectDB();
  const digits = normalizeAccountRef(raw);
  const variants = [...new Set([
    raw,
    digits,
    digits.replace(/^0+/, '') || digits,
    digits.length < 4 ? digits.padStart(4, '0') : digits,
  ])].filter(Boolean);

  const order = await Order.findOne({
    paymentStatus: { $in: ['unpaid', 'pending', 'partial'] },
    $or: [
      { paybillAccount: { $in: variants } },
      { orderNumber: raw },
    ],
  }).sort({ createdAt: -1 });

  if (order) return order;

  if (digits.length >= 3 && digits.length <= 6) {
    const recent = await Order.find({
      paybillAccount: { $exists: true, $ne: '' },
      paymentStatus: { $in: ['unpaid', 'pending', 'partial'] },
      createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    })
      .sort({ createdAt: -1 })
      .limit(80);

    return recent.find((item) => accountRefsMatch(String(item.paybillAccount || ''), raw)) || null;
  }

  return null;
}
