import Order from '@/lib/models/Order';

let backfillPromise: Promise<number> | null = null;

export async function confirmExistingPaidPendingOrders() {
  if (backfillPromise) return backfillPromise;

  backfillPromise = (async () => {
    try {
      const result = await Order.updateMany(
        { paymentStatus: 'paid', status: 'pending' },
        { $set: { status: 'confirmed', updatedAt: new Date() } }
      );
      return result.modifiedCount || 0;
    } catch (error) {
      backfillPromise = null;
      console.error('Failed to auto-confirm existing paid orders:', error);
      return 0;
    }
  })();

  return backfillPromise;
}
