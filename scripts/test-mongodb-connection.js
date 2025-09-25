const mongoose = require('mongoose');

async function testMongoDBConnection() {
  try {
    console.log('🔍 Testing MongoDB connection...');
    
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });
    
    const MONGODB_URI = process.env.MONGODB_URI;
    console.log('MONGODB_URI:', MONGODB_URI ? 'SET' : 'NOT SET');
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');
    
    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('✅ Available collections:', collections.map(c => c.name));
    
    // Test if we can access the User collection
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const userCount = await User.countDocuments();
    console.log('✅ User collection has', userCount, 'documents');
    
    console.log('✅ MongoDB connection test completed successfully');
    
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testMongoDBConnection();
