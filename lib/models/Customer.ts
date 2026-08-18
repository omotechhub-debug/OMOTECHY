import mongoose from 'mongoose';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';

export interface ICustomer extends mongoose.Document {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder?: Date;
  status: 'active' | 'inactive' | 'vip' | 'premium' | 'new';
  preferences: string[];
  notes?: string;
  // C2B payment tracking
  createdViaPayment?: boolean;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  lastTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new mongoose.Schema<ICustomer>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true, // Allows multiple null values but unique for non-null values
  },
  address: {
    type: String,
    trim: true,
  },
  totalOrders: {
    type: Number,
    default: 0,
  },
  totalSpent: {
    type: Number,
    default: 0,
  },
  lastOrder: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'vip', 'premium', 'new'],
    default: 'active',
  },
  preferences: [{
    type: String,
    trim: true,
  }],
  notes: {
    type: String,
    trim: true,
  },
  // C2B payment tracking
  createdViaPayment: {
    type: Boolean,
    default: false,
  },
  lastPaymentDate: {
    type: Date,
  },
  lastPaymentAmount: {
    type: Number,
  },
  lastTransactionId: {
    type: String,
  },
}, {
  timestamps: true,
});

customerSchema.pre('validate', function (next) {
  const normalized = normalizeKenyaPhoneLocal(this.phone);
  if (!normalized) {
    next(new Error('Customer phone must be the POS/prompt Kenyan mobile number, not an M-Pesa hash'));
    return;
  }
  this.phone = normalized;
  next();
});

// Index for efficient queries
customerSchema.index({ status: 1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ totalSpent: -1 });

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', customerSchema); 