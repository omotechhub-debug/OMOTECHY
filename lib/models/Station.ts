import mongoose from 'mongoose';

export interface IStation extends mongoose.Document {
  name: string;
  location: string;
  description?: string;
  managerId?: mongoose.Types.ObjectId; // Legacy single manager
  managers?: mongoose.Types.ObjectId[]; // New multiple managers
  isActive: boolean;
  // Legacy fields for backward compatibility
  phone?: string;
  email?: string;
  address?: string;
  // New structured fields
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  settings?: {
    workingHours?: {
      start: string;
      end: string;
    };
    timezone?: string;
  };
  // Additional fields that might exist in the database
  manager?: any;
  services?: any[];
  status?: string;
  operatingHours?: any;
  facilities?: any[];
  notes?: string;
  staff?: any[];
  createdAt: Date;
  updatedAt: Date;
}

const stationSchema = new mongoose.Schema<IStation>({
  name: {
    type: String,
    required: [true, 'Station name is required'],
    trim: true,
    unique: true,
  },
  location: {
    type: String,
    required: [true, 'Station location is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  managers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  // Legacy fields for backward compatibility
  phone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  address: {
    type: String,
    trim: true,
  },
  contactInfo: {
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  settings: {
    workingHours: {
      start: {
        type: String,
        default: '08:00',
      },
      end: {
        type: String,
        default: '17:00',
      },
    },
    timezone: {
      type: String,
      default: 'Africa/Nairobi',
    },
  },
  // Additional fields that might exist in the database
  manager: {
    type: mongoose.Schema.Types.Mixed,
  },
  services: [{
    type: mongoose.Schema.Types.Mixed,
  }],
  status: {
    type: String,
    default: 'active',
  },
  operatingHours: {
    type: mongoose.Schema.Types.Mixed,
  },
  facilities: [{
    type: mongoose.Schema.Types.Mixed,
  }],
  notes: {
    type: String,
    trim: true,
  },
  staff: [{
    type: mongoose.Schema.Types.Mixed,
  }],
}, {
  timestamps: true,
});

// Index for better query performance
stationSchema.index({ managerId: 1 });
stationSchema.index({ isActive: 1 });

export default mongoose.models.Station || mongoose.model<IStation>('Station', stationSchema);
