const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function testStationAPI() {
  try {
    console.log('🔍 Testing Station API...');
    
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });
    
    const MONGODB_URI = process.env.MONGODB_URI;
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!MONGODB_URI || !JWT_SECRET) {
      throw new Error('Missing required environment variables');
    }
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find an admin user
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    let adminUser = await User.findOne({ role: 'superadmin' });
    
    if (!adminUser) {
      // If no superadmin, find any admin
      adminUser = await User.findOne({ role: 'admin' });
    }
    
    if (!adminUser) {
      // If still no admin, use the first manager and promote them
      adminUser = await User.findOne({ role: 'manager' });
      if (adminUser) {
        adminUser.role = 'superadmin';
        await adminUser.save();
        console.log('✅ Promoted manager to superadmin for testing');
      }
    }
    
    if (!adminUser) {
      throw new Error('No admin user found');
    }
    
    console.log('✅ Found admin user:', adminUser.email, 'Role:', adminUser.role);
    
    // Create a test JWT token
    const token = jwt.sign(
      {
        userId: adminUser._id.toString(),
        email: adminUser.email,
        role: adminUser.role,
        name: adminUser.name
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('✅ Created test token');
    
    // Test the station API
    const response = await fetch('http://localhost:3000/api/stations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Station API test successful');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Station API test failed');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Station API test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testStationAPI();
