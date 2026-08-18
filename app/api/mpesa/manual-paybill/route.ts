import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { assignPaybillAccount, getPaybillNumber } from '@/lib/paybill-account';
import { sendPaybillInstructionsSms } from '@/lib/paybill-sms';

function authorizePos(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !['admin', 'superadmin', 'manager'].includes(decoded.role)) return null;
  return decoded;
}

export async function GET(request: NextRequest) {
  const decoded = authorizePos(request);
  if (!decoded) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const paybill = getPaybillNumber();
  return NextResponse.json({
    success: Boolean(paybill),
    paybill,
  });
}

export async function POST(request: NextRequest) {
  try {
    const decoded = authorizePos(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const paybill = getPaybillNumber();
    if (!paybill) {
      return NextResponse.json(
        { success: false, error: 'Paybill number is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const orderId = String(body.orderId || '').trim();
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order is required' }, { status: 400 });
    }

    await connectDB();
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ success: false, error: 'Order is already paid' }, { status: 400 });
    }

    if (!order.paybillAccount) {
      order.paybillAccount = await assignPaybillAccount(order.customer?.phone, String(order._id));
    }
    order.paymentMethod = 'mpesa_c2b';
    if (order.paymentStatus === 'unpaid' || order.paymentStatus === 'failed') {
      order.paymentStatus = 'pending';
    }
    await order.save();

    const sms = await sendPaybillInstructionsSms(order.toObject());
    if (!sms.sent) {
      return NextResponse.json(
        { success: false, error: 'Could not send the Paybill SMS. Check the customer phone number.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      paybill,
      account: order.paybillAccount,
      phone: sms.phone,
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      amount: order.remainingBalance || order.totalAmount,
    });
  } catch (error) {
    console.error('Manual Paybill SMS error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send Paybill instructions' },
      { status: 500 }
    );
  }
}
