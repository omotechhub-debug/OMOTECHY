import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import MpesaTransaction from '@/lib/models/MpesaTransaction';
import Order from '@/lib/models/Order';
import PaymentAuditLog from '@/lib/models/PaymentAuditLog';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

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

    const { transactionId, rejectionReason = '' } = await request.json();

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the pending transaction
    const transaction = await MpesaTransaction.findById(transactionId);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.confirmationStatus !== 'pending') {
      return NextResponse.json(
        { error: 'Transaction is not pending confirmation' },
        { status: 400 }
      );
    }

    // Get order info for audit log
    let order = null;
    if (transaction.pendingOrderId) {
      order = await Order.findById(transaction.pendingOrderId);
    }

    // Update transaction as rejected and remove pending order connection
    await MpesaTransaction.findByIdAndUpdate(transactionId, {
      confirmationStatus: 'rejected',
      pendingOrderId: null, // Remove the pending connection
      confirmationNotes: rejectionReason,
      confirmedBy: decoded.userId || decoded.email,
      confirmedAt: new Date()
    });

    // Create audit log
    await PaymentAuditLog.create({
      action: 'manual_reject',
      transactionId: transaction.mpesaReceiptNumber,
      orderId: order ? order.orderNumber : 'N/A',
      adminUserId: decoded.userId || decoded.email,
      adminUserName: decoded.name || decoded.email,
      customerName: transaction.customerName,
      amount: transaction.amountPaid,
      phoneNumber: transaction.phoneNumber,
      notes: rejectionReason,
      previousStatus: 'pending',
      newStatus: 'rejected',
      metadata: {
        expectedAmount: order ? order.totalAmount : 0,
        actualAmount: transaction.amountPaid,
        source: 'stkpush'
      }
    });

    console.log(`❌ Transaction ${transaction.mpesaReceiptNumber} rejected by ${decoded.name || decoded.email}. Reason: ${rejectionReason}`);

    return NextResponse.json({
      success: true,
      message: 'Transaction rejected successfully',
      transaction: {
        id: transaction._id,
        mpesaReceiptNumber: transaction.mpesaReceiptNumber,
        amount: transaction.amountPaid,
        rejectionReason: rejectionReason
      }
    });

  } catch (error) {
    console.error('Error rejecting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to reject transaction' },
      { status: 500 }
    );
  }
} 