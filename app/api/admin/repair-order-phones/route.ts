import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import {
  isLikelyMpesaPhoneHashOrGarbage,
  normalizeKenyaPhoneLocal,
  resolvePhoneFromOrderFields,
} from '@/lib/phone-utils';

/**
 * One-time / admin: fix order.customer.phone when it holds an M-Pesa hash or garbage,
 * using STK prompt / top-level phone fields from the same order.
 */
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const orders = await Order.find({}).lean();
    let updated = 0;

    for (const o of orders) {
      const current = o.customer?.phone;
      if (!isLikelyMpesaPhoneHashOrGarbage(current) && normalizeKenyaPhoneLocal(current)) {
        continue;
      }
      const resolved = resolvePhoneFromOrderFields(o as any);
      if (!resolved) continue;

      await Order.updateOne({ _id: o._id }, { $set: { 'customer.phone': resolved } });
      updated++;
    }

    return NextResponse.json({
      success: true,
      scanned: orders.length,
      ordersUpdated: updated,
    });
  } catch (error) {
    console.error('repair-order-phones:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
