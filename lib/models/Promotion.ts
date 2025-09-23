import mongoose, { Schema, Document, models } from 'mongoose';

export interface IPromotion extends Document {
  title: string;
  promoCode: string;
  description: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  startDate: Date;
  endDate: Date;
  status: 'active' | 'scheduled' | 'expired' | 'paused';
  usageCount: number;
  usageLimit: number;
  bannerImage: string; // Cloudinary URL
  minOrderAmount: number;
  maxDiscount: number;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema: Schema = new Schema({
  title: { type: String, required: true },
  promoCode: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  discount: { type: Number, required: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'scheduled', 'expired', 'paused'], default: 'scheduled' },
  usageCount: { type: Number, default: 0 },
  usageLimit: { type: Number, required: true },
  bannerImage: { type: String, required: true }, // Cloudinary URL
  minOrderAmount: { type: Number, required: true },
  maxDiscount: { type: Number, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default models.Promotion || mongoose.model<IPromotion>('Promotion', PromotionSchema); 