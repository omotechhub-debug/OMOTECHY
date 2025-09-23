const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// User Schema with pagePermissions
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
  pagePermissions: {
    type: [{
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
    }]
  }
}, {
  timestamps: true,
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

function getDefaultPermissions(role) {
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
  
  if (role === 'superadmin') {
    return defaultPages.map(page => ({
      page,
      canView: true,
      canEdit: true,
      canDelete: true
    }));
  } else if (role === 'admin') {
    return defaultPages.map(page => ({
      page,
      canView: true,
      canEdit: ['dashboard', 'orders', 'pos', 'customers', 'services', 'categories'].includes(page),
      canDelete: ['orders', 'customers'].includes(page)
    }));
  } else {
    return defaultPages.map(page => ({
      page,
      canView: ['dashboard', 'orders', 'pos', 'customers'].includes(page),
      canEdit: ['orders', 'pos'].includes(page),
      canDelete: false
    }));
  }
}

async function fixPermissions() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Find all users
    const users = await User.find({});
    console.log(`\n📊 Found ${users.length} users to check`);

    let fixedCount = 0;
    
    for (const user of users) {
      console.log(`\n👤 Checking ${user.name} (${user.email}) - Role: ${user.role}`);
      
      // Check if user has pagePermissions
      if (!user.pagePermissions || !Array.isArray(user.pagePermissions) || user.pagePermissions.length === 0) {
        console.log('   ❌ No pagePermissions found, fixing...');
        
        const defaultPermissions = getDefaultPermissions(user.role);
        user.pagePermissions = defaultPermissions;
        
        await user.save();
        console.log(`   ✅ Fixed permissions for ${user.role} role`);
        console.log(`   📋 Added ${defaultPermissions.length} permission entries`);
        fixedCount++;
      } else {
        console.log(`   ✅ Already has ${user.pagePermissions.length} permission entries`);
        
        // Check if permissions are correct for the role
        const expectedPermissions = getDefaultPermissions(user.role);
        const usersPermission = user.pagePermissions.find(p => p.page === 'users');
        const expectedUsersPermission = expectedPermissions.find(p => p.page === 'users');
        
        if (!usersPermission || usersPermission.canView !== expectedUsersPermission.canView) {
          console.log('   ⚠️  Users page permission mismatch, fixing...');
          user.pagePermissions = expectedPermissions;
          await user.save();
          console.log('   ✅ Fixed users page permission');
          fixedCount++;
        }
      }
    }

    console.log(`\n🎉 Permission fix completed!`);
    console.log(`📊 Fixed permissions for ${fixedCount} users`);
    
    // Show final status
    const finalUsers = await User.find({}).select('-password');
    console.log(`\n📋 Final user status:`);
    finalUsers.forEach(user => {
      const usersPermission = user.pagePermissions?.find(p => p.page === 'users');
      console.log(`   ${user.name} (${user.role}): Can access users page: ${usersPermission?.canView ? '✅' : '❌'}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing permissions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixPermissions(); 