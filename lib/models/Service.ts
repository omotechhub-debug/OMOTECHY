import mongoose from 'mongoose';

export interface IService extends mongoose.Document {
  name: string;
  description: string;
  category: 'electronics' | 'gas' | 'printing' | 'accessories' | 'repair' | 'maintenance' | 'installation' | 'consultation';
  price: string;
  unit?: string;
  turnaround: string;
  turnaroundUnit?: string;
  active: boolean;
  featured: boolean;
  image: string; // Cloudinary URL
  features: string[];
  stationIds?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new mongoose.Schema<IService>({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true,
  },
  category: {
    type: String,
    enum: ['electronics', 'gas', 'printing', 'accessories', 'repair', 'maintenance', 'installation', 'consultation'],
    required: [true, 'Service category is required'],
  },
  price: {
    type: String,
    required: [true, 'Service price is required'],
    trim: true,
  },
  unit: {
    type: String,
    trim: true,
  },
  turnaround: {
    type: String,
    required: [true, 'Turnaround time is required'],
    trim: true,
  },
  turnaroundUnit: {
    type: String,
    trim: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  image: {
    type: String,
    default: '/placeholder.svg',
  },
  features: [{
    type: String,
    trim: true,
  }],
  stationIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station'
  }],
}, {
  timestamps: true,
});

export default mongoose.models.Service || mongoose.model<IService>('Service', serviceSchema); 