import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Customer from '@/lib/models/Customer';
import { C2BValidationRequest, C2BValidationResponse } from '@/lib/mpesa';

export async function POST(request: NextRequest) {
  try {
    const validationData: C2BValidationRequest = await request.json();
    
    console.log('🔍 C2B Validation Request received:', JSON.stringify(validationData, null, 2));

    // Extract validation data
    const {
      transactionType,
      transID,
      transTime,
      transAmount,
      businessShortCode,
      billRefNumber,
      msisdn,
      firstName,
      middleName,
      lastName
    } = validationData;

    // Basic validation checks
    const amount = parseFloat(transAmount);
    
    // Check if amount is valid
    if (isNaN(amount) || amount <= 0) {
      console.log('❌ Invalid amount:', transAmount);
      return NextResponse.json({
        resultCode: 'C2B00013',
        resultDesc: 'Invalid Amount'
      } as C2BValidationResponse);
    }

    // Check if amount is too small (minimum 10 KES)
    if (amount < 10) {
      console.log('❌ Amount too small:', amount);
      return NextResponse.json({
        resultCode: 'C2B00013',
        resultDesc: 'Minimum amount is KES 10'
      } as C2BValidationResponse);
    }

    // Check if MSISDN is valid (basic check)
    if (!msisdn || msisdn.length < 10) {
      console.log('❌ Invalid phone number:', msisdn);
      return NextResponse.json({
        resultCode: 'C2B00011',
        resultDesc: 'Invalid Phone Number'
      } as C2BValidationResponse);
    }

    // Connect to database for additional validation
    await connectDB();

    // Optional: Check if billRefNumber corresponds to an existing order
    if (billRefNumber && billRefNumber !== '') {
      try {
        // Try to find an order with this reference
        const order = await Order.findOne({
          $or: [
            { orderNumber: billRefNumber },
            { _id: billRefNumber }
          ]
        });

        if (order) {
          // Check if order is already paid
          if (order.paymentStatus === 'paid') {
            console.log('❌ Order already paid:', billRefNumber);
            return NextResponse.json({
              resultCode: 'C2B00016',
              resultDesc: 'Order already paid'
            } as C2BValidationResponse);
          }

          // Check if order amount matches (with some tolerance)
          const orderAmount = order.total;
          const tolerance = 0.01; // 1 cent tolerance
          if (Math.abs(orderAmount - amount) > tolerance) {
            console.log('❌ Amount mismatch. Expected:', orderAmount, 'Received:', amount);
            return NextResponse.json({
              resultCode: 'C2B00013',
              resultDesc: `Amount should be KES ${orderAmount.toFixed(2)}`
            } as C2BValidationResponse);
          }
        }
      } catch (error) {
        console.error('Error validating order:', error);
        // Continue with validation even if order check fails
      }
    }

    // Check if customer exists and is active (optional validation)
    try {
      if (msisdn) {
        // Format phone number for lookup
        let formattedPhone = msisdn.replace(/\D/g, '');
        if (formattedPhone.startsWith('254')) {
          formattedPhone = '0' + formattedPhone.substring(3);
        }

        const customer = await Customer.findOne({
          $or: [
            { phone: msisdn },
            { phone: formattedPhone },
            { phone: '+' + msisdn }
          ]
        });

        // If customer exists but is inactive, you could reject
        // if (customer && customer.status === 'inactive') {
        //   return NextResponse.json({
        //     resultCode: 'C2B00016',
        //     resultDesc: 'Customer account inactive'
        //   });
        // }
      }
    } catch (error) {
      console.error('Error validating customer:', error);
      // Continue with validation even if customer check fails
    }

    // All validations passed
    console.log('✅ Validation passed for transaction:', transID);
    
    return NextResponse.json({
      resultCode: '0',
      resultDesc: 'Accepted',
      thirdPartyTransID: transID // Optional: use for tracking
    } as C2BValidationResponse);

  } catch (error: any) {
    console.error('❌ C2B Validation error:', error);
    
    // Return rejection on any error
    return NextResponse.json({
      resultCode: 'C2B00016',
      resultDesc: 'Validation Error'
    } as C2BValidationResponse);
  }
}

// GET endpoint for testing/health check
export async function GET() {
  return NextResponse.json({
    message: 'C2B Validation endpoint is active',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
} 