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
  password: string;
  role: 'superadmin' | 'admin' | 'user';
  isActive: boolean;
  approved: boolean;
  pagePermissions: IPagePermission[];
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
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'user'],
    default: 'user',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  approved: {
    type: Boolean,
    default: function() {
      return this.role === 'user' ? false : true;
    },
  },
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
          canEdit: ['dashboard', 'orders', 'pos', 'customers', 'services', 'categories'].includes(page),
          canDelete: ['orders', 'customers'].includes(page)
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema); 