import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import MpesaTransaction from '@/lib/models/MpesaTransaction';
import Order from '@/lib/models/Order';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    await connectDB();

    // Get pending transactions with potential matches
    const pendingTransactions = await MpesaTransaction.find({
      confirmationStatus: 'pending',
      pendingOrderId: { $ne: null }
    }).sort({ transactionDate: -1 });

    // Populate order details for each pending transaction
    const transactionsWithOrders = await Promise.all(
      pendingTransactions.map(async (transaction) => {
        const order = await Order.findById(transaction.pendingOrderId);
        return {
          _id: transaction._id,
          transactionId: transaction.transactionId,
          mpesaReceiptNumber: transaction.mpesaReceiptNumber,
          transactionDate: transaction.transactionDate,
          phoneNumber: transaction.phoneNumber,
          amountPaid: transaction.amountPaid,
          transactionType: transaction.transactionType,
          customerName: transaction.customerName,
          notes: transaction.notes,
          confirmationStatus: transaction.confirmationStatus,
          order: order ? {
            _id: order._id,
            orderNumber: order.orderNumber,
            customer: order.customer,
            totalAmount: order.totalAmount,
            amountPaid: order.amountPaid || 0,
            paymentStatus: order.paymentStatus
          } : null
        };
      })
    );

    // Get unmatched transactions (no pending order)
    const unmatchedTransactions = await MpesaTransaction.find({
      confirmationStatus: 'pending',
      pendingOrderId: null,
      isConnectedToOrder: false
    }).sort({ transactionDate: -1 });

    return NextResponse.json({
      success: true,
      pendingTransactions: transactionsWithOrders,
      unmatchedTransactions: unmatchedTransactions.map(t => ({
        _id: t._id,
        transactionId: t.transactionId,
        mpesaReceiptNumber: t.mpesaReceiptNumber,
        transactionDate: t.transactionDate,
        phoneNumber: t.phoneNumber,
        amountPaid: t.amountPaid,
        transactionType: t.transactionType,
        customerName: t.customerName,
        notes: t.notes,
        confirmationStatus: t.confirmationStatus
      }))
    });

  } catch (error) {
    console.error('Error fetching pending transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending transactions' },
      { status: 500 }
    );
  }
} 