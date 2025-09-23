import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import MpesaTransaction from '@/lib/models/MpesaTransaction';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Payments API called');
    
    // Verify admin authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      console.log('❌ No token provided');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'superadmin')) {
      console.log('❌ Invalid token or insufficient permissions');
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('✅ Authentication successful, connecting to DB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Fetch all orders with payment information
    console.log('📦 Fetching orders from database...');
    const orders = await Order.find({})
      .select('orderNumber customer paymentStatus paymentMethod totalAmount amountPaid mpesaReceiptNumber transactionDate phoneNumber mpesaPayment c2bPayment createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();
    
    console.log(`📊 Found ${orders.length} orders in database`);

    // Also fetch M-Pesa transactions (both connected and unconnected)
    const mpesaTransactions = await MpesaTransaction.find({})
      .populate('connectedOrderId', 'orderNumber customer')
      .sort({ transactionDate: -1 })
      .lean();
    
    console.log(`📱 Found ${mpesaTransactions.length} M-Pesa transactions in database`);

    // Transform orders into payment records
    const payments = orders.map(order => {
      // Determine payment method and extract payment details
      let paymentMethod = order.paymentMethod || 'cash';
      let mpesaReceiptNumber = null;
      let transactionDate = null;
      let phoneNumber = null;
      let amountPaid = order.amountPaid;

      // Check for STK Push payment data
      if (order.mpesaPayment?.mpesaReceiptNumber) {
        paymentMethod = 'mpesa_stk';
        mpesaReceiptNumber = order.mpesaPayment.mpesaReceiptNumber;
        transactionDate = order.mpesaPayment.transactionDate;
        phoneNumber = order.mpesaPayment.phoneNumber;
        amountPaid = order.mpesaPayment.amountPaid || order.totalAmount;
      }
      // Check for top-level M-Pesa fields (backward compatibility)
      else if (order.mpesaReceiptNumber) {
        paymentMethod = 'mpesa_stk';
        mpesaReceiptNumber = order.mpesaReceiptNumber;
        transactionDate = order.transactionDate;
        phoneNumber = order.phoneNumber;
        amountPaid = order.amountPaid || order.totalAmount;
      }
      // Check for C2B payment data
      else if (order.c2bPayment?.transactionId) {
        paymentMethod = 'mpesa_c2b';
        mpesaReceiptNumber = order.c2bPayment.mpesaReceiptNumber || order.c2bPayment.transactionId;
        transactionDate = order.c2bPayment.transactionDate;
        phoneNumber = order.c2bPayment.phoneNumber;
        amountPaid = order.c2bPayment.amountPaid || order.totalAmount;
      }

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || 'Unknown Customer',
        customerPhone: order.customer?.phone || phoneNumber || 'N/A',
        customerEmail: order.customer?.email || '',
        paymentMethod,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount || 0,
        amountPaid: amountPaid || 0,
        mpesaReceiptNumber,
        transactionDate: transactionDate || order.updatedAt,
        phoneNumber,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };
    });

    // Calculate statistics
    const totalPayments = payments.length;
    const paidOrders = payments.filter(p => p.paymentStatus === 'paid').length;
    const pendingOrders = payments.filter(p => p.paymentStatus === 'pending').length;
    const totalAmount = payments
      .filter(p => p.paymentStatus === 'paid')
      .reduce((sum, p) => sum + p.totalAmount, 0);

    // Today's statistics
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todayPayments = payments.filter(p => {
      const paymentDate = new Date(p.transactionDate || p.updatedAt);
      return p.paymentStatus === 'paid' && paymentDate >= todayStart;
    });

    const todayAmount = todayPayments.reduce((sum, p) => sum + p.totalAmount, 0);

    const stats = {
      totalPayments,
      totalAmount,
      paidOrders,
      pendingOrders,
      todayPayments: todayPayments.length,
      todayAmount
    };

    // Add M-Pesa transactions to the response
    const mpesaTransactionRecords = mpesaTransactions.map(transaction => ({
      _id: transaction._id,
      orderNumber: transaction.connectedOrderId?.orderNumber || 'Unconnected',
      customerName: transaction.customerName,
      customerPhone: transaction.phoneNumber,
      customerEmail: transaction.connectedOrderId?.customer?.email || '',
      paymentMethod: transaction.transactionType === 'STK_PUSH' ? 'mpesa_stk' : 'mpesa_c2b',
      paymentStatus: transaction.isConnectedToOrder ? 'paid' : 'unconnected',
      totalAmount: transaction.connectedOrderId?.totalAmount || transaction.amountPaid,
      amountPaid: transaction.amountPaid,
      mpesaReceiptNumber: transaction.mpesaReceiptNumber,
      transactionDate: transaction.transactionDate,
      phoneNumber: transaction.phoneNumber,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      isConnectedToOrder: transaction.isConnectedToOrder,
      connectedOrderId: transaction.connectedOrderId?._id,
      transactionId: transaction.transactionId,
      notes: transaction.notes
    }));

    console.log('📈 Payment statistics:', stats);
    console.log(`✅ Returning ${payments.length} payment records and ${mpesaTransactionRecords.length} M-Pesa transactions`);

    return NextResponse.json({
      success: true,
      payments,
      mpesaTransactions: mpesaTransactionRecords,
      stats
    });

  } catch (error: any) {
    console.error('❌ Error fetching payments:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 