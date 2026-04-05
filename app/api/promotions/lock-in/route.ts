import { NextRequest, NextResponse } from 'next/server';
import { lockInPromotionForOrder } from '@/lib/promotion-utils';

export async function POST(request: NextRequest) {
  try {
    const { promoCode, orderAmount } = await request.json();
    
    if (!promoCode || !orderAmount) {
      return NextResponse.json({ 
        success: false, 
        error: 'Promo code and order amount are required' 
      }, { status: 400 });
    }

    const result = await lockInPromotionForOrder(promoCode, orderAmount);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Promotion lock-in error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 