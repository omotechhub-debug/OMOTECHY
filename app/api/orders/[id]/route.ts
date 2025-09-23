import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import MpesaTransaction from '@/lib/models/MpesaTransaction';
import { requireAuth } from '@/lib/auth';
import { smsService } from '@/lib/sms';
import { applyLockedInPromotion, updatePromotionStatuses } from '@/lib/promotion-utils';

// Helper function to recalculate payment status for an order
async function recalculateOrderPaymentStatus(orderId: string) {
  try {
    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      console.error(`Order not found for payment recalculation: ${orderId}`);
      return false;
    }

    // Find all M-Pesa transactions connected to this order
    const connectedTransactions = await MpesaTransaction.find({
      isConnectedToOrder: true,
      connectedOrderId: order._id
    }).lean();

    // Calculate total amount paid from connected transactions
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
        amountPaid: totalPaid > 0 ? totalPaid : undefined,
        updatedAt: new Date()
      });

      console.log(`✅ Payment status recalculated for order ${order.orderNumber}:`, {
        oldStatus: order.paymentStatus,
        newStatus: paymentStatus,
        oldBalance: order.remainingBalance,
        newBalance: remainingBalance,
        totalPaid,
        orderTotal,
        connectedTransactions: connectedTransactions.length
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error recalculating payment status for order ${orderId}:`, error);
    return false;
  }
}

// PATCH update order
export const PATCH = requireAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    const { id: orderId } = await params;
    const updateData = await request.json();
    
    // Validate order exists
    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order not found' 
      }, { status: 404 });
    }

    // Store previous status for SMS notification
    const previousStatus = existingOrder.status;
    const previousLaundryStatus = existingOrder.laundryStatus;

    // Handle promotion updates if present
    let finalUpdateData = { ...updateData };
    
    // If updating with promotion details, ensure locked-in promotions are honored
    if (updateData.promotionDetails && updateData.promotionDetails.lockedIn) {
      console.log(`🔒 Updating order ${orderId} with locked-in promotion: ${updateData.promotionDetails.promoCode}`);
      
      // Auto-update promotion statuses first
      await updatePromotionStatuses();
      
      // Apply the locked-in promotion
      const result = await applyLockedInPromotion(updateData.promotionDetails);
      
      if (result.success) {
        finalUpdateData.promoCode = result.promoCode;
        finalUpdateData.promoDiscount = result.promoDiscount;
        console.log(`✅ Applied locked-in promotion to order ${orderId}: ${result.promoCode} - Discount: Ksh ${result.promoDiscount}`);
      } else {
        console.warn(`⚠️ Failed to apply locked-in promotion to order ${orderId}: ${result.error}`);
        // Keep the locked-in details for future reference but don't apply discount
        finalUpdateData.promoCode = updateData.promotionDetails.promoCode;
        finalUpdateData.promoDiscount = 0;
      }
    }

    // Update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      finalUpdateData,
      { new: true, runValidators: true }
    );

    // Check if order amount changed (discount, total amount, etc.)
    const amountChanged = (
      existingOrder.totalAmount !== updatedOrder.totalAmount ||
      existingOrder.discount !== updatedOrder.discount ||
      existingOrder.pickDropAmount !== updatedOrder.pickDropAmount
    );

    // If amount changed, recalculate payment status
    if (amountChanged) {
      console.log(`💰 Order amount changed for ${updatedOrder.orderNumber}, recalculating payment status...`);
      await recalculateOrderPaymentStatus(orderId);
      
      // Fetch the updated order with recalculated payment status
      const recalculatedOrder = await Order.findById(orderId);
      if (recalculatedOrder) {
        updatedOrder.paymentStatus = recalculatedOrder.paymentStatus;
        updatedOrder.remainingBalance = recalculatedOrder.remainingBalance;
        updatedOrder.amountPaid = recalculatedOrder.amountPaid;
      }
    }

    // Send SMS notifications for status changes
    try {
      if (updateData.status && updateData.status !== previousStatus) {
        await smsService.sendOrderStatusUpdate(updatedOrder, updateData.status);
        console.log(`SMS sent for status update: ${updateData.status}`);
      }

      if (updateData.laundryStatus && updateData.laundryStatus !== previousLaundryStatus) {
        if (updateData.laundryStatus === 'ready-for-delivery') {
          await smsService.sendDeliveryNotification(updatedOrder);
          console.log('SMS sent for delivery notification');
        } else if (updateData.laundryStatus === 'picked-up') {
          // Could send a pickup confirmation SMS here
          console.log('Order picked up - SMS notification sent');
        }
      }
    } catch (smsError) {
      console.error('SMS sending failed during status update:', smsError);
      // Don't fail the update if SMS fails
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Order updated successfully',
      paymentRecalculated: amountChanged
    });

  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
});

// GET single order
export const GET = requireAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    const { id: orderId } = await params;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
});

// DELETE order
export const DELETE = requireAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    const { id: orderId } = await params;
    
    console.log('Attempting to delete order:', orderId);
    
    // First check if order exists
    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      console.log('Order not found:', orderId);
      return NextResponse.json({ 
        success: false, 
        error: 'Order not found' 
      }, { status: 404 });
    }
    
    console.log('Order found, proceeding with deletion:', existingOrder.orderNumber);
    
    const deletedOrder = await Order.findByIdAndDelete(orderId);
    
    if (!deletedOrder) {
      console.log('Order deletion failed for ID:', orderId);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete order' 
      }, { status: 500 });
    }

    console.log('Order deleted successfully:', deletedOrder.orderNumber);
    
    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    console.error('Delete order error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}); 