import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { isStkCancelledCode, isStkFailureCode, isStkSuccessCode, mpesaService, parseStkResultCode, STK_PROMPT_WAIT_MS } from '@/lib/mpesa';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { attachUniqueUnconnectedTransaction } from '@/lib/paybill-account';
import { sendPurchaseConfirmationIfNeeded } from '@/lib/purchase-confirmation-sms';

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

    const order = await Order.findOne({
      $or: [
        { checkoutRequestId },
        { 'pendingMpesaPayment.checkoutRequestId': checkoutRequestId },
        { 'mpesaPayment.checkoutRequestId': checkoutRequestId },
      ],
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If payment is already completed, still try to attach a unique C2B receipt
    if (order.paymentStatus === 'paid' || order.paymentStatus === 'failed') {
      if (order.paymentStatus === 'paid' && !(order.mpesaReceiptNumber || order.mpesaPayment?.mpesaReceiptNumber)) {
        await attachUniqueUnconnectedTransaction(order);
        const refreshed = await Order.findById(order._id);
        if (refreshed) {
          order.mpesaReceiptNumber = refreshed.mpesaReceiptNumber;
          order.mpesaPayment = refreshed.mpesaPayment;
        }
      }
      return NextResponse.json({
        success: true,
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          checkoutRequestId: order.checkoutRequestId,
          phoneNumber: order.phoneNumber,
          mpesaReceiptNumber: order.mpesaReceiptNumber || order.mpesaPayment?.mpesaReceiptNumber,
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
    const promptStillOpen = timeSinceInitiation < STK_PROMPT_WAIT_MS;
    
    // If payment is still pending, query M-Pesa for current status
    const statusResponse = await mpesaService.querySTKStatus(checkoutRequestId);
    const resultCode = parseStkResultCode(statusResponse);
    const resultDesc = String(statusResponse.ResultDesc || statusResponse.resultDesc || statusResponse.message || '');

    const pendingPayload = (message: string) => NextResponse.json({
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
      message,
      isPending: true
    });

    if (statusResponse.success === false) {
      return pendingPayload('Transaction is still being processed. Please wait...');
    }

    if (statusResponse.isPending) {
      return pendingPayload(statusResponse.message || 'Transaction is still being processed');
    }

    if (isStkSuccessCode(resultCode)) {
      // Query ResultCode 0 means the customer already paid. Mark paid immediately
      // so POS is not stuck waiting for a callback. The callback still attaches
      // the M-Pesa receipt when it arrives.
      const paidAmount = Number(order.pendingMpesaPayment?.amount || order.totalAmount) || 0;
      const orderTotal = Number(order.totalAmount) || 0;
      const remaining = Math.max(0, orderTotal - paidAmount);
      await Order.findByIdAndUpdate(order._id, {
        $set: {
          paymentStatus: remaining === 0 ? 'paid' : 'partial',
          paymentMethod: 'mpesa_stk',
          amountPaid: paidAmount,
          remainingBalance: remaining,
          remainingAmount: remaining,
          status: remaining === 0 && order.status === 'pending' ? 'confirmed' : order.status,
          resultCode: 0,
          resultDescription: resultDesc || 'The service request is processed successfully.',
          paymentCompletedAt: new Date(),
          'pendingMpesaPayment.status': 'completed',
        }
      });
      void sendPurchaseConfirmationIfNeeded(order._id).catch(() => undefined);
      await attachUniqueUnconnectedTransaction({
        ...order.toObject(),
        pendingMpesaPayment: order.pendingMpesaPayment,
        totalAmount: orderTotal,
        amountPaid: paidAmount,
      });
    } else if (isStkCancelledCode(resultCode) || isStkFailureCode(resultCode)) {
      // Safaricom often returns 1032 while the PIN prompt is still open.
      // Only trust cancel/fail from the query after the prompt has expired.
      // Real cancels still arrive immediately via the STK callback.
      if (promptStillOpen) {
        return pendingPayload('Waiting for the customer to complete or cancel the M-Pesa prompt...');
      }
      await Order.findByIdAndUpdate(order._id, {
        $set: {
          paymentStatus: 'failed',
          resultCode: parseInt(resultCode, 10) || 0,
          resultDescription: resultDesc || (isStkCancelledCode(resultCode)
            ? 'The customer cancelled the M-Pesa request or it expired.'
            : 'Payment failed'),
          paymentCompletedAt: new Date(),
          'pendingMpesaPayment.status': 'failed',
        }
      });
    } else {
      return pendingPayload('Waiting for M-Pesa confirmation...');
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
        mpesaReceiptNumber: updatedOrder.mpesaReceiptNumber || updatedOrder.mpesaPayment?.mpesaReceiptNumber,
        amountPaid: updatedOrder.amountPaid,
        resultCode: updatedOrder.resultCode,
        resultDescription: updatedOrder.resultDescription,
        paymentInitiatedAt: updatedOrder.paymentInitiatedAt,
        paymentCompletedAt: updatedOrder.paymentCompletedAt
      },
      isPending: updatedOrder.paymentStatus === 'pending',
      mpesaResponse: statusResponse
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 