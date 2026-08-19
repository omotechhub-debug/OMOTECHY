import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { C2BConfirmationRequest, C2BConfirmationResponse } from '@/lib/mpesa';
import { normalizeKenyaPhoneLocal, resolvePhoneFromOrderFields } from '@/lib/phone-utils';
import { upsertCustomerFromPaymentContext } from '@/lib/upsert-customer';
import { findOrderForC2BPayment } from '@/lib/paybill-account';

export async function POST(request: NextRequest) {
  try {
    const confirmationData: C2BConfirmationRequest = await request.json();
    
    console.log('💰 C2B Confirmation Request received:', JSON.stringify(confirmationData, null, 2));

    // Extract confirmation data
    const {
      transactionType,
      transID,
      transTime,
      transAmount,
      businessShortCode,
      billRefNumber,
      orgAccountBalance,
      thirdPartyTransID,
      msisdn,
      firstName,
      middleName,
      lastName
    } = confirmationData;

    const amount = parseFloat(transAmount);
    
    // Connect to database
    await connectDB();

    // Save phone number exactly as received from Safaricom (preserve encrypted/hashed format)
    const originalPhone = msisdn || 'Unknown';
    console.log(`📱 C2B - Phone number received from Safaricom: ${originalPhone}`);
    
    // For customer search/matching, create a formatted version if possible
    let formattedPhone = originalPhone;
    if (msisdn && msisdn.replace && typeof msisdn === 'string' && !msisdn.includes('e') && msisdn.length < 20) {
      formattedPhone = msisdn.replace(/\D/g, '');
      if (formattedPhone.startsWith('254')) {
        formattedPhone = '0' + formattedPhone.substring(3);
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

    // Try to find and update existing order
    if (billRefNumber && billRefNumber !== '') {
      try {
        const order = await findOrderForC2BPayment(billRefNumber, { amount, receipt: transID });

        if (order) {
          linkedOrder = order;
          const identityPhone =
            resolvePhoneFromOrderFields(order) ||
            normalizeKenyaPhoneLocal(formattedPhone) ||
            undefined;
          await Order.findByIdAndUpdate(order._id, {
            $set: {
              paymentStatus: 'paid',
              paymentMethod: order.paymentMethod === 'mpesa_stk' ? 'mpesa_stk' : 'mpesa_c2b',
              mpesaReceiptNumber: transID,
              transactionDate,
              remainingBalance: 0,
              remainingAmount: 0,
              amountPaid: order.totalAmount || amount,
              ...(identityPhone ? { 'customer.phone': identityPhone, phoneNumber: identityPhone } : {}),
              c2bPayment: {
                transactionId: transID,
                mpesaReceiptNumber: transID,
                transactionDate: transactionDate,
                phoneNumber: identityPhone || originalPhone,
                amountPaid: amount,
                transactionType: transactionType,
                billRefNumber: billRefNumber || order.paybillAccount || '',
                thirdPartyTransID: thirdPartyTransID,
                orgAccountBalance: orgAccountBalance,
                customerName: [firstName, middleName, lastName].filter(Boolean).join(' '),
                paymentCompletedAt: new Date()
              },
              'mpesaPayment.mpesaReceiptNumber': transID,
              'mpesaPayment.transactionDate': transactionDate,
              'mpesaPayment.amountPaid': amount,
              'pendingMpesaPayment.status': 'completed',
            }
          });

          orderUpdated = true;
          console.log(`✅ Order ${order.orderNumber} updated with C2B payment: ${transID}`);
        }
      } catch (error) {
        console.error('Error updating order:', error);
      }
    }

    // Never create a client from Safaricom's hashed MSISDN. Use the POS/prompt number on the order.
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

    // If no order was found, skip creating a client/order from a hashed M-Pesa MSISDN.
    if (!orderUpdated && !billRefNumber) {
      const identityPhone = normalizeKenyaPhoneLocal(formattedPhone);
      if (!identityPhone) {
        console.log('Skipping standalone C2B order — Safaricom sent a hashed/invalid MSISDN');
      } else {
      try {
        // Create a new order for this standalone payment
        const orderNumber = `C2B-${Date.now()}`;
        const customerName = [firstName, middleName, lastName].filter(Boolean).join(' ') || 'C2B Customer';
        
        const newOrder = new Order({
          orderNumber: orderNumber,
          customer: {
            name: customerName,
            phone: identityPhone,
            email: '',
          },
          services: [{
            name: 'C2B Payment',
            price: amount,
            quantity: 1
          }],
          subtotal: amount,
          total: amount,
          paymentMethod: 'mpesa_c2b',
          paymentStatus: 'paid',
          status: 'confirmed',
          c2bPayment: {
            transactionId: transID,
            mpesaReceiptNumber: transID,
            transactionDate: transactionDate,
            phoneNumber: originalPhone,
            amountPaid: amount,
            transactionType: transactionType,
            billRefNumber: billRefNumber || '',
            thirdPartyTransID: thirdPartyTransID,
            orgAccountBalance: orgAccountBalance,
            customerName: customerName,
            paymentCompletedAt: new Date()
          },
          notes: `Standalone C2B payment. Receipt: ${transID}`
        });

        await newOrder.save();
        console.log(`✅ Standalone C2B payment order created: ${orderNumber}`);
      } catch (error) {
        console.error('Error creating standalone payment order:', error);
      }
      }
    }

    // Log success
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

// GET endpoint for testing/health check
export async function GET() {
  return NextResponse.json({
    message: 'C2B Confirmation endpoint is active',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
} 