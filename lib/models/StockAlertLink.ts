import mongoose, { Schema, Document } from 'mongoose';

export interface IStockAlertItem {
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  category: string;
  unit: string;
  status: 'out_of_stock' | 'low_stock';
}

export interface IStockAlertLink extends Document {
  tokenHash: string;
  phone: string;
  dateKey: string;
  expiresAt: Date;
  items: IStockAlertItem[];
  otpHash?: string;
  otpExpiresAt?: Date;
  otpAttempts: number;
  otpSentCount: number;
  otpLastSentAt?: Date;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StockAlertItemSchema = new Schema({
  name: { type: String, required: true },
  sku: { type: String, default: '' },
  stock: { type: Number, default: 0 },
  minStock: { type: Number, default: 0 },
  category: { type: String, default: '' },
  unit: { type: String, default: 'piece' },
  status: { type: String, enum: ['out_of_stock', 'low_stock'], required: true },
}, { _id: false });

const StockAlertLinkSchema: Schema = new Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  phone: { type: String, required: true },
  dateKey: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: true },
  items: { type: [StockAlertItemSchema], default: [] },
  otpHash: { type: String, default: '' },
  otpExpiresAt: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  otpSentCount: { type: Number, default: 0 },
  otpLastSentAt: { type: Date },
  verifiedAt: { type: Date },
}, { timestamps: true });

StockAlertLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.StockAlertLink || mongoose.model<IStockAlertLink>('StockAlertLink', StockAlertLinkSchema);
