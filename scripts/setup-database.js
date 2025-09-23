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
    enum: ['admin', 'user'],
    default: 'user',
  },
  isActive: {
    type: Boolean,
    default: true,
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

async function setupDatabase() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.log('💡 Please create a .env.local file with your MongoDB connection string');
      console.log('💡 Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/luxury-laundry');
      process.exit(1);
    }
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@demolaundry.com' });
    
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
      console.log('📧 Email: admin@demolaundry.com');
      console.log('🔑 Password: admin123');
    } else {
      // Create admin user
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@demolaundry.com',
        password: 'admin123',
        role: 'admin',
        isActive: true,
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@demolaundry.com');
      console.log('🔑 Password: admin123');
    }

    // Show database stats
    const userCount = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const userCount_regular = await User.countDocuments({ role: 'user' });

    console.log('\n📊 Database Statistics:');
    console.log(`👥 Total Users: ${userCount}`);
    console.log(`👑 Admins: ${adminCount}`);
    console.log(`👤 Regular Users: ${userCount_regular}`);

    console.log('\n🎉 Database setup complete!');
    console.log('🚀 You can now start your application with: npm run dev');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check your MongoDB connection string');
    console.log('2. Ensure MongoDB service is running');
    console.log('3. Verify network connectivity');
    console.log('4. Check MongoDB Atlas IP whitelist (if using cloud)');
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

setupDatabase(); 