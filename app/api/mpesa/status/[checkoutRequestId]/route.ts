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

    // Calculate time since payment was initiated
    const paymentInitiatedAt = order.paymentInitiatedAt || order.createdAt || new Date();
    const timeSinceInitiation = Date.now() - new Date(paymentInitiatedAt).getTime();
    const minutesSinceInitiation = timeSinceInitiation / (1000 * 60);
    
    // If payment was initiated less than 3 minutes ago, always treat as pending
    // This prevents premature "failed" status when M-Pesa hasn't processed the request yet
    const isVeryRecent = minutesSinceInitiation < 3;
    
    // If payment is still pending, query M-Pesa for current status
    const statusResponse = await mpesaService.querySTKStatus(checkoutRequestId);
    
    // Check if the status query was successful
    if (statusResponse.success === false) {
      console.error('M-Pesa status query failed:', statusResponse.error);
      
      // If payment was initiated very recently, keep it as pending even if query fails
      // M-Pesa might not have the transaction in their system yet
      if (isVeryRecent) {
        console.log(`Payment initiated ${minutesSinceInitiation.toFixed(1)} minutes ago - keeping as pending despite query error`);
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
          message: 'Transaction is still being processed. Please wait...',
          isPending: true
        });
      }
      
      // Return current order status with error info (but don't update to failed if it's still pending)
      return NextResponse.json({
        success: true,
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus, // Keep existing status
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
      // Only mark as failed if:
      // 1. Payment was initiated more than 3 minutes ago (not too recent)
      // 2. We have a definitive failure code (not just an error querying)
      // 3. The result code is a known failure code (not an unknown/query error)
      
      const definitiveFailureCodes = ['1037', '1034', '1035', '1036', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010'];
      const isDefinitiveFailure = definitiveFailureCodes.includes(statusResponse.ResultCode);
      
      if (isDefinitiveFailure && !isVeryRecent) {
        // Payment failed with a definitive failure code
        console.log(`Payment failed with code ${statusResponse.ResultCode}: ${statusResponse.ResultDesc}`);
        await Order.findByIdAndUpdate(order._id, {
          paymentStatus: 'failed',
          resultCode: parseInt(statusResponse.ResultCode),
          resultDescription: statusResponse.ResultDesc,
          paymentCompletedAt: new Date()
        });
      } else {
        // Unknown result code or too recent - keep as pending
        console.log(`Unknown result code ${statusResponse.ResultCode} or payment too recent - keeping as pending`);
        // Don't update the order status, keep it as pending
      }
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