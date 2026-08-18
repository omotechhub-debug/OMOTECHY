import Customer from '@/lib/models/Customer';
import {
  kenyaPhoneLookupValues,
  normalizeKenyaPhoneLocal,
  resolvePhoneFromOrderFields,
} from '@/lib/phone-utils';

/**
 * Save the POS-entered Kenyan number once.
 * If that number already exists in any common format (07 / 01 / +254), do not create another row.
 * If it is new, it must be created.
 */
export async function upsertCustomerFromPromptedPhone(params: {
  phone: unknown;
  name?: string;
  email?: string;
  address?: string;
  orderAmount?: number;
  incrementStats?: boolean;
}) {
  const phone = normalizeKenyaPhoneLocal(params.phone);
  if (!phone) return null;

  const name = (params.name || '').trim();
  const variants = kenyaPhoneLookupValues(phone);
  const existing = await Customer.findOne({ phone: { $in: variants } });
  const incrementStats = params.incrementStats !== false;

  if (existing) {
    const update: Record<string, unknown> = {
      lastOrder: new Date(),
    };
    if (existing.phone !== phone) update.phone = phone;
    if (name && name !== existing.name) update.name = name;
    if (params.email && !existing.email) update.email = params.email;
    if (params.address && !existing.address) update.address = params.address;

    try {
      await Customer.findByIdAndUpdate(existing._id, {
        $set: update,
        ...(incrementStats
          ? {
              $inc: {
                totalOrders: 1,
                totalSpent: params.orderAmount || 0,
              },
            }
          : {}),
      });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
    }
    return phone;
  }

  try {
    await Customer.create({
      name: name || 'Customer',
      phone,
      email: params.email || '',
      address: params.address || '',
      totalOrders: incrementStats ? 1 : 0,
      totalSpent: incrementStats ? params.orderAmount || 0 : 0,
      lastOrder: new Date(),
      status: 'active',
      preferences: [],
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return phone;
    }
    throw error;
  }

  return phone;
}

/**
 * Always save the POS / STK prompt number. Never persist Safaricom callback MSISDN or 64-char hashes.
 */
export async function upsertCustomerFromPaymentContext(params: {
  order?: any;
  mpesaMsisdn?: unknown;
  fallbackName?: string;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  lastTransactionId?: string;
}) {
  const orderPlain =
    params.order && typeof params.order.toObject === 'function'
      ? params.order.toObject()
      : params.order;
  const phone =
    (orderPlain ? resolvePhoneFromOrderFields(orderPlain) : null) ||
    normalizeKenyaPhoneLocal(params.mpesaMsisdn);

  if (!phone) {
    console.log('Skipping customer upsert — no POS/prompt Kenyan number (M-Pesa hash ignored)');
    return null;
  }

  const saved = await upsertCustomerFromPromptedPhone({
    phone,
    name: orderPlain?.customer?.name || params.fallbackName,
    email: orderPlain?.customer?.email,
    address: orderPlain?.customer?.address,
    incrementStats: false,
  });

  if (saved && (params.lastPaymentDate || params.lastPaymentAmount || params.lastTransactionId)) {
    const variants = kenyaPhoneLookupValues(phone);
    await Customer.updateOne(
      { phone: { $in: variants } },
      {
        $set: {
          ...(params.lastPaymentDate ? { lastPaymentDate: params.lastPaymentDate } : {}),
          ...(params.lastPaymentAmount != null ? { lastPaymentAmount: params.lastPaymentAmount } : {}),
          ...(params.lastTransactionId ? { lastTransactionId: params.lastTransactionId } : {}),
        },
      }
    );
  }

  return saved;
}
