import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Inventory from '@/lib/models/Inventory';
import InventoryMovement from '@/lib/models/InventoryMovement';
import { requireAuth } from '@/lib/auth';
import { smsService } from '@/lib/sms';
import Promotion from '@/lib/models/Promotion';
import { applyLockedInPromotion, updatePromotionStatuses } from '@/lib/promotion-utils';

// GET all orders
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const orders = await Order.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new order
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const orderData = await request.json();
    
    // Validate required fields
    if (!orderData.customer?.phone || !orderData.services || orderData.services.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Customer phone and at least one service are required' 
      }, { status: 400 });
    }

    // Handle promotion logic - support both locked-in and regular promotions
    let promoCode = orderData.promoCode?.trim();
    let promoDiscount = 0;
    let promotionDetails = orderData.promotionDetails || null;
    
    // Auto-update promotion statuses first
    await updatePromotionStatuses();
    
    if (promotionDetails && promotionDetails.lockedIn) {
      // Use locked-in promotion (honors promotion even if expired/limit reached)
      console.log(`🔒 Processing locked-in promotion: ${promotionDetails.promoCode}`);
      const result = await applyLockedInPromotion(promotionDetails);
      
      if (result.success) {
        promoCode = result.promoCode;
        promoDiscount = result.promoDiscount;
        console.log(`✅ Applied locked-in promotion: ${promoCode} - Discount: Ksh ${promoDiscount}`);
      } else {
        console.warn(`⚠️ Failed to apply locked-in promotion: ${result.error}`);
        // Keep the locked-in details for future reference but don't apply discount
        promoCode = promotionDetails.promoCode;
        promoDiscount = 0;
      }
    } else if (promoCode) {
      // Regular promotion validation (for backwards compatibility)
      console.log(`🔍 Processing regular promotion: ${promoCode}`);
      const now = new Date();
      const promo = await Promotion.findOne({
        promoCode: { $regex: new RegExp(`^${promoCode}$`, 'i') },
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now }
      });
      
      if (promo) {
        // Check if usage limit is exceeded
        if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
          console.warn(`⚠️ Promotion ${promoCode} usage limit exceeded`);
          promoCode = undefined;
          promoDiscount = 0;
          promotionDetails = null;
        } else {
          // Calculate discount
          const orderTotal = orderData.totalAmount || 0;
          if (orderTotal >= promo.minOrderAmount) {
            if (promo.discountType === 'percentage') {
              promoDiscount = Math.round((orderTotal * promo.discount) / 100);
              if (promo.maxDiscount && promoDiscount > promo.maxDiscount) {
                promoDiscount = promo.maxDiscount;
              }
            } else if (promo.discountType === 'fixed') {
              promoDiscount = promo.discount;
              if (promo.maxDiscount && promoDiscount > promo.maxDiscount) {
                promoDiscount = promo.maxDiscount;
              }
            }
          }
          // Increment usageCount and update updatedAt
          promo.usageCount = (promo.usageCount || 0) + 1;
          promo.updatedAt = new Date();
          await promo.save();
          console.log(`✅ Applied regular promotion: ${promoCode} - Usage: ${promo.usageCount}/${promo.usageLimit}`);
        }
      } else {
        console.warn(`⚠️ Invalid or expired promo: ${promoCode}`);
        promoCode = undefined;
        promoDiscount = 0;
        promotionDetails = null;
      }
    }

    // Create new order
    const order = new Order({
      customer: {
        name: orderData.customer.name || '',
        phone: orderData.customer.phone,
        email: orderData.customer.email || '',
        address: orderData.customer.address || '',
      },
      services: orderData.services.map((service: any) => ({
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        quantity: service.quantity,
        price: service.price,
      })),
      location: orderData.location || 'main-branch',
      totalAmount: orderData.totalAmount || 0,
      paymentStatus: orderData.paymentStatus || 'unpaid',
      partialAmount: orderData.partialAmount || 0,
      remainingAmount: orderData.remainingAmount || 0,
      status: orderData.status || 'pending',
      orderNumber: generateOrderNumber(),
      promoCode: promoCode || '',
      promoDiscount: promoDiscount || 0,
      promotionDetails: promotionDetails || undefined,
    });

    await order.save();

    // Deduct inventory for products in the order
    try {
      for (const service of orderData.services) {
        // Check if this is a product (has serviceId that exists in inventory)
        const inventoryItem = await Inventory.findById(service.serviceId);
        if (inventoryItem) {
          // This is a product, deduct from inventory
          const previousStock = inventoryItem.stock;
          const quantityToDeduct = service.quantity;
          
          if (inventoryItem.stock < quantityToDeduct) {
            console.warn(`⚠️ Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.stock}, Required: ${quantityToDeduct}`);
            // You might want to handle this differently - either fail the order or allow overselling
            // For now, we'll allow overselling but log a warning
          }
          
          // Deduct the quantity from stock
          inventoryItem.stock = Math.max(0, inventoryItem.stock - quantityToDeduct);
          await inventoryItem.save();
          
          // Create inventory movement record
          const movement = new InventoryMovement({
            inventoryItem: inventoryItem._id,
            movementType: 'sale',
            quantity: -quantityToDeduct, // Negative for deduction
            previousStock: previousStock,
            newStock: inventoryItem.stock,
            reason: `Sold via order ${order.orderNumber}`,
            reference: order._id.toString(),
            referenceType: 'order',
            performedBy: new mongoose.Types.ObjectId(), // You might want to get this from auth
            notes: `Order: ${order.orderNumber}, Customer: ${orderData.customer.name || orderData.customer.phone}`
          });
          await movement.save();
          
          console.log(`📦 Inventory updated for ${inventoryItem.name}: -${quantityToDeduct} units. New stock: ${inventoryItem.stock}`);
        }
      }
    } catch (inventoryError) {
      console.error('Error updating inventory:', inventoryError);
      // Don't fail the order creation if inventory update fails
      // You might want to handle this differently based on your business requirements
    }

    // Send SMS confirmation
    try {
      const smsResponse = await smsService.sendBookingConfirmation(order);
      console.log('SMS sent successfully:', smsResponse);
      
      // Update order with SMS transaction ID
      order.smsTransactionId = smsResponse.transactionId;
      await order.save();
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      // Don't fail the order creation if SMS fails
    }

    // Send admin notification SMS
    try {
      await smsService.sendAdminNewOrderNotification(order);
      console.log('Admin SMS sent successfully');
    } catch (adminSmsError) {
      console.error('Admin SMS sending failed:', adminSmsError);
      // Don't fail the order creation if admin SMS fails
    }

    return NextResponse.json({
      success: true,
      order,
      message: 'Order created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Generate unique order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
} 