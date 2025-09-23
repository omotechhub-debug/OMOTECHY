import Promotion from '@/lib/models/Promotion';
import connectDB from '@/lib/mongodb';

/**
 * Automatically updates promotion statuses based on time and usage limits
 * Returns the count of promotions that were updated
 */
export async function updatePromotionStatuses(): Promise<number> {
  try {
    const now = new Date();
    let updatedCount = 0;

    // Find all promotions that might need status updates
    const promotions = await Promotion.find({
      status: { $in: ['scheduled', 'active'] }
    });

    for (const promotion of promotions) {
      let newStatus = promotion.status;
      let shouldUpdate = false;

      // Check usage limit reached (applies to any status)
      if (promotion.usageCount >= promotion.usageLimit) {
        newStatus = 'expired';
        shouldUpdate = true;
        console.log(`📊 Promotion "${promotion.title}" usage limit reached (${promotion.usageCount}/${promotion.usageLimit}). Status: ${promotion.status} → expired`);
      }
      // Check time-based status changes (only if not expired by usage)
      else {
        // Scheduled → Active (when start time is reached)
        if (promotion.status === 'scheduled' && now >= promotion.startDate) {
          newStatus = 'active';
          shouldUpdate = true;
          console.log(`⏰ Promotion "${promotion.title}" started. Status: scheduled → active`);
        }
        // Active → Expired (when end time is reached)
        else if (promotion.status === 'active' && now >= promotion.endDate) {
          newStatus = 'expired';
          shouldUpdate = true;
          console.log(`⏰ Promotion "${promotion.title}" ended. Status: active → expired`);
        }
      }

      // Update the promotion if status changed
      if (shouldUpdate) {
        await Promotion.findByIdAndUpdate(promotion._id, { 
          status: newStatus,
          updatedAt: now
        });
        updatedCount++;
        console.log(`✅ Updated promotion "${promotion.title}" status to "${newStatus}"`);
      }
    }

    if (updatedCount > 0) {
      console.log(`🔄 Auto-updated ${updatedCount} promotion(s) based on time/usage criteria`);
    }

    return updatedCount;
  } catch (error) {
    console.error('❌ Error updating promotion statuses:', error);
    return 0;
  }
}

/**
 * Updates a specific promotion's usage count and checks if it should be expired
 * Use this when a promotion is applied/used
 */
export async function incrementPromotionUsage(promotionId: string): Promise<boolean> {
  try {
    const promotion = await Promotion.findById(promotionId);
    if (!promotion) {
      console.error('Promotion not found:', promotionId);
      return false;
    }

    const newUsageCount = promotion.usageCount + 1;
    const updateData: any = {
      usageCount: newUsageCount,
      updatedAt: new Date()
    };

    // Check if usage limit is reached
    if (newUsageCount >= promotion.usageLimit) {
      updateData.status = 'expired';
      console.log(`📊 Promotion "${promotion.title}" reached usage limit (${newUsageCount}/${promotion.usageLimit}). Setting to expired.`);
    }

    await Promotion.findByIdAndUpdate(promotionId, updateData);
    console.log(`📈 Incremented usage for promotion "${promotion.title}": ${newUsageCount}/${promotion.usageLimit}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error incrementing promotion usage:', error);
    return false;
  }
}

/**
 * Locks in a promotion for an order - stores promotion details so it can be honored even if promotion expires
 * Use this when validating promotions for orders to ensure they stay valid until order completion
 */
export async function lockInPromotionForOrder(promoCode: string, orderAmount: number) {
  try {
    await connectDB();
    
    // Auto-update statuses first
    await updatePromotionStatuses();
    
    const now = new Date();
    const promotion = await Promotion.findOne({
      promoCode: { $regex: new RegExp(`^${promoCode.trim()}$`, 'i') },
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now }
    });

    if (!promotion) {
      return {
        success: false,
        error: 'Invalid or expired promo code'
      };
    }

    // Check usage limit
    if (promotion.usageCount >= promotion.usageLimit) {
      return {
        success: false,
        error: 'Promo code usage limit exceeded'
      };
    }

    // Check minimum order amount
    if (orderAmount < promotion.minOrderAmount) {
      return {
        success: false,
        error: `Minimum order amount is Ksh ${promotion.minOrderAmount}`
      };
    }

    // Calculate discount
    let discountAmount;
    if (promotion.discountType === 'percentage') {
      discountAmount = Math.min(
        (orderAmount * promotion.discount) / 100,
        promotion.maxDiscount
      );
    } else {
      discountAmount = Math.min(promotion.discount, promotion.maxDiscount);
    }

    // Return locked-in promotion details
    const lockedPromotion = {
      promotionId: promotion._id.toString(),
      promoCode: promotion.promoCode,
      discount: promotion.discount,
      discountType: promotion.discountType,
      minOrderAmount: promotion.minOrderAmount,
      maxDiscount: promotion.maxDiscount,
      appliedAt: now,
      lockedIn: true,
      calculatedDiscount: Math.round(discountAmount)
    };

    console.log(`🔒 Locked in promotion "${promotion.title}" for order - Discount: Ksh ${discountAmount}`);

    return {
      success: true,
      promotion: lockedPromotion
    };

  } catch (error) {
    console.error('❌ Error locking in promotion:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

/**
 * Validates a locked-in promotion and applies it to an order
 * This honors promotions that were locked in earlier, even if they've since expired
 */
export async function applyLockedInPromotion(promotionDetails: any) {
  try {
    if (!promotionDetails || !promotionDetails.lockedIn) {
      return {
        success: false,
        error: 'No locked-in promotion to apply'
      };
    }

    const promotion = await Promotion.findById(promotionDetails.promotionId);
    
    if (!promotion) {
      console.warn(`⚠️ Locked-in promotion ${promotionDetails.promoCode} not found, but honoring locked details`);
      // Honor the locked-in promotion even if the original promotion was deleted
      return {
        success: true,
        promoCode: promotionDetails.promoCode,
        promoDiscount: promotionDetails.calculatedDiscount || 0,
        usageIncremented: false,
        message: `Honored locked-in promotion ${promotionDetails.promoCode}`
      };
    }

    // For locked-in promotions, we increment usage regardless of current status
    // since the promotion was valid when locked in
    const result = await incrementPromotionUsage(promotion._id.toString());
    
    console.log(`✅ Applied locked-in promotion "${promotion.title}" - Usage: ${promotion.usageCount + 1}/${promotion.usageLimit}`);
    
    return {
      success: true,
      promoCode: promotionDetails.promoCode,
      promoDiscount: promotionDetails.calculatedDiscount || 0,
      usageIncremented: result,
      message: `Applied locked-in promotion ${promotionDetails.promoCode}`
    };

  } catch (error) {
    console.error('❌ Error applying locked-in promotion:', error);
    return {
      success: false,
      error: 'Error applying promotion'
    };
  }
}

/**
 * Gets promotion status info for display
 */
export function getPromotionStatusInfo(promotion: any) {
  const now = new Date();
  const startDate = new Date(promotion.startDate);
  const endDate = new Date(promotion.endDate);
  
  // Check usage
  const usagePercentage = (promotion.usageCount / promotion.usageLimit) * 100;
  const isUsageLimitReached = promotion.usageCount >= promotion.usageLimit;
  
  // Check time
  const isBeforeStart = now < startDate;
  const isAfterEnd = now > endDate;
  const isInTimeRange = now >= startDate && now <= endDate;
  
  // Determine what the status should be (for validation/display)
  let suggestedStatus = promotion.status;
  if (isUsageLimitReached) {
    suggestedStatus = 'expired';
  } else if (isAfterEnd) {
    suggestedStatus = 'expired';
  } else if (isInTimeRange) {
    suggestedStatus = 'active';
  } else if (isBeforeStart) {
    suggestedStatus = 'scheduled';
  }
  
  return {
    currentStatus: promotion.status,
    suggestedStatus,
    usagePercentage: Math.round(usagePercentage),
    isUsageLimitReached,
    isBeforeStart,
    isAfterEnd,
    isInTimeRange,
    daysUntilStart: isBeforeStart ? Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0,
    daysUntilEnd: isInTimeRange ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0,
    statusMismatch: promotion.status !== suggestedStatus
  };
} 