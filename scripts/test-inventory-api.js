const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function testInventoryAPI() {
  try {
    console.log('🔍 Testing Inventory API...');
    
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
    
    // Test inventory API
    console.log('\n📦 Test 1: Getting inventory...');
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
      
      // Check for any null references in inventory items
      if (inventoryData.data) {
        const itemsWithNullRefs = inventoryData.data.filter(item => 
          !item.name || !item.sku || item.stock === undefined
        );
        if (itemsWithNullRefs.length > 0) {
          console.log(`⚠️  Found ${itemsWithNullRefs.length} inventory items with null/undefined properties`);
        } else {
          console.log('✅ All inventory items have valid properties');
        }
      }
      
    } else {
      console.log('❌ Inventory API failed');
      console.log('Status:', inventoryResponse.status);
      console.log('Response:', JSON.stringify(inventoryData, null, 2));
    }
    
    // Test movements API
    console.log('\n📊 Test 2: Getting movements...');
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
      console.log(`Found ${movementsData.movements?.length || 0} movements`);
      
      // Check for movements with null inventoryItem
      if (movementsData.movements) {
        const movementsWithNullItems = movementsData.movements.filter(movement => 
          !movement.inventoryItem
        );
        if (movementsWithNullItems.length > 0) {
          console.log(`⚠️  Found ${movementsWithNullItems.length} movements with null inventoryItem`);
          console.log('Sample null movement:', movementsWithNullItems[0]);
        } else {
          console.log('✅ All movements have valid inventoryItem references');
        }
      }
      
    } else {
      console.log('❌ Movements API failed');
      console.log('Status:', movementsResponse.status);
      console.log('Response:', JSON.stringify(movementsData, null, 2));
    }
    
    console.log('\n🎉 Inventory API test finished!');
    
  } catch (error) {
    console.error('❌ Inventory API test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testInventoryAPI();
