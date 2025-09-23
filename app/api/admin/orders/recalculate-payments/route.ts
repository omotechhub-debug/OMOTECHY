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
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    // Get all orders
    const orders = await Order.find({}).lean();
    let updatedCount = 0;
    let errors = [];

    console.log(`🔄 Starting payment recalculation for ${orders.length} orders...`);

    for (const order of orders) {
      try {
        // Find all M-Pesa transactions connected to this order
        const connectedTransactions = await MpesaTransaction.find({
          isConnectedToOrder: true,
          connectedOrderId: order._id
        }).lean();

        // Calculate total amount paid
        const totalPaid = connectedTransactions.reduce((sum, transaction) => {
          return sum + (transaction.amountPaid || 0);
        }, 0);

        // Calculate remaining balance
        const orderTotal = order.totalAmount || 0;
        const remainingBalance = Math.max(0, orderTotal - totalPaid);

        // Determine payment status
        let paymentStatus = 'unpaid';
        if (totalPaid >= orderTotal) {
          paymentStatus = 'paid';
        } else if (totalPaid > 0) {
          paymentStatus = 'partial';
        }

        // Check if status needs updating
        const statusChanged = order.paymentStatus !== paymentStatus;
        const balanceChanged = order.remainingBalance !== remainingBalance;

        if (statusChanged || balanceChanged) {
          // Update the order
          await Order.findByIdAndUpdate(order._id, {
            paymentStatus,
            remainingBalance,
            updatedAt: new Date()
          });

          updatedCount++;

          console.log(`✅ Updated order ${order.orderNumber}:`, {
            oldStatus: order.paymentStatus,
            newStatus: paymentStatus,
            oldBalance: order.remainingBalance,
            newBalance: remainingBalance,
            totalPaid,
            orderTotal,
            connectedTransactions: connectedTransactions.length
          });
        }
      } catch (error) {
        console.error(`❌ Error updating order ${order.orderNumber}:`, error);
        errors.push({
          orderNumber: order.orderNumber,
          error: error.message
        });
      }
    }

    console.log(`🎯 Payment recalculation completed: ${updatedCount} orders updated, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: `Payment status recalculation completed`,
      updatedCount,
      totalOrders: orders.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Error recalculating payment statuses:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 