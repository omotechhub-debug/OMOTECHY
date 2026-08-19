import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import MpesaTransaction from '@/lib/models/MpesaTransaction';
import { C2BConfirmationRequest, C2BConfirmationResponse } from '@/lib/mpesa';
import mongoose from 'mongoose';
import { normalizeKenyaPhoneLocal, resolvePhoneFromOrderFields } from '@/lib/phone-utils';
import { upsertCustomerFromPaymentContext } from '@/lib/upsert-customer';
import { sendPurchaseConfirmationIfNeeded } from '@/lib/purchase-confirmation-sms';
import { findOrderForC2BPayment } from '@/lib/paybill-account';

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
    const confirmationData: any = await request.json();
    
    console.log('💰 C2B Confirmation Request received:', JSON.stringify(confirmationData, null, 2));

    // Extract confirmation data (using exact M-Pesa field names)
    const {
      TransactionType: transactionType,
      TransID: transID,
      TransTime: transTime,
      TransAmount: transAmount,
      BusinessShortCode: businessShortCode,
      BillRefNumber: billRefNumber,
      OrgAccountBalance: orgAccountBalance,
      ThirdPartyTransID: thirdPartyTransID,
      MSISDN: msisdn,
      FirstName: firstName,
      MiddleName: middleName,
      LastName: lastName
    } = confirmationData;

    const amount = parseFloat(String(transAmount)) || 0;
    
    // Connect to database
    await connectDB();

    // Save phone number exactly as received from Safaricom (preserve encrypted/hashed format)
    const originalPhone = msisdn || 'Unknown';
    console.log(`📱 Phone number received from Safaricom: ${originalPhone}`);
    
    // For customer search/matching, create a formatted version if possible
    let formattedPhone = originalPhone;
    if (msisdn && typeof msisdn === 'string' && !msisdn.includes('e') && msisdn.length < 20) {
      // Only format if it looks like a real phone number (not encrypted)
      formattedPhone = msisdn.replace(/\D/g, '');
      if (formattedPhone.startsWith('254')) {
        formattedPhone = '0' + formattedPhone.substring(3);
      } else if (!formattedPhone.startsWith('0')) {
        formattedPhone = '0' + formattedPhone;
      }
    }

    // Convert M-Pesa timestamp to Date object
    let transactionDate = new Date();
    if (transTime && transTime.length >= 14) {
      try {
        // M-Pesa format: YYYYMMDDHHMMSS
        const year = parseInt(transTime.substring(0, 4));
        const month = parseInt(transTime.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(transTime.substring(6, 8));
        const hour = parseInt(transTime.substring(8, 10));
        const minute = parseInt(transTime.substring(10, 12));
        const second = parseInt(transTime.substring(12, 14));
        transactionDate = new Date(year, month, day, hour, minute, second);
      } catch (error) {
        console.error('Error parsing transaction time:', error);
      }
    }

    let orderUpdated = false;
    let customerUpdated = false;
    let linkedOrder: any = null;

    const attachReceiptAndConnect = async (order: any, alreadyPaid: boolean) => {
      const identityPhone =
        resolvePhoneFromOrderFields(order) ||
        normalizeKenyaPhoneLocal(formattedPhone) ||
        undefined;
      const customerName = [firstName, middleName, lastName].filter(Boolean).join(' ') || order.customer?.name || 'Unknown Customer';
      const phoneForStorage = identityPhone || 'Unknown';

      const receiptFields: Record<string, unknown> = {
        mpesaReceiptNumber: transID,
        transactionDate,
        'mpesaPayment.mpesaReceiptNumber': transID,
        'mpesaPayment.transactionDate': transactionDate,
        'mpesaPayment.amountPaid': amount,
        'mpesaPayment.paymentCompletedAt': new Date(),
        'pendingMpesaPayment.status': 'completed',
        c2bPayment: {
          transactionId: transID,
          mpesaReceiptNumber: transID,
          transactionDate,
          phoneNumber: phoneForStorage,
          amountPaid: amount,
          transactionType,
          billRefNumber: billRefNumber || order.paybillAccount || '',
          thirdPartyTransID,
          orgAccountBalance,
          customerName,
          paymentCompletedAt: new Date(),
        },
        ...(identityPhone ? { 'customer.phone': identityPhone } : {}),
      };

      if (alreadyPaid) {
        await Order.findByIdAndUpdate(order._id, { $set: receiptFields });
      } else {
        const orderTotal = order.totalAmount || 0;
        const currentRemainingBalance = order.remainingBalance ?? orderTotal;
        const newRemainingBalance = Math.max(0, currentRemainingBalance - amount);
        const isFullyPaid = newRemainingBalance === 0;
        await Order.findByIdAndUpdate(order._id, {
          $push: {
            partialPayments: {
              amount,
              date: transactionDate,
              mpesaReceiptNumber: transID,
              phoneNumber: phoneForStorage,
              method: 'mpesa_c2b',
            },
          },
          $set: {
            ...receiptFields,
            remainingBalance: newRemainingBalance,
            remainingAmount: newRemainingBalance,
            paymentStatus: isFullyPaid ? 'paid' : 'partial',
            paymentMethod: order.paymentMethod === 'mpesa_stk' ? 'mpesa_stk' : 'mpesa_c2b',
            amountPaid: isFullyPaid ? orderTotal : Math.min(orderTotal, (Number(order.amountPaid) || 0) + amount),
            ...(isFullyPaid ? { status: order.status === 'pending' ? 'confirmed' : order.status } : {}),
          },
        });
        if (isFullyPaid) {
          await sendPurchaseConfirmationIfNeeded(order._id);
        }
      }

      const existingTransaction = await MpesaTransaction.findOne({
        $or: [{ transactionId: transID }, { mpesaReceiptNumber: transID }],
      });
      const notes = `AUTO-CONFIRMED: C2B payment matched to order ${order.orderNumber} via account ${order.paybillAccount || billRefNumber || ''}. Amount: KES ${amount}.`;

      if (existingTransaction) {
        existingTransaction.isConnectedToOrder = true;
        existingTransaction.connectedOrderId = order._id;
        existingTransaction.connectedAt = new Date();
        existingTransaction.connectedBy = 'SYSTEM';
        existingTransaction.confirmationStatus = 'confirmed';
        existingTransaction.confirmedBy = 'SYSTEM';
        existingTransaction.confirmedCustomerName = customerName;
        existingTransaction.confirmedAt = new Date();
        existingTransaction.billRefNumber = billRefNumber || order.paybillAccount || existingTransaction.billRefNumber;
        existingTransaction.phoneNumber = phoneForStorage;
        existingTransaction.notes = notes;
        await existingTransaction.save();
      } else {
        await MpesaTransaction.create({
          transactionId: transID,
          mpesaReceiptNumber: transID,
          transactionDate,
          phoneNumber: phoneForStorage,
          amountPaid: amount,
          transactionType: transactionType || 'Pay Bill',
          billRefNumber: billRefNumber || order.paybillAccount || '',
          thirdPartyTransID,
          orgAccountBalance,
          customerName,
          paymentCompletedAt: new Date(),
          isConnectedToOrder: true,
          connectedOrderId: order._id,
          connectedAt: new Date(),
          connectedBy: 'SYSTEM',
          confirmationStatus: 'confirmed',
          confirmedBy: 'SYSTEM',
          confirmedCustomerName: customerName,
          confirmedAt: new Date(),
          notes,
        });
      }

      linkedOrder = order;
      orderUpdated = true;
      console.log(`✅ C2B ${transID} attached to order ${order.orderNumber} (account ${order.paybillAccount || billRefNumber || 'n/a'})`);
    };

    try {
      const order = await findOrderForC2BPayment(billRefNumber, { amount, receipt: transID });
      if (order) {
        const alreadyHasReceipt = [order.mpesaReceiptNumber, order.mpesaPayment?.mpesaReceiptNumber, order.c2bPayment?.mpesaReceiptNumber]
          .filter(Boolean)
          .includes(transID);
        await attachReceiptAndConnect(order, order.paymentStatus === 'paid' || alreadyHasReceipt);
      }
    } catch (error) {
      console.error('Error matching C2B payment to order:', error);
    }

    // If no order was found by bill reference, try intelligent matching for till number payments
    if (!orderUpdated && (!billRefNumber || billRefNumber === '')) {
      try {
        console.log(`🔍 Attempting intelligent order matching for amount: KES ${amount}`);
        
        // Find pending orders with matching amount in the last 2 hours
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        
        const matchingOrders = await Order.find({
          $or: [
            { totalAmount: amount }, // Exact total amount match
            { remainingBalance: amount } // Exact remaining balance match (for partial payments)
          ],
          paymentStatus: { $in: ['unpaid', 'pending', 'partial'] },
          createdAt: { $gte: twoHoursAgo },
          paymentMethod: { $ne: 'mpesa_c2b' } // Avoid already processed orders
        }).sort({ createdAt: -1 }); // Most recent first

        if (matchingOrders.length === 1) {
          // Exact match found - update this order
          const matchedOrder = matchingOrders[0];
          linkedOrder = matchedOrder;
          const identityPhone =
            resolvePhoneFromOrderFields(matchedOrder) ||
            normalizeKenyaPhoneLocal(formattedPhone) ||
            undefined;
          const orderTotal = matchedOrder.totalAmount || 0;
          const currentRemainingBalance = matchedOrder.remainingBalance || orderTotal;
          const isExactPayment = amount === currentRemainingBalance;
          const isPartialPayment = amount < currentRemainingBalance && amount > 0;
          const isOverPayment = amount > currentRemainingBalance;
          
          // Calculate new remaining balance
          const newRemainingBalance = Math.max(0, currentRemainingBalance - amount);
          const isFullyPaid = newRemainingBalance === 0;
          
          // Determine payment status
          let paymentStatus = 'unpaid';
          if (isFullyPaid) {
            paymentStatus = 'paid';
          } else if (isPartialPayment || isExactPayment) {
            paymentStatus = 'partial';
          }

          // Create partial payment record
          const partialPayment = {
            amount: amount,
            date: transactionDate,
            mpesaReceiptNumber: transID,
            phoneNumber: identityPhone || originalPhone,
            method: 'mpesa_c2b' as const
          };

          // Update order with new balance and payment info
          const updateData: any = {
            remainingBalance: newRemainingBalance,
            paymentStatus: paymentStatus,
            paymentMethod: 'mpesa_c2b',
            $push: {
              partialPayments: partialPayment
            },
            $set: {
              ...(identityPhone ? { 'customer.phone': identityPhone } : {}),
              'c2bPayment': {
                transactionId: transID,
                mpesaReceiptNumber: transID,
                transactionDate: transactionDate,
                phoneNumber: identityPhone || originalPhone,
                amountPaid: amount,
                transactionType: transactionType,
                billRefNumber: billRefNumber || 'TILL_PAYMENT',
                thirdPartyTransID: thirdPartyTransID,
                orgAccountBalance: orgAccountBalance,
                customerName: [firstName, middleName, lastName].filter(Boolean).join(' '),
                paymentCompletedAt: new Date()
              }
            }
          };

          // If fully paid, also update top-level payment fields
          if (isFullyPaid) {
            updateData.amountPaid = orderTotal;
            updateData.mpesaReceiptNumber = transID;
            updateData.transactionDate = transactionDate;
            updateData.phoneNumber = identityPhone || originalPhone;
          }
          
          await Order.findByIdAndUpdate(matchedOrder._id, updateData);

          // Create M-Pesa transaction record for intelligently matched order
          try {
            const customerName = [firstName, middleName, lastName].filter(Boolean).join(' ') || matchedOrder.customer?.name || 'Unknown Customer';
            
            // Check if this transaction already exists
            const existingTransaction = await MpesaTransaction.findOne({ 
              transactionId: transID 
            });

            if (!existingTransaction) {
              const mpesaTransaction = new MpesaTransaction({
                transactionId: transID,
                mpesaReceiptNumber: transID,
                transactionDate: transactionDate,
                phoneNumber: originalPhone,
                amountPaid: amount,
                transactionType: transactionType,
                billRefNumber: billRefNumber || 'TILL_PAYMENT',
                thirdPartyTransID: thirdPartyTransID,
                orgAccountBalance: orgAccountBalance,
                customerName: customerName,
                paymentCompletedAt: new Date(),
                isConnectedToOrder: true,
                connectedOrderId: matchedOrder._id,
                connectedAt: new Date(),
                connectedBy: 'SYSTEM',
                confirmationStatus: 'confirmed',
                confirmedBy: 'SYSTEM',
                confirmedCustomerName: customerName,
                confirmedAt: new Date(),
                notes: `AUTO-CONFIRMED: C2B payment intelligently matched to order ${matchedOrder.orderNumber}. Amount: KES ${amount}. ${isFullyPaid ? 'Order fully paid.' : `Remaining balance: KES ${newRemainingBalance}`}`
              });

              await mpesaTransaction.save();
              console.log(`📝 M-Pesa transaction created for intelligently matched order ${matchedOrder.orderNumber}: ${transID} (KES ${amount})`);
            } else {
              console.log(`⚠️ Transaction ${transID} already exists in database`);
            }
          } catch (error) {
            console.error('Error creating M-Pesa transaction for intelligently matched order:', error);
          }

          orderUpdated = true;
          
          if (isFullyPaid) {
            await sendPurchaseConfirmationIfNeeded(matchedOrder._id);
            console.log(`✅ FULL payment matched to order ${matchedOrder.orderNumber}: ${transID} (KES ${amount}) - Order fully paid`);
          } else if (isExactPayment) {
            console.log(`✅ EXACT payment matched to order ${matchedOrder.orderNumber}: ${transID} (KES ${amount}) - Remaining: KES ${newRemainingBalance}`);
          } else if (isOverPayment) {
            console.log(`💰 OVERPAYMENT matched to order ${matchedOrder.orderNumber}: KES ${amount} (remaining was KES ${currentRemainingBalance}) - ${transID}`);
          } else if (isPartialPayment) {
            console.log(`⚠️ PARTIAL payment matched to order ${matchedOrder.orderNumber}: KES ${amount} - Remaining: KES ${newRemainingBalance} (${transID})`);
          }
          console.log(`📊 Match criteria: Amount=${amount}, Time window=2hrs, Customer=${[firstName, middleName, lastName].filter(Boolean).join(' ')}`);
          
        } else if (matchingOrders.length > 1) {
          // Multiple matches - log for manual review but create standalone record
          console.log(`⚠️ Multiple orders found with amount KES ${amount}:`);
          matchingOrders.forEach(order => {
            console.log(`   - ${order.orderNumber} (${order.customer.name}) - Remaining: KES ${order.remainingBalance || order.totalAmount} - ${order.createdAt}`);
          });
          console.log(`🔄 Creating standalone payment record for manual matching`);
        } else {
          console.log(`📭 No matching orders found for amount KES ${amount} in last 2 hours`);
        }
      } catch (error) {
        console.error('Error during intelligent order matching:', error);
      }
    }

    // If no order matched, create a standalone M-Pesa transaction record
    if (!orderUpdated) {
      try {
        const customerName = [firstName, middleName, lastName].filter(Boolean).join(' ') || 'Unknown Customer';
        
        // Check if this transaction already exists
        const existingTransaction = await MpesaTransaction.findOne({ 
          transactionId: transID 
        });

        if (!existingTransaction) {
          const mpesaTransaction = new MpesaTransaction({
            transactionId: transID,
            mpesaReceiptNumber: transID,
            transactionDate: transactionDate,
            phoneNumber: originalPhone,
            amountPaid: amount,
            transactionType: transactionType,
            billRefNumber: billRefNumber || 'TILL_PAYMENT',
            thirdPartyTransID: thirdPartyTransID,
            orgAccountBalance: orgAccountBalance,
            customerName: customerName,
            paymentCompletedAt: new Date(),
            isConnectedToOrder: false,
            notes: `Unmatched C2B payment. Awaiting manual connection to order.`
          });

          await mpesaTransaction.save();
          console.log(`💾 Standalone M-Pesa transaction saved: ${transID} (KES ${amount}) - ${customerName}`);
          console.log(`🔗 Transaction can be manually connected to order via admin dashboard`);
        } else {
          console.log(`⚠️ Transaction ${transID} already exists in database`);
        }
      } catch (error) {
        console.error('Error saving M-Pesa transaction:', error);
      }
    }

    // Customer records use the POS/prompt number only. Never save Safaricom hashed MSISDN.
    try {
      const mpesaName = [firstName, middleName, lastName].filter(Boolean).join(' ');
      const saved = await upsertCustomerFromPaymentContext({
        order: linkedOrder,
        mpesaMsisdn: formattedPhone,
        fallbackName: mpesaName,
        lastPaymentDate: transactionDate,
        lastPaymentAmount: amount,
        lastTransactionId: transID,
      });
      customerUpdated = !!saved;
    } catch (error) {
      console.error('Error handling customer:', error);
    }

    // Log payment processing result
    console.log(`💰 C2B Payment processed successfully:
      Transaction ID: ${transID}
      Amount: KES ${amount}
      Phone: ${formattedPhone}
      Customer: ${[firstName, middleName, lastName].filter(Boolean).join(' ')}
      Bill Ref: ${billRefNumber || 'None'}
      Order Updated: ${orderUpdated}
      Customer Updated: ${customerUpdated}
    `);

    // Always return success to M-Pesa
    return NextResponse.json({
      resultCode: '0',
      resultDesc: 'Success'
    } as C2BConfirmationResponse);

  } catch (error: any) {
    console.error('❌ C2B Confirmation error:', error);
    
    // Still return success to M-Pesa to avoid retries
    // The payment has already been processed by M-Pesa
    return NextResponse.json({
      resultCode: '0',
      resultDesc: 'Success'
    } as C2BConfirmationResponse);
  }
}

// GET endpoint - M-Pesa only sends POST requests, but we handle GET for health checks
export async function GET(request: NextRequest) {
  // Return a simple response indicating the endpoint is active
  // M-Pesa will only use POST, but this helps with testing and health checks
  return NextResponse.json({
    message: 'C2B Confirmation endpoint is active',
    method: 'GET',
    note: 'This endpoint expects POST requests from M-Pesa',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  }, { status: 200 });
} 