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
    if (!decoded || decoded.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const { transactionId, orderId } = await request.json();

    if (!transactionId || !orderId) {
      return NextResponse.json({ 
        error: 'Transaction ID and Order ID are required' 
      }, { status: 400 });
    }

    await connectDB();

    // Find the M-Pesa transaction (allow reconnecting)
    const transaction = await MpesaTransaction.findOne({ 
      transactionId: transactionId
    });

    if (!transaction) {
      return NextResponse.json({ 
        error: 'Transaction not found' 
      }, { status: 404 });
    }

    // If transaction is already connected, we'll update the connection
    const isReconnecting = transaction.isConnectedToOrder;
    const previousOrderId = transaction.connectedOrderId;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ 
        error: 'Order not found' 
      }, { status: 404 });
    }

    // Check if order is already paid (only for new connections, not reconnections)
    if (!isReconnecting && order.paymentStatus === 'paid') {
      return NextResponse.json({ 
        error: 'Order is already marked as paid' 
      }, { status: 400 });
    }

    // Get current remaining balance or use total amount
    const currentRemainingBalance = order.remainingBalance || order.totalAmount;
    const amountPaid = transaction.amountPaid || 0;
    
    // Calculate new remaining balance
    const newRemainingBalance = Math.max(0, currentRemainingBalance - amountPaid);
    const isExactPayment = newRemainingBalance === 0;
    const isPartialPayment = newRemainingBalance > 0;
    const isOverPayment = amountPaid > currentRemainingBalance;
    
    // Determine payment status
    const paymentStatus = isExactPayment ? 'paid' : 'partial';

    // Determine payment method based on transaction type
    const paymentMethod = transaction.transactionType === 'STK_PUSH' ? 'mpesa_stk' : 'mpesa_c2b';

    // Create payment record for partial payments array
    const paymentRecord = {
      amount: amountPaid,
      date: new Date(),
      mpesaReceiptNumber: transaction.mpesaReceiptNumber,
      phoneNumber: transaction.phoneNumber,
      method: paymentMethod
    };

    // If reconnecting, first remove the payment from the previous order
    if (isReconnecting && previousOrderId && previousOrderId.toString() !== orderId) {
      const previousOrder = await Order.findById(previousOrderId);
      if (previousOrder) {
        // Remove this transaction's payment from the previous order
        const previousTotalPaid = previousOrder.partialPayments?.reduce((sum, payment) => {
          return sum + (payment.amount || 0);
        }, 0) || 0;
        
        const newPreviousTotalPaid = Math.max(0, previousTotalPaid - amountPaid);
        const newPreviousRemainingBalance = Math.max(0, previousOrder.totalAmount - newPreviousTotalPaid);
        
        let newPreviousPaymentStatus = 'unpaid';
        if (newPreviousTotalPaid >= previousOrder.totalAmount) {
          newPreviousPaymentStatus = 'paid';
        } else if (newPreviousTotalPaid > 0) {
          newPreviousPaymentStatus = 'partial';
        }

        // Remove the specific payment record
        await Order.findByIdAndUpdate(previousOrderId, {
          paymentStatus: newPreviousPaymentStatus,
          remainingBalance: newPreviousRemainingBalance,
          $pull: {
            partialPayments: {
              mpesaReceiptNumber: transaction.mpesaReceiptNumber,
              amount: amountPaid
            }
          }
        });

        console.log(`🔄 Removed payment from previous order ${previousOrder.orderNumber}:`, {
          oldStatus: previousOrder.paymentStatus,
          newStatus: newPreviousPaymentStatus,
          oldBalance: previousOrder.remainingBalance,
          newBalance: newPreviousRemainingBalance,
          removedAmount: amountPaid
        });
      }
    }

    // Update the order with payment details
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: paymentStatus,
      paymentMethod: paymentMethod,
      remainingBalance: newRemainingBalance,
      $push: {
        partialPayments: paymentRecord
      },
      $set: {
        'c2bPayment': {
          transactionId: transaction.transactionId,
          mpesaReceiptNumber: transaction.mpesaReceiptNumber,
          transactionDate: transaction.transactionDate,
          phoneNumber: transaction.phoneNumber,
          amountPaid: transaction.amountPaid,
          transactionType: transaction.transactionType,
          billRefNumber: transaction.billRefNumber,
          thirdPartyTransID: transaction.thirdPartyTransID,
          orgAccountBalance: transaction.orgAccountBalance,
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
      notes: `${transaction.notes} Connected to order ${order.orderNumber} by admin.`
    });

    const actionType = isReconnecting ? 'RECONNECTED' : 'CONNECTED';
    const logMessage = isExactPayment 
      ? `🔗✅ ${actionType} FULL payment transaction ${transactionId} to order ${order.orderNumber} by ${decoded.email} (KES ${amountPaid})`
      : isOverPayment
      ? `🔗💰 ${actionType} OVERPAYMENT transaction ${transactionId} to order ${order.orderNumber} by ${decoded.email} (KES ${amountPaid} for remaining KES ${currentRemainingBalance})`
      : `🔗⚠️ ${actionType} PARTIAL payment transaction ${transactionId} to order ${order.orderNumber} by ${decoded.email} (KES ${amountPaid}, remaining: KES ${newRemainingBalance})`;
    
    console.log(logMessage);

    const successMessage = isExactPayment
      ? `Transaction ${transactionId} successfully ${isReconnecting ? 'reconnected' : 'connected'} to order ${order.orderNumber} - Order fully paid`
      : isOverPayment
      ? `Transaction ${transactionId} ${isReconnecting ? 'reconnected' : 'connected'} as overpayment (KES ${amountPaid} for remaining KES ${currentRemainingBalance}) to order ${order.orderNumber}`
      : `Transaction ${transactionId} ${isReconnecting ? 'reconnected' : 'connected'} as partial payment (KES ${amountPaid}) to order ${order.orderNumber}. Remaining balance: KES ${newRemainingBalance}`;

    return NextResponse.json({
      success: true,
      message: successMessage,
      isExactPayment: isExactPayment,
      isPartialPayment: isPartialPayment,
      isOverPayment: isOverPayment,
      amountPaid: amountPaid,
      remainingBalance: newRemainingBalance,
      currentRemainingBalance: currentRemainingBalance,
      transaction: {
        id: transaction.transactionId,
        amount: transaction.amountPaid,
        customer: transaction.customerName
      },
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer.name
      }
    });

  } catch (error: any) {
    console.error('Error connecting transaction to order:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 