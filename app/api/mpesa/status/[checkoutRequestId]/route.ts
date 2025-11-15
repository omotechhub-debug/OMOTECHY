import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { mpesaService } from '@/lib/mpesa';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { checkoutRequestId: string } }
) {
  try {
    // Verify admin authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Allow admin, superadmin, manager, and regular users (for shop orders)
    if (!['admin', 'superadmin', 'manager', 'user'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    await connectDB();

    const { checkoutRequestId } = await params;

    if (!checkoutRequestId) {
      return NextResponse.json({ 
        error: 'Checkout request ID is required' 
      }, { status: 400 });
    }

    // Find the order
    const order = await Order.findOne({
      checkoutRequestId: checkoutRequestId
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If payment is already completed, return the stored status
    if (order.paymentStatus === 'paid' || order.paymentStatus === 'failed') {
      return NextResponse.json({
        success: true,
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          checkoutRequestId: order.checkoutRequestId,
          phoneNumber: order.phoneNumber,
          mpesaReceiptNumber: order.mpesaReceiptNumber,
          amountPaid: order.amountPaid,
          resultCode: order.resultCode,
          resultDescription: order.resultDescription,
          paymentInitiatedAt: order.paymentInitiatedAt,
          paymentCompletedAt: order.paymentCompletedAt
        }
      });
    }

    // If payment is still pending, query M-Pesa for current status
    const statusResponse = await mpesaService.querySTKStatus(checkoutRequestId);
    
    // Check if the status query was successful
    if (statusResponse.success === false) {
      console.error('M-Pesa status query failed:', statusResponse.error);
      
      // Return current order status with error info
      return NextResponse.json({
        success: true,
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          checkoutRequestId: order.checkoutRequestId,
          phoneNumber: order.phoneNumber,
          mpesaReceiptNumber: order.mpesaReceiptNumber,
          amountPaid: order.amountPaid,
          resultCode: order.resultCode,
          resultDescription: order.resultDescription,
          paymentInitiatedAt: order.paymentInitiatedAt,
          paymentCompletedAt: order.paymentCompletedAt
        },
        error: 'Failed to query M-Pesa status',
        mpesaError: statusResponse.error
      });
    }

    // Handle pending transaction (still being processed)
    if (statusResponse.isPending || statusResponse.resultCode === '1032') {
      console.log('Transaction is still pending/being processed');
      return NextResponse.json({
        success: true,
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: 'pending',
          checkoutRequestId: order.checkoutRequestId,
          phoneNumber: order.phoneNumber,
          mpesaReceiptNumber: order.mpesaReceiptNumber,
          amountPaid: order.amountPaid,
          resultCode: order.resultCode,
          resultDescription: order.resultDescription,
          paymentInitiatedAt: order.paymentInitiatedAt,
          paymentCompletedAt: order.paymentCompletedAt
        },
        message: statusResponse.message || 'Transaction is still being processed',
        isPending: true
      });
    }
    
    // Update order based on M-Pesa response
    if (statusResponse.ResultCode === '0') {
      // Payment successful
      await Order.findByIdAndUpdate(order._id, {
        paymentStatus: 'paid',
        resultCode: 0,
        resultDescription: statusResponse.ResultDesc,
        paymentCompletedAt: new Date()
      });
    } else if (statusResponse.ResultCode && statusResponse.ResultCode !== '1032') {
      // Payment failed (1032 means still pending)
      await Order.findByIdAndUpdate(order._id, {
        paymentStatus: 'failed',
        resultCode: parseInt(statusResponse.ResultCode),
        resultDescription: statusResponse.ResultDesc,
        paymentCompletedAt: new Date()
      });
    }

    // Fetch updated order
    const updatedOrder = await Order.findById(order._id);

    return NextResponse.json({
      success: true,
      order: {
        _id: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        paymentStatus: updatedOrder.paymentStatus,
        checkoutRequestId: updatedOrder.checkoutRequestId,
        phoneNumber: updatedOrder.phoneNumber,
        mpesaReceiptNumber: updatedOrder.mpesaReceiptNumber,
        amountPaid: updatedOrder.amountPaid,
        resultCode: updatedOrder.resultCode,
        resultDescription: updatedOrder.resultDescription,
        paymentInitiatedAt: updatedOrder.paymentInitiatedAt,
        paymentCompletedAt: updatedOrder.paymentCompletedAt
      },
      mpesaResponse: statusResponse
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 