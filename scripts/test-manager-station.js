const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: './ENV_CONFIG_FOR_ECONURU.env' });

async function testManagerStation() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    
    // Test the specific manager ID from the logs
    const managerId = '68d4e0412bd7588f77f926bd';
    console.log(`\n🔍 Testing manager ID: ${managerId}`);
    console.log(`🔍 Manager ID type: ${typeof managerId}`);
    
    // Convert to ObjectId
    const managerObjectId = new ObjectId(managerId);
    console.log(`🔍 Converted ObjectId: ${managerObjectId}`);
    
    // Check all stations
    console.log('\n🏢 All stations:');
    const stations = await db.collection('stations').find({}).toArray();
    for (const station of stations) {
      console.log(`\n   Station: ${station.name}`);
      console.log(`   ID: ${station._id}`);
      console.log(`   Managers array:`, station.managers);
      console.log(`   Managers type:`, typeof station.managers[0]);
      console.log(`   Contains manager ID:`, station.managers.includes(managerId));
      console.log(`   Contains ObjectId:`, station.managers.some(m => m.toString() === managerId));
      console.log(`   Contains ObjectId (strict):`, station.managers.some(m => m.equals(managerObjectId)));
    }
    
    // Test the exact query we're using
    console.log('\n🔍 Testing queries:');
    
    // Query 1: Direct ObjectId
    const result1 = await db.collection('stations').findOne({
      managers: managerObjectId
    });
    console.log(`   ObjectId query result:`, result1 ? result1.name : 'Not found');
    
    // Query 2: String
    const result2 = await db.collection('stations').findOne({
      managers: managerId
    });
    console.log(`   String query result:`, result2 ? result2.name : 'Not found');
    
    // Query 3: $in operator
    const result3 = await db.collection('stations').findOne({
      managers: { $in: [managerId, managerObjectId] }
    });
    console.log(`   $in query result:`, result3 ? result3.name : 'Not found');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n✅ Disconnected from MongoDB');
    }
  }
}

testManagerStation();
