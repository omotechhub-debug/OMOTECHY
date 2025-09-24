import mongoose from 'mongoose';

export interface IOrder extends mongoose.Document {
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  services: Array<{
    serviceId: string;
    serviceName: string;
    quantity: number;
    price: string;
  }>;
  pickupDate?: string;
  pickupTime?: string;
  notes?: string;
  location: string;
  totalAmount: number;
  pickDropAmount: number;
  discount: number;
  partialAmount: number;
  remainingAmount: number;
  // Add remaining balance tracking
  remainingBalance: number;
  partialPayments: Array<{
    amount: number;
    date: Date;
    mpesaReceiptNumber: string;
    phoneNumber: string;
    method: 'mpesa_stk' | 'mpesa_c2b' | 'cash' | 'bank_transfer';
  }>;
  paymentStatus: 'unpaid' | 'paid' | 'partial' | 'pending' | 'failed';
  laundryStatus: 'to-be-picked' | 'picked' | 'in-progress' | 'ready' | 'delivered';
  status: 'pending' | 'confirmed' | 'in-progress' | 'ready' | 'delivered' | 'cancelled';
  promoCode?: string;
  promoDiscount?: number;
  promotionDetails?: {
    promotionId: string;
    promoCode: string;
    discount: number;
    discountType: 'percentage' | 'fixed';
    minOrderAmount: number;
    maxDiscount: number;
    appliedAt: Date;
    lockedIn: boolean;
  };
  // Store pending payment data for exact amount matching
  pendingMpesaPayment?: {
    checkoutRequestId: string;
    merchantRequestId: string;
    amount: number;
    phoneNumber: string;
    paymentType: 'full' | 'partial';
    initiatedAt: Date;
    status: 'pending' | 'completed' | 'failed';
  };
  // M-Pesa payment fields (top level)
  checkoutRequestId?: string;
  mpesaReceiptNumber?: string;
  transactionDate?: Date;
  phoneNumber?: string;
  amountPaid?: number;
  resultCode?: number;
  resultDescription?: string;
  paymentInitiatedAt?: Date;
  paymentCompletedAt?: Date;
  // M-Pesa payment fields (nested - for backward compatibility)
  mpesaPayment?: {
    checkoutRequestId?: string;
    mpesaReceiptNumber?: string;
    transactionDate?: Date;
    phoneNumber?: string;
    amountPaid?: number;
    resultCode?: number;
    resultDescription?: string;
    paymentInitiatedAt?: Date;
    paymentCompletedAt?: Date;
  };
  // C2B payment fields
  c2bPayment?: {
    transactionId?: string;
    mpesaReceiptNumber?: string;
    transactionDate?: Date;
    phoneNumber?: string;
    amountPaid?: number;
    transactionType?: string;
    billRefNumber?: string;
    thirdPartyTransID?: string;
    orgAccountBalance?: string;
    customerName?: string;
    paymentCompletedAt?: Date;
  };
  paymentMethod?: 'mpesa_stk' | 'mpesa_c2b' | 'cash' | 'bank_transfer';
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new mongoose.Schema<IOrder>({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
  },
  customer: {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  services: [{
    serviceId: {
      type: String,
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: String,
      required: true,
    },
  }],
  pickupDate: {
    type: String,
  },
  pickupTime: {
    type: String,
  },
  notes: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    default: 'main-branch',
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  pickDropAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  discount: {
    type: Number,
    min: 0,
    default: 0,
  },
  partialAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  remainingAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  // Add remaining balance tracking
  remainingBalance: {
    type: Number,
    min: 0,
    default: function() {
      return this.totalAmount || 0;
    }
  },
  partialPayments: [{
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    mpesaReceiptNumber: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      enum: ['mpesa_stk', 'mpesa_c2b', 'cash', 'bank_transfer'],
      required: true,
    },
  }],
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'partial', 'pending', 'failed'],
    required: true,
  },
  laundryStatus: {
    type: String,
    enum: ['to-be-picked', 'picked', 'in-progress', 'ready', 'delivered'],
    default: 'to-be-picked',
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'ready', 'delivered', 'cancelled'],
    default: 'pending',
  },
  promoCode: {
    type: String,
    trim: true,
  },
  promoDiscount: {
    type: Number,
    min: 0,
  },
  promotionDetails: {
    promotionId: String,
    promoCode: String,
    discount: Number,
    discountType: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    minOrderAmount: Number,
    maxDiscount: Number,
    appliedAt: {
      type: Date,
      default: Date.now
    },
    lockedIn: {
      type: Boolean,
      default: false
    }
  },
  // Store pending payment data for exact amount matching
  pendingMpesaPayment: {
    checkoutRequestId: String,
    merchantRequestId: String,
    amount: Number,
    phoneNumber: String,
    paymentType: {
      type: String,
      enum: ['full', 'partial']
    },
    initiatedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    }
  },
  // M-Pesa payment fields (top level)
  checkoutRequestId: String,
  mpesaReceiptNumber: String,
  transactionDate: Date,
  phoneNumber: String,
  amountPaid: Number,
  resultCode: Number,
  resultDescription: String,
  paymentInitiatedAt: Date,
  paymentCompletedAt: Date,
  // M-Pesa payment fields (nested - for backward compatibility)
  mpesaPayment: {
    checkoutRequestId: String,
    mpesaReceiptNumber: String,
    transactionDate: Date,
    phoneNumber: String,
    amountPaid: Number,
    resultCode: Number,
    resultDescription: String,
    paymentInitiatedAt: Date,
    paymentCompletedAt: Date,
  },
  // C2B payment fields
  c2bPayment: {
    transactionId: String,
    mpesaReceiptNumber: String,
    transactionDate: Date,
    phoneNumber: String,
    amountPaid: Number,
    transactionType: String,
    billRefNumber: String,
    thirdPartyTransID: String,
    orgAccountBalance: String,
    customerName: String,
    paymentCompletedAt: Date,
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa_stk', 'mpesa_c2b', 'cash', 'bank_transfer'],
    default: 'cash',
  },
}, {
  timestamps: true,
});

// Pre-save middleware to ensure remainingBalance is calculated correctly
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.remainingBalance) {
    this.remainingBalance = this.totalAmount;
  }
  next();
});

export default mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema); 