import mongoose, { Schema, Document } from 'mongoose';

export interface ISocialMedia extends Document {
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok';
  url: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SocialMediaSchema: Schema = new Schema({
  platform: {
    type: String,
    required: true,
    enum: ['instagram', 'facebook', 'twitter', 'tiktok'],
    unique: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
SocialMediaSchema.index({ platform: 1 });
SocialMediaSchema.index({ isActive: 1 });

export default mongoose.models.SocialMedia || mongoose.model<ISocialMedia>('SocialMedia', SocialMediaSchema);

