import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Inventory from '@/lib/models/Inventory';
import InventoryMovement from '@/lib/models/InventoryMovement';
import MpesaTransaction from '@/lib/models/MpesaTransaction';
import { requireAuth, getTokenFromRequest, verifyToken } from '@/lib/auth';
import { smsService } from '@/lib/sms';
import { applyLockedInPromotion, updatePromotionStatuses } from '@/lib/promotion-utils';
import mongoose from 'mongoose';

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
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

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
}

// GET single order
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

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
}

// DELETE order
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

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
    
    // Get user ID for inventory movement records
    let userId: mongoose.Types.ObjectId | null = null;
    try {
      if (decoded && decoded.userId) {
        userId = new mongoose.Types.ObjectId(decoded.userId);
      }
    } catch (authError) {
      console.warn('Could not get user ID from token, using system user');
    }
    
    if (!userId) {
      userId = new mongoose.Types.ObjectId('000000000000000000000000'); // System user
    }

    // Get station ID from order for inventory restoration
    const orderStationId = existingOrder.station?.stationId 
      ? (typeof existingOrder.station.stationId === 'object' 
          ? existingOrder.station.stationId.toString() 
          : existingOrder.station.stationId)
      : (existingOrder.stationId ? existingOrder.stationId.toString() : null);

    // Restore inventory for products in the order before deleting
    try {
      const restoredItems: Array<{ name: string; quantity: number }> = [];
      
      for (const service of existingOrder.services || []) {
        // Check if this service is actually a product (exists in inventory)
        const inventoryItem = await Inventory.findById(service.serviceId);
        
        if (inventoryItem) {
          // This is a product, restore the stock
          const quantityToRestore = service.quantity || 0;
          
          if (quantityToRestore > 0) {
            // Check if item is assigned to the order's station (if station exists)
            if (orderStationId) {
              const isAssignedToStation = inventoryItem.stationIds.some(
                (id: mongoose.Types.ObjectId) => id.toString() === orderStationId
              );
              
              if (!isAssignedToStation) {
                console.warn(`⚠️ Product "${inventoryItem.name}" not assigned to order's station ${orderStationId}, skipping restoration`);
                continue;
              }
            }
            
            const previousStock = inventoryItem.stock;
            inventoryItem.stock += quantityToRestore;
            await inventoryItem.save();
            
            // Create inventory movement record for restoration
            try {
              const movement = new InventoryMovement({
                inventoryItem: inventoryItem._id,
                movementType: 'return',
                quantity: quantityToRestore, // Positive for addition
                previousStock: previousStock,
                newStock: inventoryItem.stock,
                reason: `Order ${existingOrder.orderNumber} deleted - inventory restored`,
                reference: existingOrder.orderNumber,
                referenceType: 'order',
                performedBy: userId,
                notes: `Order deletion: Restored ${quantityToRestore} units of ${inventoryItem.name}${orderStationId ? ` for station ${orderStationId}` : ''}`
              });
              await movement.save();
              console.log(`📝 Inventory restoration movement record created: ${movement._id}`);
            } catch (movementError) {
              console.error('Error creating inventory movement record:', movementError);
              // Don't fail the restoration if movement record creation fails
            }
            
            restoredItems.push({ name: inventoryItem.name, quantity: quantityToRestore });
            console.log(`✅ Restored ${quantityToRestore} units of "${inventoryItem.name}". Stock: ${previousStock} → ${inventoryItem.stock}`);
          }
        }
      }
      
      if (restoredItems.length > 0) {
        console.log(`📦 Inventory restored for ${restoredItems.length} product(s) from order ${existingOrder.orderNumber}:`, restoredItems);
      } else {
        console.log(`ℹ️ No products found in order ${existingOrder.orderNumber} to restore inventory`);
      }
    } catch (inventoryError) {
      console.error('Error restoring inventory during order deletion:', inventoryError);
      // Don't fail the order deletion if inventory restoration fails
      // Log the error but continue with deletion
    }
    
    // Now delete the order
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
      message: 'Order deleted successfully',
      inventoryRestored: true
    });

  } catch (error) {
    console.error('Delete order error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
} 