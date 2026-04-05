import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

const ALLOWED_ROLES = ['superadmin', 'admin', 'manager'] as const;

export async function POST(_request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!ALLOWED_ROLES.includes(decoded.role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    const filter: Record<string, unknown> = { status: 'pending' };

    if (decoded.role === 'manager') {
      const userDoc = await User.findById(decoded.userId).select('stationId managedStations').lean();
      const stationId = userDoc?.stationId ?? userDoc?.managedStations?.[0];
      if (!stationId) {
        return NextResponse.json(
          { success: false, error: 'No station assigned to your account' },
          { status: 403 }
        );
      }
      filter['station.stationId'] = new mongoose.Types.ObjectId(String(stationId));
    }

    const result = await Order.updateMany(filter, {
      $set: { status: 'confirmed', updatedAt: new Date() },
    });

    // Intentionally no per-order SMS here — bulk accept could mean thousands of messages.

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    });
  } catch (error) {
    console.error('accept-pending orders error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
