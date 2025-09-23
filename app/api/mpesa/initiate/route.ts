import { NextRequest, NextResponse } from 'next/server';
import { mpesaService } from '@/lib/mpesa';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import MpesaTransaction from '@/lib/models/MpesaTransaction';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { orderId, phoneNumber, amount, paymentType = 'full' } = await request.json();

    if (!orderId || !phoneNumber || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, phoneNumber, amount' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if payment is already completed
    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 400 });
    }
    
    // Use callback URL from environment variables (prioritize explicit MPESA_CALLBACK_URL)
    const callbackUrl = process.env.MPESA_CALLBACK_URL || 
      `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.econuru.co.ke'}/api/mpesa/callback`;
    
    console.log('Using M-Pesa callback URL:', callbackUrl);
    
    // Validate callback URL format
    if (!callbackUrl.startsWith('https://')) {
      console.error('Invalid callback URL - must use HTTPS:', callbackUrl);
      return NextResponse.json({
        success: false,
        error: 'Invalid callback URL configuration - must use HTTPS'
      }, { status: 500 });
    }

    const result = await mpesaService.initiateSTKPush({
      phoneNumber,
      amount: parseFloat(amount),
      orderId,
      callbackUrl
    });

    if (result.success && result.checkoutRequestId) {
      // Update order with M-Pesa details
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'pending',
        paymentMethod: 'mpesa_stk',
        checkoutRequestId: result.checkoutRequestId,
        phoneNumber: phoneNumber,
        paymentInitiatedAt: new Date()
      });

      // Store the pending payment for later matching
      await Order.findByIdAndUpdate(orderId, {
        $set: {
          'pendingMpesaPayment': {
            checkoutRequestId: result.checkoutRequestId,
            merchantRequestId: result.merchantRequestId,
            amount: amount,
            phoneNumber: phoneNumber,
            paymentType: paymentType,
            initiatedAt: new Date(),
            status: 'pending'
          }
        }
      });

      console.log(`💾 Stored pending payment data for order ${orderId}`);

      return NextResponse.json({
        success: true,
        message: 'STK Push sent successfully',
        checkoutRequestId: result.checkoutRequestId,
        customerMessage: result.customerMessage
      });
    } else {
      console.error('M-Pesa STK Push failed:', result);
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to initiate payment'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error initiating M-Pesa payment:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 