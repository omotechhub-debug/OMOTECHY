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
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';
import { confirmExistingPaidPendingOrders } from '@/lib/order-auto-confirm';
import { upsertCustomerFromPromptedPhone } from '@/lib/upsert-customer';

const SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  orderNumber: 'orderNumber',
  customerName: 'customer.name',
  totalAmount: 'totalAmount',
  status: 'status',
};

const LIST_EXCLUSIONS = '-pendingMpesaPayment -c2bPayment.orgAccountBalance';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toIdString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in (value as object)) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

function serializeOrder(order: any) {
  const createdBy = order.createdBy
    ? {
        userId: toIdString(order.createdBy.userId) || order.createdBy.userId,
        name: order.createdBy.name,
        role: order.createdBy.role,
      }
    : order.createdBy;

  const station = order.station
    ? {
        stationId: toIdString(order.station.stationId) || order.station.stationId,
        name: order.station.name,
        location: order.station.location,
      }
    : order.station;

  return {
    ...order,
    _id: toIdString(order._id) || order._id,
    createdBy,
    station,
  };
}

async function buildOrdersQuery(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const search = (searchParams.get('search') || '').trim();
  const status = searchParams.get('status') || 'all';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const query: Record<string, unknown> = {
    'station.stationId': { $exists: true, $ne: null },
    'station.name': { $exists: true, $nin: [null, ''] },
    'createdBy.userId': { $exists: true, $ne: null },
    'createdBy.name': { $exists: true, $nin: [null, ''] },
  };

  const token = getTokenFromRequest(request);
  const decoded = token ? verifyToken(token) : null;

  if (decoded?.role === 'manager') {
    const userDoc = await User.findById(decoded.userId).select('stationId managedStations').lean();
    const stationId = userDoc?.stationId ?? userDoc?.managedStations?.[0];
    if (stationId) {
      const stationIdStr = String(stationId);
      query.$or = [
        { 'station.stationId': stationIdStr },
        ...(mongoose.Types.ObjectId.isValid(stationIdStr)
          ? [{ 'station.stationId': new mongoose.Types.ObjectId(stationIdStr) }]
          : []),
      ];
    }
  }

  const scopeQuery = { ...query };

  if (status && status !== 'all') {
    query.status = status;
  }

  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt.$gte = new Date(from);
    if (to) createdAt.$lte = new Date(to);
    query.createdAt = createdAt;
  }

  if (search) {
    const escaped = escapeRegex(search);
    query.$and = [
      {
        $or: [
          { orderNumber: { $regex: escaped, $options: 'i' } },
          { 'customer.name': { $regex: escaped, $options: 'i' } },
          { 'customer.phone': { $regex: escaped, $options: 'i' } },
          { 'customer.email': { $regex: escaped, $options: 'i' } },
        ],
      },
    ];
  }

  const sortBy = SORT_FIELDS[searchParams.get('sortBy') || ''] || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

  return { query, scopeQuery, sortBy, sortOrder, searchParams };
}

// GET orders (paginated when page/limit is provided)
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    await confirmExistingPaidPendingOrders();

    const { query, scopeQuery, sortBy, sortOrder, searchParams } = await buildOrdersQuery(request);
    const paginated = searchParams.has('page') || searchParams.has('limit');
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const requestedLimit = parseInt(searchParams.get('limit') || (paginated ? '12' : '0'), 10);
    const limit = paginated ? Math.min(Math.max(requestedLimit || 12, 1), 5000) : 0;

    const findQuery = Order.find(query)
      .select(LIST_EXCLUSIONS)
      .sort({ [sortBy]: sortOrder })
      .lean();

    if (!paginated) {
      const orders = await findQuery.maxTimeMS(15000);
      return NextResponse.json({
        success: true,
        orders: orders.map(serializeOrder),
      });
    }

    const skip = (page - 1) * limit;

    const [orders, totalOrders, pendingCount] = await Promise.all([
      findQuery.skip(skip).limit(limit).maxTimeMS(8000),
      Order.countDocuments(query).maxTimeMS(8000),
      Order.countDocuments({ ...scopeQuery, status: 'pending' }).maxTimeMS(8000),
    ]);

    const totalPages = Math.max(Math.ceil(totalOrders / limit), 1);

    return NextResponse.json({
      success: true,
      orders: orders.map(serializeOrder),
      pendingCount,
      pagination: {
        currentPage: page,
        totalPages,
        totalOrders,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
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

    const normalizedCustomerPhone = normalizeKenyaPhoneLocal(orderData.customer.phone);
    if (!normalizedCustomerPhone) {
      return NextResponse.json({
        success: false,
        error: 'Invalid customer phone. Use Kenyan mobile format, e.g. 07XXXXXXXX',
      }, { status: 400 });
    }
    orderData.customer = { ...orderData.customer, phone: normalizedCustomerPhone };

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
      status: orderData.paymentStatus === 'paid' && (!orderData.status || orderData.status === 'pending')
        ? 'confirmed'
        : (orderData.status || 'pending'),
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

    try {
      await upsertCustomerFromPromptedPhone({
        phone: order.customer?.phone,
        name: order.customer?.name,
        email: order.customer?.email,
        address: order.customer?.address,
        orderAmount: order.totalAmount,
      });
    } catch (customerError) {
      console.error('Failed to save POS customer phone:', customerError);
    }
    
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

    // Send purchase confirmation SMS only after the order is paid
    try {
      const { sendPurchaseConfirmationIfNeeded } = await import('@/lib/purchase-confirmation-sms');
      await sendPurchaseConfirmationIfNeeded(order._id);
    } catch (smsError) {
      console.error('Purchase confirmation SMS failed:', smsError);
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