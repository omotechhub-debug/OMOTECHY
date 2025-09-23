import mongoose from 'mongoose';

export interface IGallery extends mongoose.Document {
  title: string;
  description?: string;
  mediaUrl: string; // Cloudinary URL for image or video
  mediaType: 'image' | 'video'; // Type of media
  category: 'before-after' | 'services' | 'facility' | 'team' | 'other';
  status: 'active' | 'inactive';
  featured: boolean;
  order: number; // For custom ordering
  createdAt: Date;
  updatedAt: Date;
}

const gallerySchema = new mongoose.Schema<IGallery>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  mediaUrl: {
    type: String,
    required: [true, 'Media URL is required'],
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: [true, 'Media type is required'],
    default: 'image',
  },
  category: {
    type: String,
    enum: ['before-after', 'services', 'facility', 'team', 'other'],
    required: [true, 'Category is required'],
    default: 'other',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  featured: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for better query performance
gallerySchema.index({ status: 1, category: 1 });
gallerySchema.index({ featured: 1, order: 1 });
gallerySchema.index({ createdAt: -1 });

const Gallery = mongoose.models.Gallery || mongoose.model<IGallery>('Gallery', gallerySchema);

export default Gallery; 