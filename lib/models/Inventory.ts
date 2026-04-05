import mongoose, { Document, Schema } from 'mongoose';

export interface IInventory extends Document {
  name: string;
  description: string;
  category: 'electronics' | 'gas' | 'printing' | 'accessories';
  subcategory: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  brand?: string;
  model?: string;
  specifications?: {
    [key: string]: any;
  };
  images: string[];
  status: 'active' | 'inactive' | 'discontinued';
  tags: string[];
  supplier?: string;
  warranty?: string;
  stationIds: mongoose.Types.ObjectId[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    enum: ['electronics', 'gas', 'printing', 'accessories']
  },
  subcategory: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  maxStock: {
    type: Number,
    required: true,
    min: 0,
    default: 1000
  },
  unit: {
    type: String,
    required: true,
    enum: ['piece', 'kg', 'liter', 'meter']
  },
  brand: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  specifications: {
    type: Map,
    of: Schema.Types.Mixed
  },
  images: [{
    type: String,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  }],
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  tags: [{
    type: String,
    trim: true
  }],
  supplier: {
    type: String,
    trim: true
  },
  warranty: {
    type: String,
    trim: true
  },
  stationIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Station',
    required: true
  }],
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    weight: { type: Number, min: 0 }
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
InventorySchema.index({ category: 1, subcategory: 1 });
InventorySchema.index({ sku: 1 }, { unique: true });
InventorySchema.index({ status: 1 });
InventorySchema.index({ name: 'text', description: 'text', tags: 'text' });

// Virtual for profit margin
InventorySchema.virtual('profitMargin').get(function() {
  if (this.cost > 0) {
    return ((this.price - this.cost) / this.cost * 100).toFixed(2);
  }
  return 0;
});

// Virtual for stock status
InventorySchema.virtual('stockStatus').get(function() {
  if (this.stock <= 0) {
    return 'out_of_stock';
  } else if (this.stock <= this.minStock) {
    return 'low_stock';
  } else if (this.stock >= this.maxStock) {
    return 'overstock';
  }
  return 'in_stock';
});

// Pre-save middleware to generate SKU if not provided
InventorySchema.pre('save', function(next) {
  if (!this.sku) {
    const prefix = this.category.toUpperCase().substring(0, 3);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.sku = `${prefix}-${random}`;
  }
  next();
});

export default mongoose.models.Inventory || mongoose.model<IInventory>('Inventory', InventorySchema);
