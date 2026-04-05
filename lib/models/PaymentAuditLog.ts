import mongoose from 'mongoose';

export interface IPaymentAuditLog extends mongoose.Document {
  action: 'auto_match' | 'manual_confirm' | 'manual_reject' | 'manual_link' | 'manual_unlink';
  transactionId: string;
  orderId: string;
  adminUserId: string;
  adminUserName: string;
  customerName?: string;
  amount: number;
  phoneNumber: string;
  notes?: string;
  previousStatus?: string;
  newStatus?: string;
  timestamp: Date;
  metadata?: {
    expectedAmount?: number;
    actualAmount?: number;
    paymentType?: 'full' | 'partial';
    source?: 'stkpush' | 'c2b' | 'manual';
  };
}

const PaymentAuditLogSchema = new mongoose.Schema<IPaymentAuditLog>({
  action: {
    type: String,
    enum: ['auto_match', 'manual_confirm', 'manual_reject', 'manual_link', 'manual_unlink'],
    required: true
  },
  transactionId: {
    type: String,
    required: true
  },
  orderId: {
    type: String,
    required: true
  },
  adminUserId: {
    type: String,
    required: true
  },
  adminUserName: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    default: ''
  },
  amount: {
    type: Number,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  previousStatus: {
    type: String,
    default: ''
  },
  newStatus: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    expectedAmount: Number,
    actualAmount: Number,
    paymentType: {
      type: String,
      enum: ['full', 'partial']
    },
    source: {
      type: String,
      enum: ['stkpush', 'c2b', 'manual']
    }
  }
});

// Create indexes for better performance
PaymentAuditLogSchema.index({ transactionId: 1 });
PaymentAuditLogSchema.index({ orderId: 1 });
PaymentAuditLogSchema.index({ adminUserId: 1 });
PaymentAuditLogSchema.index({ timestamp: -1 });
PaymentAuditLogSchema.index({ action: 1 });

export default mongoose.models.PaymentAuditLog || mongoose.model<IPaymentAuditLog>('PaymentAuditLog', PaymentAuditLogSchema); 