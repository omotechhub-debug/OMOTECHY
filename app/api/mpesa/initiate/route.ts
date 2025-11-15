import { NextRequest, NextResponse } from 'next/server';
import { mpesaService } from '@/lib/mpesa';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import MpesaTransaction from '@/lib/models/MpesaTransaction';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'superadmin' && decoded.role !== 'manager')) {
      return NextResponse.json({ error: 'Admin or Manager access required' }, { status: 403 });
    }

    const { orderId, phoneNumber, amount, paymentType = 'full' } = await request.json();

    if (!orderId || !phoneNumber || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, phoneNumber, amount' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find the order - populate station if needed
    const order = await Order.findById(orderId).lean();
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if payment is already completed
    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 400 });
    }

    // For managers, verify they can only initiate payments for orders in their station
    if (decoded.role === 'manager') {
      // Get manager's station from token
      let managerStationId = decoded.stationId || decoded.managedStations?.[0];
      
      console.log('🔍 Manager payment authorization check:', {
        managerRole: decoded.role,
        managerStationId: managerStationId,
        orderStation: order.station,
        orderStationId: order.station?.stationId || order.stationId
      });
      
      // Get order's station ID - handle both populated and unpopulated cases
      let orderStationId = null;
      
      if (order.station?.stationId) {
        // Handle populated station (ObjectId object)
        if (typeof order.station.stationId === 'object' && order.station.stationId._id) {
          orderStationId = order.station.stationId._id.toString();
        } else if (typeof order.station.stationId === 'string') {
          orderStationId = order.station.stationId;
        } else {
          orderStationId = order.station.stationId.toString();
        }
      } else if (order.stationId) {
        // Fallback to direct stationId field if it exists
        orderStationId = order.stationId.toString();
      }
      
      // Only enforce station check if both IDs are available
      if (managerStationId && orderStationId) {
        const managerStationIdStr = managerStationId.toString();
        
        if (managerStationIdStr !== orderStationId) {
          console.log('❌ Station mismatch:', {
            managerStation: managerStationIdStr,
            orderStation: orderStationId
          });
          return NextResponse.json({ 
            error: 'You can only initiate payments for orders in your assigned station' 
          }, { status: 403 });
        }
        console.log('✅ Station match confirmed');
      } else {
        // Log warning but allow payment if station info is missing
        console.warn('⚠️ Station information missing, allowing payment:', {
          hasManagerStation: !!managerStationId,
          hasOrderStation: !!orderStationId
        });
      }
    }
    
    // Use callback URL from environment variables (prioritize explicit MPESA_CALLBACK_URL)
    const callbackUrl = process.env.MPESA_CALLBACK_URL || 
      `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.econuru.co.ke'}/api/mpesa/callback`;
    
    console.log('Using M-Pesa callback URL:', callbackUrl);
    
    // Validate callback URL format
    if (!callbackUrl.startsWith('https://')) {
      console.error('Invalid callback URL - must use HTTPS:', callbackUrl);
      return NextResponse.json({
        success: false,
        error: 'Invalid callback URL configuration - must use HTTPS'
      }, { status: 500 });
    }

    const result = await mpesaService.initiateSTKPush({
      phoneNumber,
      amount: parseFloat(amount),
      orderId,
      callbackUrl
    });

    if (result.success && result.checkoutRequestId) {
      // Update order with M-Pesa details
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'pending',
        paymentMethod: 'mpesa_stk',
        checkoutRequestId: result.checkoutRequestId,
        phoneNumber: phoneNumber,
        paymentInitiatedAt: new Date()
      });

      // Store the pending payment for later matching
      await Order.findByIdAndUpdate(orderId, {
        $set: {
          'pendingMpesaPayment': {
            checkoutRequestId: result.checkoutRequestId,
            merchantRequestId: result.merchantRequestId,
            amount: amount,
            phoneNumber: phoneNumber,
            paymentType: paymentType,
            initiatedAt: new Date(),
            status: 'pending'
          }
        }
      });

      console.log(`💾 Stored pending payment data for order ${orderId}`);

      return NextResponse.json({
        success: true,
        message: 'STK Push sent successfully',
        checkoutRequestId: result.checkoutRequestId,
        customerMessage: result.customerMessage
      });
    } else {
      console.error('M-Pesa STK Push failed:', result);
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to initiate payment'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error initiating M-Pesa payment:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 