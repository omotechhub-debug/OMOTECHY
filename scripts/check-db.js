const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './ENV_CONFIG_FOR_ECONURU.env' });

async function checkDatabase() {
  let client;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    
    // Check users collection
    console.log('\n👥 USERS COLLECTION:');
    const users = await db.collection('users').find({ role: 'manager' }).toArray();
    console.log(`Found ${users.length} managers:`);
    
    for (const user of users) {
      console.log(`\n👤 Manager: ${user.name} (${user.email})`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   StationId: ${user.stationId || 'None'}`);
      console.log(`   ManagedStations: ${user.managedStations || 'None'}`);
      console.log(`   IsActive: ${user.isActive}`);
      console.log(`   Approved: ${user.approved}`);
    }

    // Check stations collection
    console.log('\n🏢 STATIONS COLLECTION:');
    const stations = await db.collection('stations').find({}).toArray();
    console.log(`Found ${stations.length} stations:`);
    
    for (const station of stations) {
      console.log(`\n🏢 Station: ${station.name} (${station.location})`);
      console.log(`   ID: ${station._id}`);
      console.log(`   Managers: ${station.managers ? station.managers.length : 0}`);
      if (station.managers && station.managers.length > 0) {
        console.log(`   Manager IDs: ${station.managers.join(', ')}`);
      }
      console.log(`   ManagerId (legacy): ${station.managerId || 'None'}`);
      console.log(`   IsActive: ${station.isActive}`);
    }

    // Check specific manager-station relationships
    console.log('\n🔗 MANAGER-STATION RELATIONSHIPS:');
    for (const user of users) {
      console.log(`\n👤 Checking manager: ${user.name} (${user._id})`);
      
      // Check if manager is in any station's managers array
      const stationsWithManager = await db.collection('stations').find({
        managers: user._id
      }).toArray();
      
      console.log(`   Found in ${stationsWithManager.length} stations' managers array:`);
      for (const station of stationsWithManager) {
        console.log(`     - ${station.name} (${station.location}) - ID: ${station._id}`);
      }
      
      // Check if manager's stationId points to a valid station
      if (user.stationId) {
        const stationById = await db.collection('stations').findOne({
          _id: user.stationId
        });
        if (stationById) {
          console.log(`   StationId points to: ${stationById.name} (${stationById.location})`);
        } else {
          console.log(`   StationId points to non-existent station: ${user.stationId}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n✅ Disconnected from MongoDB');
    }
  }
}

checkDatabase();
