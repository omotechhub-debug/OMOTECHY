import Customer from '@/lib/models/Customer';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';

/**
 * Save the POS-entered / STK-prompted Kenyan number as the customer record.
 * Never use the M-Pesa callback MSISDN for this.
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
  const existing = await Customer.findOne({ phone });
  const incrementStats = params.incrementStats !== false;

  if (existing) {
    const update: Record<string, unknown> = {
      lastOrder: new Date(),
    };
    if (name && name !== existing.name) update.name = name;
    if (params.email && !existing.email) update.email = params.email;
    if (params.address && !existing.address) update.address = params.address;

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
    return phone;
  }

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

  return phone;
}
