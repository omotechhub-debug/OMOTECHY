import mongoose from 'mongoose';

export interface IExpense extends mongoose.Document {
  title: string;
  amount: number; // Ksh
  date: Date;
  category: string;
  notes?: string;
  // Order creator and station tracking
  createdBy?: {
    userId: string;
    name: string;
    role: 'superadmin' | 'admin' | 'manager' | 'user';
  };
  station?: {
    stationId: string;
    name: string;
    location: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new mongoose.Schema<IExpense>({
  title: {
    type: String,
    required: [true, 'Expense title is required'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive'],
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  // Order creator and station tracking
  createdBy: {
    userId: {
      type: String,
      required: false,
    },
    name: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'manager', 'user'],
      required: false,
    },
  },
  station: {
    stationId: {
      type: String,
      required: false,
    },
    name: {
      type: String,
      required: false,
    },
    location: {
      type: String,
      required: false,
    },
  },
}, {
  timestamps: true,
});

export default mongoose.models.Expense || mongoose.model<IExpense>('Expense', expenseSchema); 