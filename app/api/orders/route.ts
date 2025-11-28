import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Inventory from '@/lib/models/Inventory';
import InventoryMovement from '@/lib/models/InventoryMovement';
import User from '@/lib/models/User';
import Station from '@/lib/models/Station';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { smsService } from '@/lib/sms';
import Promotion from '@/lib/models/Promotion';
import { applyLockedInPromotion, updatePromotionStatuses } from '@/lib/promotion-utils';

// GET all orders
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    console.log('Fetching orders...');
    
    // First try without populate to see if basic query works
    const orders = await Order.find({}).sort({ createdAt: -1 });
    console.log(`Found ${orders.length} orders`);
    
    // Log details of each order for debugging
    orders.forEach((order, index) => {
      console.log(`Order ${index + 1}:`, {
        orderNumber: order.orderNumber,
        hasStation: !!(order.station?.stationId && order.station?.name),
        hasCreator: !!(order.createdBy?.userId && order.createdBy?.name),
        station: order.station,
        createdBy: order.createdBy,
        createdAt: order.createdAt
      });
    });
    
    // If no orders found, check if there are any orders at all
    if (orders.length === 0) {
      console.log('No orders found in database. Checking if Order model is working...');
      const totalOrders = await Order.countDocuments({});
      console.log(`Total orders in database: ${totalOrders}`);
      
      // Try to find the specific order that was just created
      const recentOrder = await Order.findOne({}).sort({ createdAt: -1 });
      if (recentOrder) {
        console.log('Most recent order found:', {
          orderNumber: recentOrder.orderNumber,
          createdAt: recentOrder.createdAt,
          hasStation: !!(recentOrder.station?.stationId && recentOrder.station?.name),
          hasCreator: !!(recentOrder.createdBy?.userId && recentOrder.createdBy?.name),
          station: recentOrder.station,
          createdBy: recentOrder.createdBy
        });
      } else {
        console.log('No recent order found');
      }
      
      // Check if there are any orders without station/creator info
      const ordersWithoutStation = await Order.find({ 
        $or: [
          { 'station.stationId': { $exists: false } },
          { 'station.stationId': null },
          { 'createdBy.userId': { $exists: false } },
          { 'createdBy.userId': null }
        ]
      });
      console.log(`Orders without station/creator info: ${ordersWithoutStation.length}`);
      if (ordersWithoutStation.length > 0) {
        ordersWithoutStation.forEach((order, index) => {
          console.log(`Order without station/creator ${index + 1}:`, {
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            station: order.station,
            createdBy: order.createdBy
          });
        });
      }
    }
    
    // Try to populate the fields, but don't fail if it doesn't work
    try {
      console.log('Attempting to populate orders...');
      const populatedOrders = await Order.find({})
        .populate('createdBy.userId', 'name email role')
        .populate('station.stationId', 'name location')
        .sort({ createdAt: -1 });
      console.log(`Successfully populated ${populatedOrders.length} orders`);
      
      // Log each populated order
      populatedOrders.forEach((order, index) => {
        console.log(`Populated Order ${index + 1}:`, {
          orderNumber: order.orderNumber,
          hasStation: !!(order.station?.stationId && order.station?.name),
          hasCreator: !!(order.createdBy?.userId && order.createdBy?.name),
          station: order.station,
          createdBy: order.createdBy,
          createdAt: order.createdAt
        });
      });
      
      // Transform populated data to match frontend expectations
      const transformedOrders = populatedOrders.map(order => {
        // Transform createdBy structure
        let createdBy = order.createdBy;
        if (createdBy && createdBy.userId && typeof createdBy.userId === 'object') {
          // If userId was populated, extract the data
          createdBy = {
            userId: createdBy.userId._id || createdBy.userId,
            name: createdBy.userId.name || createdBy.name,
            role: createdBy.userId.role || createdBy.role
          };
        }
        
        // Transform station structure
        let station = order.station;
        if (station && station.stationId && typeof station.stationId === 'object') {
          // If stationId was populated, extract the data
          station = {
            stationId: station.stationId._id || station.stationId,
            name: station.stationId.name || station.name,
            location: station.stationId.location || station.location
          };
        }
        
        return {
          ...order.toObject(),
          createdBy,
          station
        };
      });
      
      // Filter out orders without complete station and creator information
      const validOrders = transformedOrders.filter(order => {
        const hasStation = order.station?.stationId && order.station?.name;
        const hasCreator = order.createdBy?.userId && order.createdBy?.name;
        const isValid = hasStation && hasCreator;
        
        if (!isValid) {
          console.log('Filtering out order without station/creator info:', {
            orderNumber: order.orderNumber,
            hasStation,
            hasCreator,
            station: order.station,
            createdBy: order.createdBy
          });
        }
        
        return isValid;
      });
      
      console.log(`Valid orders with station and creator info: ${validOrders.length}`);
      console.log(`Total orders before filtering: ${populatedOrders.length}`);
      console.log(`Orders filtered out: ${populatedOrders.length - validOrders.length}`);
      
      return NextResponse.json({ success: true, orders: validOrders });
    } catch (populateError) {
      console.warn('Populate failed, returning orders without populated fields:', populateError);
      
      // Filter out orders without basic station and creator info
      const validOrders = orders.filter(order => {
        const hasStation = order.station?.stationId && order.station?.name;
        const hasCreator = order.createdBy?.userId && order.createdBy?.name;
        return hasStation && hasCreator;
      });
      
      console.log(`Valid orders (unpopulated): ${validOrders.length}`);
      
      // Transform unpopulated data to match frontend expectations
      const transformedOrders = validOrders.map(order => ({
        ...order.toObject(),
        createdBy: order.createdBy,
        station: order.station
      }));
      
      return NextResponse.json({ success: true, orders: transformedOrders });
    }
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST create new order
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Get the authenticated user
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access token required' 
      }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or expired token' 
      }, { status: 401 });
    }
    
    console.log('🔍 Token decoded successfully:', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });

    // Get user details from database
    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
      console.log('❌ User not found for ID:', decoded.userId);
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    console.log('🔍 User found in database:', {
      id: currentUser._id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      stationId: currentUser.stationId,
      managedStations: currentUser.managedStations
    });
    
    console.log('🔍 Current user from database:', {
      id: currentUser._id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      stationId: currentUser.stationId,
      managedStations: currentUser.managedStations
    });
    
    console.log('Current user for order creation:', {
      id: currentUser._id,
      name: currentUser.name,
      role: currentUser.role,
      stationId: currentUser.stationId,
      managedStations: currentUser.managedStations
    });
    
    // Check if user has permission to create orders
    // Allow superadmin, manager, admin, and regular users (for shop orders)
    if (!['superadmin', 'manager', 'admin', 'user'].includes(currentUser.role)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient permissions to create orders.' 
      }, { status: 403 });
    }
    
    // For regular users (shop customers), allow order creation without station requirement
    const isShopCustomer = currentUser.role === 'user'
    
    const orderData = await request.json();
    
    // Validate required fields
    if (!orderData.customer?.phone || !orderData.services || orderData.services.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Customer phone and at least one service are required' 
      }, { status: 400 });
    }

    // For shop customers (regular users), skip station requirement
    // For admin/manager/superadmin, station is required
    if (!isShopCustomer) {
      if (!currentUser.stationId && (!currentUser.managedStations || currentUser.managedStations.length === 0)) {
        return NextResponse.json({ 
          success: false, 
          error: 'User must be assigned to a station to create orders' 
        }, { status: 400 });
      }
    }

    // Get user's station information
    let stationInfo = null;
    console.log('🔍 Checking station assignment for user:', {
      role: currentUser.role,
      stationId: currentUser.stationId,
      managedStations: currentUser.managedStations,
      orderDataStationId: orderData.stationId
    });
    console.log('🔍 User stationId type:', typeof currentUser.stationId);
    console.log('🔍 User stationId value:', currentUser.stationId);
    console.log('🔍 User managedStations type:', typeof currentUser.managedStations);
    console.log('🔍 User managedStations value:', currentUser.managedStations);
    
    // For shop customers, try to get a default station or use the first available station
    if (isShopCustomer) {
      // For shop orders, try to find a default station or use the first active station
      try {
        const defaultStation = await Station.findOne({ isActive: true }).sort({ createdAt: 1 });
        if (defaultStation) {
          stationInfo = {
            stationId: defaultStation._id,
            name: defaultStation.name,
            location: defaultStation.location
          };
          console.log('✅ Using default station for shop order:', stationInfo);
        } else {
          console.warn('⚠️ No active station found, creating order without station');
          // Allow order creation without station for shop customers
        }
      } catch (stationError) {
        console.error('❌ Error fetching default station for shop order:', stationError);
        // Allow order creation without station for shop customers
      }
    } else if ((currentUser.role === 'manager' || currentUser.role === 'admin') && currentUser.stationId) {
      console.log('🔍 User has stationId, looking up station:', currentUser.stationId);
      try {
        const station = await Station.findById(currentUser.stationId);
        console.log('🔍 Station lookup result:', station ? 'Found' : 'Not found');
        if (station) {
          stationInfo = {
            stationId: station._id,
            name: station.name,
            location: station.location
          };
          console.log('✅ Found station for user:', stationInfo);
        } else {
          console.log('❌ Station not found for ID:', currentUser.stationId);
        }
      } catch (stationError) {
        console.error('❌ Error fetching station info:', stationError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch station information' 
        }, { status: 500 });
      }
    } else if (currentUser.managedStations && currentUser.managedStations.length > 0) {
      console.log('🔍 User has managedStations, using first one:', currentUser.managedStations[0]);
      // If user manages multiple stations, use the first one or the one specified in orderData
      try {
        const stationId = orderData.stationId || currentUser.managedStations[0];
        console.log('🔍 Looking up station for managedStations:', stationId);
        const station = await Station.findById(stationId);
        console.log('🔍 Station lookup result for managedStations:', station ? 'Found' : 'Not found');
        if (station) {
          stationInfo = {
            stationId: station._id,
            name: station.name,
            location: station.location
          };
          console.log('✅ Found station for managedStations:', stationInfo);
        } else {
          console.log('❌ Station not found for managedStations ID:', stationId);
        }
      } catch (stationError) {
        console.error('❌ Error fetching station info:', stationError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch station information' 
        }, { status: 500 });
      }
    } else if (!isShopCustomer) {
      // Only require station for admin/manager/superadmin, not for shop customers
      console.log('❌ User has no station assignment');
      return NextResponse.json({ 
        success: false, 
        error: 'User must be assigned to a station to create orders' 
      }, { status: 400 });
    }
    
    // Validate that we have station information (only required for admin/manager, optional for shop customers)
    if (!stationInfo && !isShopCustomer) {
      console.log('❌ No station information found');
      return NextResponse.json({ 
        success: false, 
        error: 'Station information is required to create orders' 
      }, { status: 400 });
    }
    
    console.log('✅ Final station info:', stationInfo);

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

    // Calculate remaining balance for partial payments
    const totalAmount = orderData.totalAmount || 0;
    const partialAmount = orderData.partialAmount || 0;
    const remainingBalance = orderData.paymentStatus === 'partial' 
      ? Math.max(0, totalAmount - partialAmount)
      : totalAmount;

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
      totalAmount: totalAmount,
      paymentStatus: orderData.paymentStatus || 'unpaid',
      partialAmount: partialAmount,
      remainingAmount: orderData.remainingAmount || 0,
      remainingBalance: remainingBalance,
      status: orderData.status || 'pending',
      orderNumber: generateOrderNumber(),
      promoCode: promoCode || '',
      promoDiscount: promoDiscount || 0,
      promotionDetails: promotionDetails || undefined,
      // Add creator and station information
      createdBy: {
        userId: currentUser._id,
        name: currentUser.name,
        role: currentUser.role,
      },
      station: stationInfo, // This might be null if no station is assigned
    });

    // Validate that order has required fields before saving
    console.log('🔍 Final validation - Order fields:', {
      hasCreatedBy: !!order.createdBy,
      hasStation: !!order.station,
      createdBy: order.createdBy,
      station: order.station,
      stationInfo: stationInfo,
      isShopCustomer: isShopCustomer
    });
    
    // For shop customers, station is optional. For admin/manager, station is required.
    if (!order.createdBy || (!order.station && !isShopCustomer)) {
      console.error('❌ Order missing required fields:', {
        hasCreatedBy: !!order.createdBy,
        hasStation: !!order.station,
        createdBy: order.createdBy,
        station: order.station,
        stationInfo: stationInfo
      });
      return NextResponse.json({ 
        success: false, 
        error: 'Order creation failed: Missing required creator or station information' 
      }, { status: 500 });
    }

    console.log('Creating order with data:', {
      orderNumber: order.orderNumber,
      customer: order.customer,
      totalAmount: order.totalAmount,
      createdBy: order.createdBy,
      station: order.station,
      services: order.services
    });

    await order.save();
    console.log('✅ Order saved successfully:', order.orderNumber);
    
    // Verify the saved order has the correct data
    const savedOrder = await Order.findById(order._id);
    console.log('✅ Verified saved order:', {
      orderNumber: savedOrder.orderNumber,
      createdBy: savedOrder.createdBy,
      station: savedOrder.station,
      hasStation: !!(savedOrder.station?.stationId && savedOrder.station?.name),
      hasCreator: !!(savedOrder.createdBy?.userId && savedOrder.createdBy?.name)
    });
    
    // Additional debugging - check if the order object before saving had the data
    console.log('🔍 Order object before saving:', {
      orderNumber: order.orderNumber,
      createdBy: order.createdBy,
      station: order.station,
      hasStation: !!(order.station?.stationId && order.station?.name),
      hasCreator: !!(order.createdBy?.userId && order.createdBy?.name)
    });

    // Note: Inventory reduction is now handled by the POS page's reduceInventory function
    // to ensure proper station-specific inventory management and avoid double reduction
    console.log('ℹ️ Inventory reduction skipped in order API - handled by POS page');

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