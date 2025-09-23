import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Customer from '@/lib/models/Customer';
import { C2BConfirmationRequest, C2BConfirmationResponse } from '@/lib/mpesa';

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

    // Try to find and update existing order
    if (billRefNumber && billRefNumber !== '') {
      try {
        const order = await Order.findOne({
          $or: [
            { orderNumber: billRefNumber },
            { _id: billRefNumber }
          ]
        });

        if (order) {
          // Update order with payment details
          await Order.findByIdAndUpdate(order._id, {
            paymentStatus: 'paid',
            paymentMethod: 'mpesa_c2b',
            $set: {
              'c2bPayment': {
                transactionId: transID,
                mpesaReceiptNumber: transID, // M-Pesa receipt is the transID for C2B
                transactionDate: transactionDate,
                phoneNumber: originalPhone,
                amountPaid: amount,
                transactionType: transactionType,
                billRefNumber: billRefNumber,
                thirdPartyTransID: thirdPartyTransID,
                orgAccountBalance: orgAccountBalance,
                customerName: [firstName, middleName, lastName].filter(Boolean).join(' '),
                paymentCompletedAt: new Date()
              }
            }
          });

          orderUpdated = true;
          console.log(`✅ Order ${order.orderNumber} updated with C2B payment: ${transID}`);
        }
      } catch (error) {
        console.error('Error updating order:', error);
      }
    }

    // Try to find or create customer
    try {
      let customer = await Customer.findOne({
        $or: [
          { phone: msisdn },
          { phone: formattedPhone },
          { phone: '+' + msisdn }
        ]
      });

      if (customer) {
        // Update existing customer's last payment
        await Customer.findByIdAndUpdate(customer._id, {
          $set: {
            lastPaymentDate: transactionDate,
            lastPaymentAmount: amount,
            lastTransactionId: transID
          }
        });
        customerUpdated = true;
        console.log(`✅ Customer ${customer.name} updated with payment info`);
      } else if (firstName || lastName) {
        // Create new customer if we have name information
        const customerName = [firstName, middleName, lastName].filter(Boolean).join(' ');
        
        if (customerName.trim()) {
          customer = new Customer({
            name: customerName,
            phone: formattedPhone,
            email: '', // Will be updated when they register
            createdViaPayment: true,
            lastPaymentDate: transactionDate,
            lastPaymentAmount: amount,
            lastTransactionId: transID,
            totalOrders: orderUpdated ? 1 : 0
          });

          await customer.save();
          customerUpdated = true;
          console.log(`✅ New customer created: ${customerName} (${formattedPhone})`);
        }
      }
    } catch (error) {
      console.error('Error handling customer:', error);
    }

    // If no order was found, create a standalone payment record
    if (!orderUpdated && !billRefNumber) {
      try {
        // Create a new order for this standalone payment
        const orderNumber = `C2B-${Date.now()}`;
        const customerName = [firstName, middleName, lastName].filter(Boolean).join(' ') || 'C2B Customer';
        
        const newOrder = new Order({
          orderNumber: orderNumber,
          customerName: customerName,
          customerPhone: formattedPhone,
          customerEmail: '',
          services: [{
            name: 'C2B Payment',
            price: amount,
            quantity: 1
          }],
          subtotal: amount,
          total: amount,
          paymentMethod: 'mpesa_c2b',
          paymentStatus: 'paid',
          status: 'pending', // Admin will need to process this
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