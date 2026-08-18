import Customer from '@/lib/models/Customer';
import Order from '@/lib/models/Order';
import {
  isLikelyMpesaPhoneHashOrGarbage,
  kenyaPhoneLookupValues,
  normalizeKenyaPhoneLocal,
  resolvePhoneFromOrderFields,
} from '@/lib/phone-utils';

const HASH_PHONE_QUERY = {
  $or: [
    { phone: { $regex: /^[a-f0-9]{64}$/i } },
    { phone: 'Unknown' },
    { phone: 'Data Error' },
  ],
};

/**
 * Hash/MSISDN rows created from M-Pesa callbacks are not the POS prompt number.
 * Remap them from the matching order when possible; otherwise delete them.
 */
export async function repairHashedCustomersFromOrders() {
  const hashed = await Customer.find(HASH_PHONE_QUERY).select('_id name phone').lean();
  let repaired = 0;
  let removed = 0;

  for (const customer of hashed) {
    const name = String(customer.name || '').trim();
    let resolved: string | null = null;

    if (name) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const orders = await Order.find({ 'customer.name': { $regex: `^${escaped}$`, $options: 'i' } })
        .sort({ createdAt: -1 })
        .limit(15)
        .lean();
      for (const order of orders) {
        resolved = resolvePhoneFromOrderFields(order as any);
        if (resolved) break;
      }
    }

    if (!resolved) {
      await Customer.deleteOne({ _id: customer._id });
      removed++;
      continue;
    }

    const existing = await Customer.findOne({
      phone: { $in: kenyaPhoneLookupValues(resolved) },
      _id: { $ne: customer._id },
    }).select('_id');

    if (existing) {
      await Customer.deleteOne({ _id: customer._id });
      removed++;
      continue;
    }

    try {
      await Customer.updateOne({ _id: customer._id }, { $set: { phone: resolved } });
      repaired++;
    } catch (error: any) {
      if (error?.code === 11000) {
        await Customer.deleteOne({ _id: customer._id });
        removed++;
      } else {
        throw error;
      }
    }
  }

  return { repaired, removed, scanned: hashed.length };
}

export function isUnusableCustomerPhone(phone: unknown) {
  return !normalizeKenyaPhoneLocal(phone) || isLikelyMpesaPhoneHashOrGarbage(phone);
}
