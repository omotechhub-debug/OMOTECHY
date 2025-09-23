const mongoose = require('mongoose');
require('dotenv').config();

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

const User = mongoose.model('User', userSchema);

async function testAdminAuth() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/luxury-laundry');
    console.log('✅ Connected to MongoDB');

    // Check for admin users
    const adminUsers = await User.find({ role: { $in: ['admin', 'superadmin'] } });
    console.log(`\n📊 Found ${adminUsers.length} admin/superadmin users:`);
    
    adminUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role} - Active: ${user.isActive} - Approved: ${user.approved}`);
    });

    // Check for regular users
    const regularUsers = await User.find({ role: 'user' });
    console.log(`\n👥 Found ${regularUsers.length} regular users:`);
    
    regularUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Active: ${user.isActive} - Approved: ${user.approved}`);
    });

    // Test specific admin credentials
    const testEmail = 'admin@demolaundry.com';
    const testUser = await User.findOne({ email: testEmail });
    
    if (testUser) {
      console.log(`\n🔍 Test user found: ${testUser.name} (${testUser.email})`);
      console.log(`   Role: ${testUser.role}`);
      console.log(`   Active: ${testUser.isActive}`);
      console.log(`   Approved: ${testUser.approved}`);
      console.log(`   Created: ${testUser.createdAt}`);
    } else {
      console.log(`\n❌ Test user not found: ${testEmail}`);
      console.log('   Run "npm run create-admin" to create an admin user');
    }

    // Check database connection health
    const dbStats = await mongoose.connection.db.stats();
    console.log(`\n📈 Database stats:`);
    console.log(`   Collections: ${dbStats.collections}`);
    console.log(`   Documents: ${dbStats.objects}`);
    console.log(`   Data size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testAdminAuth(); 