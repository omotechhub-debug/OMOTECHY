import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import MpesaTransaction from '@/lib/models/MpesaTransaction';
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

    const { orderId, paymentAmount } = await request.json();

    if (!orderId || !paymentAmount) {
      return NextResponse.json({ 
        error: 'Order ID and payment amount are required' 
      }, { status: 400 });
    }

    await connectDB();

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ 
        error: 'Order not found' 
      }, { status: 404 });
    }

    // Search for unconnected M-Pesa transactions with the exact amount
    const searchAmount = parseFloat(paymentAmount);
    const matchingTransactions = await MpesaTransaction.find({
      amountPaid: searchAmount,
      isConnectedToOrder: false
    }).sort({ transactionDate: -1 }); // Most recent first

    if (matchingTransactions.length === 0) {
      return NextResponse.json({
        success: false,
        message: `No unconnected M-Pesa transactions found with amount KES ${searchAmount}`,
        transactions: []
      });
    }

    if (matchingTransactions.length === 1) {
      // Single match found - auto-connect
      const transaction = matchingTransactions[0];
      
      // Check if payment amount matches order total exactly (strict comparison)
      const orderTotal = order.totalAmount || 0;
      const amountPaid = transaction.amountPaid || 0;
      const isExactPayment = amountPaid === orderTotal;
      const isPartialPayment = amountPaid < orderTotal;
      const isOverPayment = amountPaid > orderTotal;
      
      // Only mark as 'paid' if exact amount is received
      const paymentStatus = isExactPayment ? 'paid' : 'partially_paid';

      // Determine payment method based on transaction type
      const paymentMethod = transaction.transactionType === 'STK_PUSH' ? 'mpesa_stk' : 'mpesa_c2b';

      // Update the order with payment details
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: paymentStatus,
        paymentMethod: paymentMethod,
        mpesaReceiptNumber: transaction.mpesaReceiptNumber,
        transactionDate: transaction.transactionDate,
        phoneNumber: transaction.phoneNumber,
        amountPaid: transaction.amountPaid,
        paymentCompletedAt: transaction.paymentCompletedAt,
        $set: {
          'mpesaPayment': {
            transactionId: transaction.transactionId,
            mpesaReceiptNumber: transaction.mpesaReceiptNumber,
            transactionDate: transaction.transactionDate,
            phoneNumber: transaction.phoneNumber,
            amountPaid: transaction.amountPaid,
            transactionType: transaction.transactionType,
            billRefNumber: transaction.billRefNumber,
            customerName: transaction.customerName,
            paymentCompletedAt: transaction.paymentCompletedAt
          }
        }
      });

      // Update the transaction as connected
      await MpesaTransaction.findByIdAndUpdate(transaction._id, {
        isConnectedToOrder: true,
        connectedOrderId: orderId,
        connectedAt: new Date(),
        connectedBy: decoded.email || decoded.name || 'admin',
        notes: `${transaction.notes} Connected to order ${order.orderNumber} by admin via amount search (KES ${searchAmount}).`
      });

      const logMessage = isExactPayment 
        ? `🔗✅ EXACT payment transaction ${transaction.transactionId} auto-connected to order ${order.orderNumber} via amount search (KES ${amountPaid})`
        : isOverPayment
        ? `🔗💰 OVERPAYMENT transaction ${transaction.transactionId} auto-connected to order ${order.orderNumber} via amount search (KES ${amountPaid} for KES ${orderTotal})`
        : `🔗⚠️ PARTIAL payment transaction ${transaction.transactionId} auto-connected to order ${order.orderNumber} via amount search (KES ${amountPaid} of KES ${orderTotal})`;
      
      console.log(logMessage);

      const successMessage = isExactPayment
        ? `Payment of KES ${amountPaid} found and connected - Order marked as PAID`
        : isOverPayment
        ? `Overpayment of KES ${amountPaid} found and connected (expected KES ${orderTotal}) - Order marked as PAID`
        : `Partial payment of KES ${amountPaid} found and connected (KES ${orderTotal - amountPaid} remaining) - Order marked as PARTIALLY PAID`;

      return NextResponse.json({
        success: true,
        message: successMessage,
        autoConnected: true,
        transaction: {
          id: transaction.transactionId,
          amount: transaction.amountPaid,
          customer: transaction.customerName,
          date: transaction.transactionDate
        },
        paymentStatus: paymentStatus,
        isExactPayment: isExactPayment,
        isPartialPayment: isPartialPayment,
        isOverPayment: isOverPayment
      });

    } else {
      // Multiple matches found - return them for manual selection
      return NextResponse.json({
        success: false,
        message: `Found ${matchingTransactions.length} unconnected transactions with amount KES ${searchAmount}. Please select one manually.`,
        multipleMatches: true,
        transactions: matchingTransactions.map(t => ({
          id: t.transactionId,
          _id: t._id,
          mpesaReceiptNumber: t.mpesaReceiptNumber,
          customerName: t.customerName,
          phoneNumber: t.phoneNumber,
          amountPaid: t.amountPaid,
          transactionDate: t.transactionDate,
          transactionType: t.transactionType,
          notes: t.notes
        }))
      });
    }

  } catch (error: any) {
    console.error('Error connecting payment by amount:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 