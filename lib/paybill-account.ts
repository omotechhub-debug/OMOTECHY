import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';
import { orderNumberFromShortId } from '@/lib/order-number';

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

function accountVariants(raw: string) {
  const digits = normalizeAccountRef(raw);
  return [...new Set([
    raw,
    digits,
    digits.replace(/^0+/, '') || digits,
    digits.length < 4 ? digits.padStart(4, '0') : digits,
  ])].filter(Boolean);
}

function missingReceiptQuery(receipt?: string) {
  const emptyReceipt = [
    { mpesaReceiptNumber: { $in: [null, ''] } },
    { mpesaReceiptNumber: { $exists: false } },
    { 'mpesaPayment.mpesaReceiptNumber': { $in: [null, ''] } },
    { 'mpesaPayment.mpesaReceiptNumber': { $exists: false } },
  ];
  if (receipt) {
    emptyReceipt.push({ mpesaReceiptNumber: receipt });
    emptyReceipt.push({ 'mpesaPayment.mpesaReceiptNumber': receipt });
    emptyReceipt.push({ 'c2bPayment.mpesaReceiptNumber': receipt });
  }
  return { $or: emptyReceipt };
}

async function findOpenOrderByAccount(raw: string) {
  const variants = accountVariants(raw);
  const reconstructed = orderNumberFromShortId(raw);
  const order = await Order.findOne({
    paymentStatus: { $in: ['unpaid', 'pending', 'partial'] },
    $or: [
      { paybillAccount: { $in: variants } },
      { 'pendingMpesaPayment.accountReference': { $in: variants } },
      { orderNumber: raw },
      ...(reconstructed ? [{ orderNumber: reconstructed }] : []),
    ],
  }).sort({ createdAt: -1 });

  if (order) return order;

  const digits = normalizeAccountRef(raw);
  if (digits.length >= 3 && digits.length <= 6) {
    const recent = await Order.find({
      $or: [
        { paybillAccount: { $exists: true, $ne: '' } },
        { 'pendingMpesaPayment.accountReference': { $exists: true, $ne: '' } },
      ],
      paymentStatus: { $in: ['unpaid', 'pending', 'partial'] },
      createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    })
      .sort({ createdAt: -1 })
      .limit(80);

    return recent.find((item) =>
      accountRefsMatch(String(item.paybillAccount || item.pendingMpesaPayment?.accountReference || ''), raw)
    ) || null;
  }

  return null;
}

export async function findOrderByPaybillAccount(billRefNumber: string) {
  const raw = String(billRefNumber || '').trim();
  if (!raw) return null;
  await connectDB();
  return findOpenOrderByAccount(raw);
}

/**
 * Match a C2B Paybill confirmation to the POS/STK order.
 * Includes recently paid STK orders that still need the M-Pesa receipt attached.
 */
export async function findOrderForC2BPayment(
  billRefNumber: string,
  options: { amount?: number; receipt?: string } = {}
) {
  const raw = String(billRefNumber || '').trim();
  await connectDB();

  if (/^[a-fA-F0-9]{24}$/.test(raw)) {
    const byId = await Order.findById(raw);
    if (byId) return byId;
  }

  if (raw) {
    const open = await findOpenOrderByAccount(raw);
    if (open) return open;

    const variants = accountVariants(raw);
    const recentWithAccount = await Order.findOne({
      paymentStatus: { $in: ['paid', 'partial', 'pending'] },
      createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      $and: [
        {
          $or: [
            { paybillAccount: { $in: variants } },
            { 'pendingMpesaPayment.accountReference': { $in: variants } },
            { orderNumber: raw },
            ...(orderNumberFromShortId(raw) ? [{ orderNumber: orderNumberFromShortId(raw) }] : []),
          ],
        },
        missingReceiptQuery(options.receipt),
      ],
    }).sort({ paymentCompletedAt: -1, createdAt: -1 });

    if (recentWithAccount) return recentWithAccount;
  }

  const amount = Number(options.amount);
  if (amount > 0) {
    const windowStart = new Date(Date.now() - 30 * 60 * 1000);
    const candidates = await Order.find({
      createdAt: { $gte: windowStart },
      paymentStatus: { $in: ['unpaid', 'pending', 'partial', 'paid'] },
      $and: [
        {
          $or: [
            { totalAmount: amount },
            { remainingBalance: amount },
            { amountPaid: amount },
            { 'pendingMpesaPayment.amount': amount },
          ],
        },
        missingReceiptQuery(options.receipt),
      ],
    })
      .sort({ createdAt: -1 })
      .limit(8);

    if (raw) {
      const accountMatch = candidates.find((item) =>
        accountRefsMatch(String(item.paybillAccount || item.pendingMpesaPayment?.accountReference || ''), raw)
      );
      if (accountMatch) return accountMatch;
    }

    if (candidates.length === 1) return candidates[0];
  }

  return null;
}

export async function attachUniqueUnconnectedTransaction(order: {
  _id: unknown;
  totalAmount?: number;
  amountPaid?: number;
  pendingMpesaPayment?: { amount?: number };
  customer?: { phone?: string };
}) {
  const MpesaTransaction = (await import('@/lib/models/MpesaTransaction')).default;
  const amount = Number(order.pendingMpesaPayment?.amount || order.amountPaid || order.totalAmount) || 0;
  if (amount <= 0) return null;

  const windowStart = new Date(Date.now() - 30 * 60 * 1000);
  const matches = await MpesaTransaction.find({
    isConnectedToOrder: false,
    amountPaid: amount,
    transactionDate: { $gte: windowStart },
  }).limit(5);

  if (matches.length !== 1) return null;

  const txn = matches[0];
  const receipt = txn.mpesaReceiptNumber || txn.transactionId;
  txn.isConnectedToOrder = true;
  txn.connectedOrderId = order._id;
  txn.connectedAt = new Date();
  txn.connectedBy = 'SYSTEM';
  txn.confirmationStatus = 'confirmed';
  txn.confirmedBy = 'SYSTEM';
  txn.confirmedAt = new Date();
  if (order.customer?.phone) txn.phoneNumber = order.customer.phone;
  txn.notes = `AUTO-CONFIRMED: unique unconnected M-Pesa payment of KES ${amount} matched to order.`;
  await txn.save();

  await Order.findByIdAndUpdate(order._id, {
    $set: {
      mpesaReceiptNumber: receipt,
      transactionDate: txn.transactionDate,
      'mpesaPayment.mpesaReceiptNumber': receipt,
      'mpesaPayment.transactionDate': txn.transactionDate,
      'mpesaPayment.amountPaid': txn.amountPaid,
      'c2bPayment.mpesaReceiptNumber': receipt,
      'c2bPayment.transactionId': txn.transactionId,
      'pendingMpesaPayment.status': 'completed',
    },
  });

  return txn;
}
