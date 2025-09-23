import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description: string;
  icon: string;
  color: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new mongoose.Schema<ICategory>({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    required: [true, 'Category description is required'],
    trim: true,
  },
  icon: {
    type: String,
    required: [true, 'Category icon is required'],
  },
  color: {
    type: String,
    required: [true, 'Category color is required'],
    match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color'],
  },
  active: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Category || mongoose.model<ICategory>('Category', categorySchema);


