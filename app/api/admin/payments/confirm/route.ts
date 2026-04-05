import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import MpesaTransaction from '@/lib/models/MpesaTransaction';
import Order from '@/lib/models/Order';
import PaymentAuditLog from '@/lib/models/PaymentAuditLog';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

// SMS notification function
const sendPaymentConfirmationSMS = async (order: any, amountPaid: number, isFullyPaid: boolean, mpesaReceiptNumber: string) => {
  try {
    if (!order.customer?.phone) {
      console.log('No phone number available for SMS notification');
      return;
    }

    const message = isFullyPaid 
      ? `*** Payment Confirmation - Econuru Services ***

Dear ${order.customer.name},

Thank you for your payment!

Order #${order.orderNumber}
Amount Paid: Ksh ${amountPaid.toLocaleString()}
M-Pesa Receipt: ${mpesaReceiptNumber}
Payment Status: PAID

Your order is now confirmed and will be processed.

We'll keep you updated on your order progress.

Thank you for choosing Econuru Services!

Need help? Call us at +254 757 883 799`
      : `*** Payment Received - Econuru Services ***

Dear ${order.customer.name},

Thank you for your partial payment!

Order #${order.orderNumber}
Amount Paid: Ksh ${amountPaid.toLocaleString()}
M-Pesa Receipt: ${mpesaReceiptNumber}
Remaining Balance: Ksh ${(order.remainingBalance || 0).toLocaleString()}

Your payment has been processed. Please complete the remaining balance to proceed.

Thank you for choosing Econuru Services!

Need help? Call us at +254 757 883 799`;

    const response = await fetch(process.env.NODE_ENV === 'production' 
      ? 'https://www.econuru.co.ke/api/sms' 
      : 'http://localhost:3000/api/sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile: order.customer.phone,
        message,
        type: 'payment_confirmation'
      }),
    });

    const data = await response.json();
    if (data.success) {
      console.log(`✅ Payment confirmation SMS sent to ${order.customer.phone} for order ${order.orderNumber}`);
    } else {
      console.error(`❌ Failed to send payment confirmation SMS: ${data.error}`);
    }
  } catch (error) {
    console.error('SMS sending error:', error);
  }
};

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

    const { transactionId, confirmedCustomerName, confirmationNotes = '' } = await request.json();

    if (!transactionId || !confirmedCustomerName) {
      return NextResponse.json(
        { error: 'Transaction ID and customer name are required' },
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

    // Check if transaction is already connected to prevent reuse
    if (transaction.isConnectedToOrder) {
      return NextResponse.json(
        { error: 'Transaction is already connected to an order' },
        { status: 400 }
      );
    }

    // Find the order
    const order = await Order.findById(transaction.pendingOrderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Determine payment status based on amounts
    const orderTotal = order.totalAmount;
    const currentAmountPaid = order.amountPaid || 0;
    const transactionAmount = transaction.amountPaid;
    const newTotalPaid = currentAmountPaid + transactionAmount;
    
    let paymentStatus: string;
    if (newTotalPaid >= orderTotal) {
      paymentStatus = 'paid';
    } else {
      paymentStatus = 'partial';
    }

    // Update transaction as confirmed
    await MpesaTransaction.findByIdAndUpdate(transactionId, {
      confirmationStatus: 'confirmed',
      isConnectedToOrder: true,
      connectedOrderId: order._id,
      connectedAt: new Date(),
      connectedBy: decoded.userId || decoded.email,
      confirmedCustomerName: confirmedCustomerName,
      confirmationNotes: confirmationNotes,
      confirmedAt: new Date()
    });

    // Update order with payment details
    await Order.findByIdAndUpdate(order._id, {
      paymentStatus: paymentStatus,
      paymentMethod: 'mpesa_stk',
      amountPaid: newTotalPaid,
      mpesaReceiptNumber: transaction.mpesaReceiptNumber,
      transactionDate: transaction.transactionDate,
      phoneNumber: transaction.phoneNumber,
      paymentCompletedAt: new Date(),
      $set: {
        'mpesaPayment.mpesaReceiptNumber': transaction.mpesaReceiptNumber,
        'mpesaPayment.transactionDate': transaction.transactionDate,
        'mpesaPayment.phoneNumber': transaction.phoneNumber,
        'mpesaPayment.amountPaid': newTotalPaid,
        'mpesaPayment.paymentCompletedAt': new Date()
      }
    });

    // Create audit log
    await PaymentAuditLog.create({
      action: 'manual_confirm',
      transactionId: transaction.mpesaReceiptNumber,
      orderId: order.orderNumber,
      adminUserId: decoded.userId || decoded.email,
      adminUserName: decoded.name || decoded.email,
      customerName: confirmedCustomerName,
      amount: transactionAmount,
      phoneNumber: transaction.phoneNumber,
      notes: confirmationNotes,
      previousStatus: 'pending',
      newStatus: paymentStatus,
      metadata: {
        expectedAmount: order.totalAmount,
        actualAmount: transactionAmount,
        source: 'stkpush'
      }
    });

    // Send SMS notification
    await sendPaymentConfirmationSMS(order, newTotalPaid, paymentStatus === 'paid', transaction.mpesaReceiptNumber);

    console.log(`✅ Transaction ${transaction.mpesaReceiptNumber} confirmed by ${decoded.name || decoded.email} for order ${order.orderNumber}`);

    return NextResponse.json({
      success: true,
      message: 'Transaction confirmed successfully',
      paymentStatus: paymentStatus,
      amountPaid: newTotalPaid,
      transaction: {
        id: transaction._id,
        mpesaReceiptNumber: transaction.mpesaReceiptNumber,
        amount: transactionAmount,
        confirmedCustomerName: confirmedCustomerName
      }
    });

  } catch (error) {
    console.error('Error confirming transaction:', error);
    return NextResponse.json(
      { error: 'Failed to confirm transaction' },
      { status: 500 }
    );
  }
} 