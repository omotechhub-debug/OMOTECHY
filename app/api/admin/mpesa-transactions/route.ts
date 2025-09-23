import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import MpesaTransaction from '@/lib/models/MpesaTransaction';
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

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, unconnected, connected

    let query = {};
    if (filter === 'unconnected') {
      query = { isConnectedToOrder: false };
    } else if (filter === 'connected') {
      query = { isConnectedToOrder: true };
    }
    // Note: We're showing ALL transactions regardless of STK success status

    // Fetch M-Pesa transactions
    const transactions = await MpesaTransaction.find(query)
      .populate('connectedOrderId', 'orderNumber customer paymentStatus')
      .sort({ transactionDate: -1 })
      .lean();

    // Get statistics
    const stats = {
      total: await MpesaTransaction.countDocuments(),
      unconnected: await MpesaTransaction.countDocuments({ isConnectedToOrder: false }),
      connected: await MpesaTransaction.countDocuments({ isConnectedToOrder: true }),
      totalAmount: await MpesaTransaction.aggregate([
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]).then(result => result[0]?.total || 0),
      unconnectedAmount: await MpesaTransaction.aggregate([
        { $match: { isConnectedToOrder: false } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]).then(result => result[0]?.total || 0)
    };

    // Also fetch recent pending orders for connection suggestions
    const pendingOrders = await Order.find({
      paymentStatus: { $in: ['unpaid', 'pending'] }
    })
    .select('_id orderNumber customer totalAmount createdAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

    return NextResponse.json({
      success: true,
      transactions,
      stats,
      pendingOrders
    });

  } catch (error: any) {
    console.error('Error fetching M-Pesa transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const {
      transactionId,
      mpesaReceiptNumber,
      transactionDate,
      phoneNumber,
      amountPaid,
      customerName,
      transactionType,
      notes
    } = await request.json();

    // Validate required fields
    if (!transactionId || !amountPaid || !customerName) {
      return NextResponse.json({ 
        error: 'Transaction ID, amount paid, and customer name are required' 
      }, { status: 400 });
    }

    await connectDB();

    // Check if transaction ID already exists
    const existingTransaction = await MpesaTransaction.findOne({ transactionId });
    if (existingTransaction) {
      return NextResponse.json({ 
        error: 'Transaction ID already exists' 
      }, { status: 400 });
    }

    // Create new transaction
    const newTransaction = new MpesaTransaction({
      transactionId,
      mpesaReceiptNumber: mpesaReceiptNumber || transactionId, // Use transaction ID as receipt number if not provided
      transactionDate: new Date(transactionDate),
      phoneNumber: phoneNumber || 'Unknown',
      amountPaid: parseFloat(amountPaid),
      transactionType: transactionType || 'C2B',
      customerName,
      paymentCompletedAt: new Date(),
      notes: notes || `Manually added by ${decoded.email || decoded.name || 'admin'}`,
      isConnectedToOrder: false,
      confirmationStatus: 'confirmed', // Mark as confirmed since admin is adding it
      confirmedBy: decoded.email || decoded.name || 'admin',
      confirmedAt: new Date()
    });

    await newTransaction.save();

    console.log(`📝✅ Manual M-Pesa transaction added by ${decoded.email}:`, {
      transactionId,
      customerName,
      amountPaid,
      phoneNumber
    });

    return NextResponse.json({
      success: true,
      message: 'M-Pesa transaction added successfully',
      transaction: {
        id: newTransaction._id,
        transactionId: newTransaction.transactionId,
        customerName: newTransaction.customerName,
        amountPaid: newTransaction.amountPaid
      }
    });

  } catch (error: any) {
    console.error('Error adding M-Pesa transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 