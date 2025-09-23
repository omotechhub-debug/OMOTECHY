const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema (same as in the app)
const userSchema = new mongoose.Schema({
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
  } catch (error) {
    next(error);
  }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createSuperAdminUser() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/luxury-laundry';
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if superadmin already exists
    const existingSuperAdmin = await User.findOne({ email: 'superadmin@demolaundry.com' });
    
    if (existingSuperAdmin) {
      console.log('ℹ️  Superadmin user already exists');
      console.log('📧 Email: superadmin@demolaundry.com');
      console.log('🔑 Password: superadmin123');
      process.exit(0);
    }

    // Create superadmin user
    const superAdminUser = new User({
      name: 'Super Admin',
      email: 'superadmin@demolaundry.com',
      password: 'superadmin123',
      role: 'superadmin',
      isActive: true,
      approved: true,
    });

    await superAdminUser.save();
    console.log('✅ Superadmin user created successfully!');
    console.log('📧 Email: superadmin@demolaundry.com');
    console.log('🔑 Password: superadmin123');
    console.log('👑 Role: superadmin');
    
  } catch (error) {
    console.error('❌ Error creating superadmin user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createSuperAdminUser(); 