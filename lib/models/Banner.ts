import mongoose, { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
  title: string;
  subtitle?: string;
  description?: string;
  bannerImage: string; // Cloudinary URL
  linkUrl?: string;
  isActive: boolean;
  position: number; // For ordering banners
  startDate?: Date;
  endDate?: Date;
  button1?: {
    text: string;
    link: string;
  };
  button2?: {
    text: string;
    link: string;
  };
  badges?: Array<{
    title: string;
    subtitle?: string;
    icon?: string;
  }>;
  reviewSnippet?: {
    rating: number;
    reviewCount: number;
    text: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  bannerImage: {
    type: String,
    required: true
  },
  linkUrl: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  position: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  button1: {
    text: { type: String, trim: true },
    link: { type: String, trim: true }
  },
  button2: {
    text: { type: String, trim: true },
    link: { type: String, trim: true }
  },
  badges: [
    {
      title: { type: String, required: true, trim: true },
      subtitle: { type: String, trim: true },
      icon: { type: String, trim: true }
    }
  ],
  reviewSnippet: {
    rating: { type: Number },
    reviewCount: { type: Number },
    text: { type: String, trim: true }
  }
}, {
  timestamps: true
});

// Index for efficient queries
BannerSchema.index({ isActive: 1, position: 1 });
BannerSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.models.Banner || mongoose.model<IBanner>('Banner', BannerSchema); 