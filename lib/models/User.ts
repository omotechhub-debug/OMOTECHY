import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IPagePermission {
  page: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password?: string; // Optional for Google users
  googleId?: string; // Google OAuth ID
  authProvider: 'email' | 'google'; // Authentication provider
  role: 'superadmin' | 'admin' | 'manager' | 'user';
  isActive: boolean;
  approved: boolean;
  reasonForAdminAccess?: string; // Reason provided when requesting admin access
  pagePermissions: IPagePermission[];
  managedStations?: mongoose.Types.ObjectId[]; // Stations this user manages (keeps original role)
  stationId?: mongoose.Types.ObjectId; // Legacy field for backward compatibility
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const pagePermissionSchema = new mongoose.Schema<IPagePermission>({
  page: {
    type: String,
    required: true,
    enum: [
      'dashboard',
      'orders',
      'pos',
      'customers',
      'services',
      'categories',
      'reports',
      'users',
      'expenses',
      'gallery',
      'testimonials',
      'promotions',
      'stations',
      'settings'
    ]
  },
  canView: {
    type: Boolean,
    default: true
  },
  canEdit: {
    type: Boolean,
    default: false
  },
  canDelete: {
    type: Boolean,
    default: false
  }
});

const userSchema = new mongoose.Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: function() {
      // Password required only for email-based authentication
      return !this.googleId;
    },
    minlength: [6, 'Password must be at least 6 characters'],
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
  },
  authProvider: {
    type: String,
    enum: ['email', 'google'],
    default: 'email',
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'manager', 'user'],
    default: 'user',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  approved: {
    type: Boolean,
    default: function() {
      // Auto-approve regular users, require approval for admin/superadmin
      return this.role === 'user' ? true : false;
    },
  },
  reasonForAdminAccess: {
    type: String,
    required: function() {
      return this.role === 'admin' || this.role === 'superadmin' || this.role === 'manager';
    },
  },
  stationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: function() {
      return this.role === 'manager';
    },
  },
  managedStations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
  }],
  pagePermissions: {
    type: [pagePermissionSchema],
    default: function() {
      // Default permissions based on role
      const defaultPages = [
        'dashboard',
        'orders',
        'pos',
        'customers',
        'services',
        'categories',
        'reports',
        'users',
        'expenses',
        'gallery',
        'testimonials',
        'promotions',
        'settings'
      ];
      
      if (this.role === 'superadmin') {
        // Superadmin gets full access to everything
        return defaultPages.map(page => ({
          page,
          canView: true,
          canEdit: true,
          canDelete: true
        }));
      } else if (this.role === 'admin') {
        // Admin gets view access to most pages, limited edit access
        return defaultPages.map(page => ({
          page,
          canView: true,
          canEdit: ['dashboard', 'orders', 'pos', 'customers', 'services', 'categories', 'stations'].includes(page),
          canDelete: ['orders', 'customers', 'stations'].includes(page)
        }));
      } else if (this.role === 'manager') {
        // Manager gets very limited access - only POS, Orders, and Expenses
        return defaultPages.map(page => ({
          page,
          canView: ['dashboard', 'orders', 'pos', 'expenses'].includes(page),
          canEdit: ['orders', 'pos', 'expenses'].includes(page),
          canDelete: ['orders'].includes(page)
        }));
      } else {
        // Regular users get limited access
        return defaultPages.map(page => ({
          page,
          canView: ['dashboard', 'orders', 'pos', 'customers'].includes(page),
          canEdit: ['orders', 'pos'].includes(page),
          canDelete: false
        }));
      }
    }
  }
}, {
  timestamps: true,
});

// Hash password before saving (only for email-based auth)
userSchema.pre('save', async function(next) {
  // Skip password hashing if user is using Google auth or password wasn't modified
  if (!this.isModified('password') || !this.password || this.authProvider === 'google') {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method (only for email-based auth)
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password || this.authProvider === 'google') {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema); 