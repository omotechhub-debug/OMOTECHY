import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryMovement extends Document {
  inventoryItem: mongoose.Types.ObjectId;
  movementType: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer' | 'damage' | 'expired';
  quantity: number; // Positive for additions, negative for deductions
  previousStock: number;
  newStock: number;
  reason?: string;
  reference?: string; // Order ID, Purchase Order ID, etc.
  referenceType?: 'order' | 'purchase' | 'adjustment' | 'return' | 'transfer' | 'damage' | 'expired';
  performedBy: mongoose.Types.ObjectId; // User who performed the action
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>({
  inventoryItem: {
    type: Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  movementType: {
    type: String,
    required: true,
    enum: ['sale', 'purchase', 'adjustment', 'return', 'transfer', 'damage', 'expired']
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: {
    type: Number,
    required: true,
    min: 0
  },
  newStock: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    trim: true
  },
  reference: {
    type: String,
    trim: true
  },
  referenceType: {
    type: String,
    enum: ['order', 'purchase', 'adjustment', 'return', 'transfer', 'damage', 'expired']
  },
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
InventoryMovementSchema.index({ inventoryItem: 1, createdAt: -1 });
InventoryMovementSchema.index({ movementType: 1 });
InventoryMovementSchema.index({ reference: 1 });
InventoryMovementSchema.index({ performedBy: 1 });

// Virtual for movement description
InventoryMovementSchema.virtual('description').get(function() {
  const action = this.quantity > 0 ? 'Added' : 'Deducted';
  const absQuantity = Math.abs(this.quantity);
  return `${action} ${absQuantity} units via ${this.movementType}`;
});

export default mongoose.models.InventoryMovement || mongoose.model<IInventoryMovement>('InventoryMovement', InventoryMovementSchema);
