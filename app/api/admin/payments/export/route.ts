import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
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

    // Fetch all orders with payment information
    const orders = await Order.find({})
      .select('orderNumber customer paymentStatus paymentMethod totalAmount amountPaid mpesaReceiptNumber transactionDate phoneNumber mpesaPayment c2bPayment createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    // Transform orders into payment records for CSV
    const payments = orders.map(order => {
      // Determine payment method and extract payment details
      let paymentMethod = order.paymentMethod || 'cash';
      let mpesaReceiptNumber = '';
      let transactionDate = '';
      let phoneNumber = '';
      let amountPaid = order.amountPaid || 0;

      // Check for STK Push payment data
      if (order.mpesaPayment?.mpesaReceiptNumber) {
        paymentMethod = 'M-Pesa STK';
        mpesaReceiptNumber = order.mpesaPayment.mpesaReceiptNumber;
        transactionDate = order.mpesaPayment.transactionDate ? new Date(order.mpesaPayment.transactionDate).toISOString() : '';
        phoneNumber = order.mpesaPayment.phoneNumber || '';
        amountPaid = order.mpesaPayment.amountPaid || order.totalAmount;
      }
      // Check for top-level M-Pesa fields (backward compatibility)
      else if (order.mpesaReceiptNumber) {
        paymentMethod = 'M-Pesa STK';
        mpesaReceiptNumber = order.mpesaReceiptNumber;
        transactionDate = order.transactionDate ? new Date(order.transactionDate).toISOString() : '';
        phoneNumber = order.phoneNumber || '';
        amountPaid = order.amountPaid || order.totalAmount;
      }
      // Check for C2B payment data
      else if (order.c2bPayment?.transactionId) {
        paymentMethod = 'M-Pesa C2B';
        mpesaReceiptNumber = order.c2bPayment.mpesaReceiptNumber || order.c2bPayment.transactionId;
        transactionDate = order.c2bPayment.transactionDate ? new Date(order.c2bPayment.transactionDate).toISOString() : '';
        phoneNumber = order.c2bPayment.phoneNumber || '';
        amountPaid = order.c2bPayment.amountPaid || order.totalAmount;
      }

      return {
        'Order Number': order.orderNumber,
        'Customer Name': order.customer?.name || 'Unknown Customer',
        'Customer Phone': order.customer?.phone || phoneNumber || 'N/A',
        'Customer Email': order.customer?.email || '',
        'Payment Method': paymentMethod,
        'Payment Status': order.paymentStatus,
        'Total Amount (KES)': order.totalAmount || 0,
        'Amount Paid (KES)': amountPaid,
        'M-Pesa Receipt': mpesaReceiptNumber,
        'Transaction Date': transactionDate,
        'Payment Phone': phoneNumber,
        'Order Created': order.createdAt ? new Date(order.createdAt).toISOString() : '',
        'Last Updated': order.updatedAt ? new Date(order.updatedAt).toISOString() : ''
      };
    });

    // Create CSV content
    if (payments.length === 0) {
      return NextResponse.json({ error: 'No payments found' }, { status: 404 });
    }

    const headers = Object.keys(payments[0]);
    const csvHeader = headers.join(',');
    const csvRows = payments.map(payment => 
      headers.map(header => {
        const value = payment[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    const csvContent = [csvHeader, ...csvRows].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="econuru-payments-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error: any) {
    console.error('Error exporting payments:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 