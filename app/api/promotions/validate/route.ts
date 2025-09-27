import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Promotion from '@/lib/models/Promotion';
import { updatePromotionStatuses } from '@/lib/promotion-utils';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Auto-update promotion statuses before validation
    console.log('🔄 Auto-updating promotion statuses before validation...');
    await updatePromotionStatuses();
    
    // Safely parse URL parameters
    let searchParams;
    try {
      if (!request.url) {
        console.error('Request URL is undefined in promotions validate route');
        return NextResponse.json(
          { success: false, error: 'Request URL is undefined' },
          { status: 400 }
        );
      }
      const url = new URL(request.url);
      searchParams = url.searchParams;
    } catch (error) {
      console.error('Error parsing URL in promotions validate route:', error);
      console.error('Request URL:', request.url);
      return NextResponse.json(
        { success: false, error: 'Invalid URL' },
        { status: 400 }
      );
    }
    
    const code = searchParams.get('code');
    
    if (!code) {
      return NextResponse.json({ 
        success: false, 
        error: 'Promo code is required' 
      }, { status: 400 });
    }

    // Find active promotion (after status update)
    const now = new Date();
    const promotion = await Promotion.findOne({
      promoCode: { $regex: new RegExp(`^${code.trim()}$`, 'i') },
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now }
    });

    if (!promotion) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or expired promo code' 
      }, { status: 404 });
    }

    // Check if usage limit is exceeded (should already be handled by auto-update, but double-check)
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      // Update status to expired if not already
      await Promotion.findByIdAndUpdate(promotion._id, { status: 'expired' });
      return NextResponse.json({ 
        success: false, 
        error: 'Promo code usage limit exceeded' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      promotion: {
        _id: promotion._id,
        promoCode: promotion.promoCode,
        discount: promotion.discount,
        discountType: promotion.discountType,
        minOrderAmount: promotion.minOrderAmount,
        maxDiscount: promotion.maxDiscount,
        description: promotion.description
      }
    });

  } catch (error) {
    console.error('Promo code validation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 