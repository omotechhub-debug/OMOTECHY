import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/luxury-laundry';

if (!process.env.MONGODB_URI) {
  console.warn('⚠️  MONGODB_URI not found in environment variables. Using localhost fallback.');
  console.warn('📝 Please create a .env.local file with your MongoDB connection string.');
  console.warn('📝 Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/luxury-laundry');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ Connected to MongoDB');
      return mongoose;
    }).catch((error) => {
      console.error('❌ MongoDB connection error:', error.message);
      console.log('💡 To fix this:');
      console.log('   1. Create a .env.local file in your project root');
      console.log('   2. Add your MongoDB URI: MONGODB_URI=your-connection-string');
      console.log('   3. Or use MongoDB Atlas: https://www.mongodb.com/atlas');
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB; 