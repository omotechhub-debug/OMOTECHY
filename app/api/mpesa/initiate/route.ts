import { NextRequest, NextResponse } from 'next/server';
import { mpesaService } from '@/lib/mpesa';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';
import { upsertCustomerFromPromptedPhone } from '@/lib/upsert-customer';
import { mpesaOrderIdFromOrder } from '@/lib/order-number';

function authorizeMpesa(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !['admin', 'superadmin', 'manager', 'user'].includes(decoded.role)) {
    return null;
  }
  return decoded;
}

export async function GET(request: NextRequest) {
  const decoded = authorizeMpesa(request);
  if (!decoded) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  try {
    await mpesaService.warmupAccessToken();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = authorizeMpesa(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { orderId, phoneNumber, amount, paymentType = 'full' } = await request.json();

    if (!orderId || !phoneNumber || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, phoneNumber, amount' },
        { status: 400 }
      );
    }

    const normalizedLocal = normalizeKenyaPhoneLocal(phoneNumber);
    if (!normalizedLocal) {
      return NextResponse.json(
        { error: 'Invalid phone. Use Kenyan mobile format, e.g. 07XXXXXXXX / 01XXXXXXXX or 2547XXXXXXXX / 2541XXXXXXXX' },
        { status: 400 }
      );
    }

    const callbackUrl = process.env.MPESA_CALLBACK_URL ||
      `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.omotech.co.ke'}/api/mpesa/callback`;

    if (!callbackUrl.startsWith('https://')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid callback URL configuration - must use HTTPS'
      }, { status: 500 });
    }

    const [, order] = await Promise.all([
      mpesaService.warmupAccessToken().catch(() => undefined),
      connectDB().then(() =>
        Order.findById(orderId).select('paymentStatus station stationId customer paybillAccount orderNumber pendingMpesaPayment').lean()
      ),
    ]);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 400 });
    }

    if (decoded.role === 'manager') {
      const managerToken = decoded as typeof decoded & { stationId?: string; managedStations?: string[] };
      let managerStationId = managerToken.stationId || managerToken.managedStations?.[0];
      if (!managerStationId) {
        const manager = await User.findById(decoded.userId).select('stationId managedStations').lean();
        managerStationId = manager?.stationId || manager?.managedStations?.[0];
      }

      let orderStationId = null;
      if (order.station?.stationId) {
        if (typeof order.station.stationId === 'object' && order.station.stationId._id) {
          orderStationId = order.station.stationId._id.toString();
        } else {
          orderStationId = order.station.stationId.toString();
        }
      } else if (order.stationId) {
        orderStationId = order.stationId.toString();
      }

      if (managerStationId && orderStationId && managerStationId.toString() !== orderStationId) {
        return NextResponse.json({
          error: 'You can only initiate payments for orders in your assigned station'
        }, { status: 403 });
      }
    }

    const accountReference = mpesaOrderIdFromOrder(order);

    const result = await mpesaService.initiateSTKPush({
      phoneNumber: normalizedLocal,
      amount: parseFloat(amount),
      orderId: accountReference,
      accountReference,
      callbackUrl
    });

    if (result.success && result.checkoutRequestId) {
      const pendingUpdate = Order.findByIdAndUpdate(orderId, {
        $set: {
          paymentStatus: 'pending',
          paymentMethod: 'mpesa_stk',
          checkoutRequestId: result.checkoutRequestId,
          phoneNumber: normalizedLocal,
          paymentInitiatedAt: new Date(),
          'customer.phone': normalizedLocal,
          pendingMpesaPayment: {
            checkoutRequestId: result.checkoutRequestId,
            merchantRequestId: result.merchantRequestId,
            amount: Number(parseFloat(String(amount))) || 0,
            phoneNumber: normalizedLocal,
            paymentType: paymentType,
            accountReference,
            initiatedAt: new Date(),
            status: 'pending',
          },
          paybillAccount: accountReference,
        },
      });

      void upsertCustomerFromPromptedPhone({
        phone: normalizedLocal,
        name: order.customer?.name,
        email: order.customer?.email,
        address: order.customer?.address,
        incrementStats: false,
      }).catch(() => undefined);

      await pendingUpdate;

      return NextResponse.json({
        success: true,
        message: 'STK Push sent successfully',
        checkoutRequestId: result.checkoutRequestId,
        customerMessage: result.customerMessage
      });
    }

    return NextResponse.json({
      success: false,
      error: result.error || 'Failed to initiate payment'
    }, { status: 400 });

  } catch (error: any) {
    console.error('Error initiating M-Pesa payment:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
