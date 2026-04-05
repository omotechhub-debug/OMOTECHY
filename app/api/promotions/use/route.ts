import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Promotion from '@/lib/models/Promotion';
import { incrementPromotionUsage, updatePromotionStatuses } from '@/lib/promotion-utils';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Auto-update promotion statuses first
    await updatePromotionStatuses();
    
    const { promotionId, promoCode } = await request.json();
    
    if (!promotionId && !promoCode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Promotion ID or promo code is required' 
      }, { status: 400 });
    }

    // Find the promotion
    let promotion;
    if (promotionId) {
      promotion = await Promotion.findById(promotionId);
    } else {
      promotion = await Promotion.findOne({
        promoCode: { $regex: new RegExp(`^${promoCode.trim()}$`, 'i') },
      });
    }

    if (!promotion) {
      return NextResponse.json({ 
        success: false, 
        error: 'Promotion not found' 
      }, { status: 404 });
    }

    // Check if promotion is active and valid
    const now = new Date();
    if (promotion.status !== 'active') {
      return NextResponse.json({ 
        success: false, 
        error: 'Promotion is not active' 
      }, { status: 400 });
    }

    if (now < promotion.startDate) {
      return NextResponse.json({ 
        success: false, 
        error: 'Promotion has not started yet' 
      }, { status: 400 });
    }

    if (now > promotion.endDate) {
      return NextResponse.json({ 
        success: false, 
        error: 'Promotion has expired' 
      }, { status: 400 });
    }

    if (promotion.usageCount >= promotion.usageLimit) {
      return NextResponse.json({ 
        success: false, 
        error: 'Promotion usage limit exceeded' 
      }, { status: 400 });
    }

    // Increment usage and update status if needed
    const success = await incrementPromotionUsage(promotion._id.toString());
    
    if (!success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update promotion usage' 
      }, { status: 500 });
    }

    // Get updated promotion data
    const updatedPromotion = await Promotion.findById(promotion._id);

    return NextResponse.json({
      success: true,
      message: 'Promotion usage updated successfully',
      promotion: {
        _id: updatedPromotion._id,
        promoCode: updatedPromotion.promoCode,
        usageCount: updatedPromotion.usageCount,
        usageLimit: updatedPromotion.usageLimit,
        status: updatedPromotion.status
      }
    });

  } catch (error) {
    console.error('Promotion usage error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 