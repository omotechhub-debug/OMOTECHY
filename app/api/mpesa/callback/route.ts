import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import MpesaTransaction from '@/lib/models/MpesaTransaction';
import PaymentAuditLog from '@/lib/models/PaymentAuditLog';

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
    await connectDB();

    const body = await request.json();
    console.log('M-Pesa Callback received:', JSON.stringify(body, null, 2));

    // Extract callback data from M-Pesa response
    const stkCallback = body.Body?.stkCallback;
    if (!stkCallback) {
      console.error('Invalid callback format');
      return NextResponse.json({ success: false, message: 'Invalid callback format' });
    }

    const {
      CheckoutRequestID: checkoutRequestId,
      ResultCode: resultCode,
      ResultDesc: resultDesc
    } = stkCallback;

    // Find the order by checkout request ID (check both top-level and nested fields)
    const order = await Order.findOne({
      $or: [
        { checkoutRequestId: checkoutRequestId },
        { 'mpesaPayment.checkoutRequestId': checkoutRequestId },
        { 'pendingMpesaPayment.checkoutRequestId': checkoutRequestId }
      ]
    });

    if (!order) {
      console.error('Order not found for checkout request ID:', checkoutRequestId);
      return NextResponse.json({ success: false, message: 'Order not found' });
    }

    console.log('Processing payment for order:', order.orderNumber);

    // Update payment status based on result code
    if (resultCode === 0) {
      // Payment successful
      const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
      
      // Extract payment details
      let mpesaReceiptNumber = '';
      let transactionDate = '';
      let phoneNumber = '';
      let amount = 0;

      callbackMetadata.forEach((item: any) => {
        switch (item.Name) {
          case 'MpesaReceiptNumber':
            mpesaReceiptNumber = item.Value;
            break;
          case 'TransactionDate':
            transactionDate = item.Value;
            break;
          case 'PhoneNumber':
            phoneNumber = item.Value;
            break;
          case 'Amount':
            amount = item.Value;
            break;
        }
      });

      // Convert M-Pesa date format to Date object
      let transactionDateObj = null;
      if (transactionDate) {
        // M-Pesa date format: YYYYMMDDHHMMSS
        const year = parseInt(transactionDate.substring(0, 4));
        const month = parseInt(transactionDate.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(transactionDate.substring(6, 8));
        const hour = parseInt(transactionDate.substring(8, 10));
        const minute = parseInt(transactionDate.substring(10, 12));
        const second = parseInt(transactionDate.substring(12, 14));
        transactionDateObj = new Date(year, month, day, hour, minute, second);
      }

      // Get the requested payment amount and type from pending payment data
      const requestedAmount = order.pendingMpesaPayment?.amount || order.totalAmount || 0;
      const paymentType = order.pendingMpesaPayment?.paymentType || 'full';
      const orderTotal = order.totalAmount || 0;
      const currentRemainingBalance = order.remainingBalance || orderTotal;
      const amountPaid = parseFloat(amount) || 0;
      
      // Check if the payment matches what was requested exactly
      const isExactAmountMatch = amountPaid === parseFloat(requestedAmount);
      
      console.log(`💰 Payment Analysis: Type=${paymentType}, Requested=${requestedAmount}, Paid=${amountPaid}, OrderTotal=${orderTotal}, RemainingBalance=${currentRemainingBalance}`);

      // Check for duplicate transactions
      const existingTransaction = await MpesaTransaction.findOne({
        mpesaReceiptNumber: mpesaReceiptNumber
      });

      if (existingTransaction) {
        console.log(`⚠️ Transaction ${mpesaReceiptNumber} already exists, skipping duplicate`);
        return NextResponse.json({ 
          success: true, 
          message: 'Duplicate transaction ignored' 
        });
      }

      // ALWAYS create M-Pesa transaction record for successful STK payments
      let mpesaTransaction;
      
      // Get the requested phone number from pending payment data
      const requestedPhoneNumber = order.pendingMpesaPayment?.phoneNumber || 'Unknown';
      const actualPhoneNumber = phoneNumber || 'Unknown';
      
      if (isExactAmountMatch) {
        // EXACT AMOUNT MATCH: Auto-process the payment and subtract from balance
        try {
          // Calculate new remaining balance
          const newRemainingBalance = Math.max(0, currentRemainingBalance - amountPaid);
          const isFullyPaid = newRemainingBalance === 0;
          
          // Create confirmed transaction record
          mpesaTransaction = new MpesaTransaction({
            transactionId: mpesaReceiptNumber,
            mpesaReceiptNumber: mpesaReceiptNumber,
            transactionDate: transactionDateObj || new Date(),
            phoneNumber: phoneNumber || 'Unknown',
            amountPaid: amountPaid,
            transactionType: 'STK_PUSH',
            billRefNumber: order.orderNumber,
            customerName: order.customer?.name || 'STK Push Customer',
            paymentCompletedAt: new Date(),
            // Auto-confirmed for exact matches
            confirmationStatus: 'confirmed',
            pendingOrderId: order._id,
            isConnectedToOrder: true,
            connectedOrderId: order._id,
            connectedAt: new Date(),
            connectedBy: 'SYSTEM',
            confirmedBy: 'SYSTEM',
            confirmedCustomerName: order.customer?.name || 'Auto-confirmed',
            confirmedAt: new Date(),
            notes: `AUTO-CONFIRMED: STK Push exact amount match for order ${order.orderNumber}. Requested: ${requestedPhoneNumber}, Paid: ${actualPhoneNumber}. Payment type: ${paymentType}. Amount: KES ${amountPaid}. ${isFullyPaid ? 'Order fully paid.' : `Remaining balance: KES ${newRemainingBalance}`}`
          });

          await mpesaTransaction.save();

          // Add to partial payments history
          const partialPayment = {
            amount: amountPaid,
            date: transactionDateObj || new Date(),
            mpesaReceiptNumber: mpesaReceiptNumber,
            phoneNumber: phoneNumber || 'Unknown',
            method: 'mpesa_stk' as const
          };

          // Update order with new balance and payment info
          const updateData: any = {
            remainingBalance: newRemainingBalance,
            paymentStatus: isFullyPaid ? 'paid' : 'partial',
            paymentMethod: 'mpesa_stk',
            resultCode: resultCode,
            resultDescription: resultDesc,
            paymentCompletedAt: new Date(),
            $push: {
              partialPayments: partialPayment
            },
            $set: {
              'mpesaPayment.checkoutRequestId': checkoutRequestId,
              'mpesaPayment.mpesaReceiptNumber': mpesaReceiptNumber,
              'mpesaPayment.transactionDate': transactionDateObj,
              'mpesaPayment.phoneNumber': phoneNumber,
              'mpesaPayment.amountPaid': amountPaid,
              'mpesaPayment.resultCode': resultCode,
              'mpesaPayment.resultDescription': resultDesc,
              'mpesaPayment.paymentCompletedAt': new Date(),
              'pendingMpesaPayment.status': 'completed'
            }
          };

          // If fully paid, also update top-level payment fields
          if (isFullyPaid) {
            updateData.amountPaid = orderTotal;
            updateData.mpesaReceiptNumber = mpesaReceiptNumber;
            updateData.transactionDate = transactionDateObj;
            updateData.phoneNumber = phoneNumber;
          }

          await Order.findByIdAndUpdate(order._id, updateData);

          // Create audit log
          await PaymentAuditLog.create({
            action: 'auto_confirm_payment',
            transactionId: mpesaReceiptNumber,
            orderId: order.orderNumber,
            adminUserId: 'SYSTEM',
            adminUserName: 'SYSTEM',
            customerName: order.customer?.name || 'Auto-confirmed',
            amount: amountPaid,
            phoneNumber: actualPhoneNumber,
            notes: `STK Push payment confirmed. Requested: ${requestedPhoneNumber}, Paid: ${actualPhoneNumber}`,
            previousStatus: 'pending',
            newStatus: isFullyPaid ? 'paid' : 'partial',
            metadata: {
              expectedAmount: requestedAmount,
              actualAmount: amountPaid,
              paymentType: paymentType,
              source: 'stkpush'
            }
          });

          console.log(`✅ AUTO-CONFIRMED: STK Push payment for order ${order.orderNumber}: Receipt ${mpesaReceiptNumber} (KES ${amountPaid})`);
          console.log(`📱 Phone Tracking: Requested ${requestedPhoneNumber} → Paid ${actualPhoneNumber}`);
          console.log(`💰 Balance Updated: ${currentRemainingBalance} → ${newRemainingBalance} (${isFullyPaid ? 'FULLY PAID' : 'PARTIAL'})`);
          
          // Send SMS notification
          await sendPaymentConfirmationSMS(order, amountPaid, isFullyPaid, mpesaReceiptNumber);
          
        } catch (transactionError) {
          console.error('Error processing exact amount match:', transactionError);
          
          // Fallback: Create as unmatched if processing fails
          mpesaTransaction = new MpesaTransaction({
            transactionId: mpesaReceiptNumber,
            mpesaReceiptNumber: mpesaReceiptNumber,
            transactionDate: transactionDateObj || new Date(),
            phoneNumber: phoneNumber || 'Unknown',
            amountPaid: amountPaid,
            transactionType: 'STK_PUSH',
            billRefNumber: order.orderNumber,
            customerName: order.customer?.name || 'STK Push Customer',
            paymentCompletedAt: new Date(),
            confirmationStatus: 'pending',
            pendingOrderId: null,
            isConnectedToOrder: false,
            notes: `PROCESSING ERROR: STK Push exact match failed to process for order ${order.orderNumber}. Requires manual connection. Error: ${transactionError}`
          });

          await mpesaTransaction.save();
        }
      } else {
        // AMOUNT MISMATCH: Create unmatched transaction for manual review
        try {
          mpesaTransaction = new MpesaTransaction({
            transactionId: mpesaReceiptNumber,
            mpesaReceiptNumber: mpesaReceiptNumber,
            transactionDate: transactionDateObj || new Date(),
            phoneNumber: phoneNumber || 'Unknown',
            amountPaid: amountPaid,
            transactionType: 'STK_PUSH',
            billRefNumber: order.orderNumber,
            customerName: order.customer?.name || 'STK Push Customer',
            paymentCompletedAt: new Date(),
            // Unmatched transaction - no automatic connection
            confirmationStatus: 'pending',
            pendingOrderId: null,
            isConnectedToOrder: false,
            notes: `STK Push AMOUNT MISMATCH for order ${order.orderNumber}. Requested: ${requestedPhoneNumber}, Paid: ${actualPhoneNumber}. Expected: KES ${requestedAmount}, Received: KES ${amountPaid}, Order Total: KES ${orderTotal}, Remaining: KES ${currentRemainingBalance}. Requires manual connection.`
          });

          await mpesaTransaction.save();

          // Update order basic payment info but keep payment status unchanged
          await Order.findByIdAndUpdate(order._id, {
            resultCode: resultCode,
            resultDescription: resultDesc,
            $set: {
              'mpesaPayment.resultCode': resultCode,
              'mpesaPayment.resultDescription': resultDesc,
              'mpesaPayment.paymentCompletedAt': new Date(),
              'pendingMpesaPayment.status': 'failed'
            }
          });

          console.log(`🔴 STK Push AMOUNT MISMATCH for order ${order.orderNumber}: Expected KES ${requestedAmount}, Received KES ${amountPaid} - Receipt: ${mpesaReceiptNumber}`);
          console.log(`📱 Phone Tracking: Requested ${requestedPhoneNumber} → Paid ${actualPhoneNumber}`);
          console.log(`🔗 Transaction created as unmatched. Requires manual admin connection.`);
        } catch (transactionError) {
          console.error('Error storing unmatched STK Push transaction:', transactionError);
        }
      }

      // Ensure transaction was created (fallback for any edge cases)
      if (!mpesaTransaction) {
        console.log(`📝 Creating fallback M-Pesa transaction for STK payment: ${mpesaReceiptNumber}`);
        mpesaTransaction = new MpesaTransaction({
          transactionId: mpesaReceiptNumber,
          mpesaReceiptNumber: mpesaReceiptNumber,
          transactionDate: transactionDateObj || new Date(),
          phoneNumber: phoneNumber || 'Unknown',
          amountPaid: amountPaid,
          transactionType: 'STK_PUSH',
          billRefNumber: order.orderNumber,
          customerName: order.customer?.name || 'STK Push Customer',
          paymentCompletedAt: new Date(),
          confirmationStatus: 'pending',
          pendingOrderId: null,
          isConnectedToOrder: false,
                      notes: `STK Push payment for order ${order.orderNumber}. Requested: ${requestedPhoneNumber}, Paid: ${actualPhoneNumber}. Amount: KES ${amountPaid}. Requires manual review.`
        });
        await mpesaTransaction.save();
      }

    } else {
      // Payment failed or cancelled
      await Order.findByIdAndUpdate(order._id, {
        paymentStatus: 'failed',
        paymentMethod: 'mpesa_stk',
        resultCode: resultCode,
        resultDescription: resultDesc,
        paymentCompletedAt: new Date(),
        $set: {
          'mpesaPayment.resultCode': resultCode,
          'mpesaPayment.resultDescription': resultDesc,
          'mpesaPayment.paymentCompletedAt': new Date(),
          'pendingMpesaPayment.status': 'failed'
        }
      });

      console.log(`❌ Payment failed for order ${order.orderNumber}: ${resultDesc}`);
    }

    // Always return success to M-Pesa to acknowledge receipt
    return NextResponse.json({ 
      success: true, 
      message: 'Callback processed successfully' 
    });

  } catch (error) {
    console.error('M-Pesa callback error:', error);
    
    // Still return success to M-Pesa to avoid retries
    return NextResponse.json({ 
      success: true, 
      message: 'Callback received but processing failed' 
    });
  }
}

// Handle GET requests (for testing/verification)
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'M-Pesa callback endpoint is active',
    timestamp: new Date().toISOString()
  });
} 