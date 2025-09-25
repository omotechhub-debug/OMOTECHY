const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function testInventoryComplete() {
  try {
    console.log('🔍 Testing Complete Inventory Management System...');
    
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
    
    // Test 1: Inventory API
    console.log('\n📦 Test 1: Inventory API...');
    const inventoryResponse = await fetch('http://localhost:3000/api/inventory?limit=1000', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const inventoryData = await inventoryResponse.json();
    
    if (inventoryResponse.ok) {
      console.log('✅ Inventory API working');
      console.log(`Found ${inventoryData.data?.length || 0} inventory items`);
    } else {
      console.log('❌ Inventory API failed');
      console.log('Status:', inventoryResponse.status);
      console.log('Response:', JSON.stringify(inventoryData, null, 2));
    }
    
    // Test 2: Movements API
    console.log('\n📊 Test 2: Movements API...');
    const movementsResponse = await fetch('http://localhost:3000/api/inventory/movements', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const movementsData = await movementsResponse.json();
    
    if (movementsResponse.ok) {
      console.log('✅ Movements API working');
      console.log(`Found ${movementsData.movements?.length || 0} valid movements`);
      
      // Check for any movements with null inventoryItem
      if (movementsData.movements) {
        const movementsWithNullItems = movementsData.movements.filter(movement => 
          !movement.inventoryItem
        );
        if (movementsWithNullItems.length > 0) {
          console.log(`⚠️  Found ${movementsWithNullItems.length} movements with null inventoryItem`);
        } else {
          console.log('✅ All movements have valid inventoryItem references');
        }
      }
      
    } else {
      console.log('❌ Movements API failed');
      console.log('Status:', movementsResponse.status);
      console.log('Response:', JSON.stringify(movementsData, null, 2));
    }
    
    // Test 3: Frontend page
    console.log('\n🌐 Test 3: Frontend page...');
    const frontendResponse = await fetch('http://localhost:3000/admin/inventory-management', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (frontendResponse.ok) {
      console.log('✅ Frontend page loads successfully');
      const html = await frontendResponse.text();
      
      if (html.includes('Inventory Management')) {
        console.log('✅ Page contains inventory management content');
      }
      
      // Check for error indicators
      if (html.includes('error') || html.includes('Error') || html.includes('Cannot read properties')) {
        console.log('❌ Page contains error indicators');
      } else {
        console.log('✅ No obvious errors found');
      }
      
    } else {
      console.log('❌ Frontend page failed to load');
      console.log('Status:', frontendResponse.status);
    }
    
    console.log('\n🎉 Complete inventory management test finished!');
    
  } catch (error) {
    console.error('❌ Complete inventory test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testInventoryComplete();
