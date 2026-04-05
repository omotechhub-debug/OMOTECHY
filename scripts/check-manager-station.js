const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../lib/models/User.ts');
const Station = require('../lib/models/Station.ts');

async function checkManagerStation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all managers
    const managers = await User.find({ role: 'manager' });
    console.log(`\n🔍 Found ${managers.length} managers:`);
    
    for (const manager of managers) {
      console.log(`\n👤 Manager: ${manager.name} (${manager.email})`);
      console.log(`   ID: ${manager._id}`);
      console.log(`   Role: ${manager.role}`);
      console.log(`   StationId: ${manager.stationId || 'None'}`);
      console.log(`   ManagedStations: ${manager.managedStations || 'None'}`);
      console.log(`   IsActive: ${manager.isActive}`);
      console.log(`   Approved: ${manager.approved}`);

      // Check if this manager is assigned to any station
      const assignedStations = await Station.find({
        managers: manager._id
      });
      
      console.log(`   Assigned to ${assignedStations.length} stations:`);
      for (const station of assignedStations) {
        console.log(`     - ${station.name} (${station.location}) - ID: ${station._id}`);
      }

      // Check if stationId field points to a valid station
      if (manager.stationId) {
        const stationById = await Station.findById(manager.stationId);
        if (stationById) {
          console.log(`   StationId points to: ${stationById.name} (${stationById.location})`);
        } else {
          console.log(`   StationId points to non-existent station: ${manager.stationId}`);
        }
      }
    }

    // Also check all stations and their managers
    console.log(`\n🏢 All stations and their managers:`);
    const allStations = await Station.find({});
    for (const station of allStations) {
      console.log(`\n   Station: ${station.name} (${station.location})`);
      console.log(`   ID: ${station._id}`);
      console.log(`   Managers: ${station.managers.length}`);
      if (station.managers.length > 0) {
        for (const managerId of station.managers) {
          const manager = await User.findById(managerId);
          if (manager) {
            console.log(`     - ${manager.name} (${manager.email}) - ${manager.role}`);
          } else {
            console.log(`     - Unknown manager ID: ${managerId}`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkManagerStation();
