const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function testCompleteFlow() {
  try {
    console.log('🔍 Testing Complete Station Management Flow...');
    
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
      adminUser = await User.findOne({ role: 'admin' });
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
    
    // Test 1: Get stations
    console.log('\n📋 Test 1: Getting stations...');
    const stationsResponse = await fetch('http://localhost:3000/api/stations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const stationsData = await stationsResponse.json();
    
    if (stationsResponse.ok) {
      console.log('✅ Stations API working');
      console.log(`Found ${stationsData.stations.length} stations`);
      
      // Check if managers are properly populated
      const stationsWithManagers = stationsData.stations.filter(station => 
        station.managers && station.managers.length > 0
      );
      
      console.log(`Stations with managers: ${stationsWithManagers.length}`);
      
      stationsWithManagers.forEach(station => {
        console.log(`  - ${station.name}: ${station.managers.length} managers`);
        station.managers.forEach(manager => {
          console.log(`    * ${manager.name} (${manager.email}) - ${manager.role}`);
        });
      });
      
    } else {
      console.log('❌ Stations API failed');
      console.log('Status:', stationsResponse.status);
      console.log('Response:', JSON.stringify(stationsData, null, 2));
    }
    
    // Test 2: Get available managers
    console.log('\n👥 Test 2: Getting available managers...');
    const managersResponse = await fetch('http://localhost:3000/api/stations/available-managers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const managersData = await managersResponse.json();
    
    if (managersResponse.ok) {
      console.log('✅ Available managers API working');
      console.log(`Found ${managersData.availableManagers.length} available managers`);
      
      managersData.availableManagers.forEach(manager => {
        console.log(`  - ${manager.name} (${manager.email}) - ${manager.role}`);
      });
      
    } else {
      console.log('❌ Available managers API failed');
      console.log('Status:', managersResponse.status);
      console.log('Response:', JSON.stringify(managersData, null, 2));
    }
    
    // Test 3: Test frontend page
    console.log('\n🌐 Test 3: Testing frontend page...');
    const frontendResponse = await fetch('http://localhost:3000/admin/stations', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (frontendResponse.ok) {
      console.log('✅ Frontend page loads successfully');
      const html = await frontendResponse.text();
      
      if (html.includes('Station Management')) {
        console.log('✅ Page contains station management content');
      }
      
      if (html.includes('managers') || html.includes('manager')) {
        console.log('✅ Page contains manager-related content');
      }
      
    } else {
      console.log('❌ Frontend page failed to load');
      console.log('Status:', frontendResponse.status);
    }
    
    console.log('\n🎉 Complete flow test finished!');
    
  } catch (error) {
    console.error('❌ Complete flow test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testCompleteFlow();
