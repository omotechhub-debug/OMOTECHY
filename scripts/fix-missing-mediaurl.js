const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function fixMissingMediaUrl() {
  try {
    console.log('Starting to fix missing mediaUrl...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get the galleries collection
    const db = mongoose.connection.db;
    const galleriesCollection = db.collection('galleries');
    
    // Find the item that's missing mediaUrl
    const items = await galleriesCollection.find({}).toArray();
    console.log(`Found ${items.length} gallery items`);
    
    for (const item of items) {
      console.log(`\nChecking item: ${item.title || item._id}`);
      console.log(`Current fields:`, Object.keys(item));
      
      // If item has no mediaUrl, we need to add it
      if (!item.mediaUrl) {
        console.log(`Item missing mediaUrl, adding placeholder...`);
        
        // Add a placeholder mediaUrl (you can update this later)
        await galleriesCollection.updateOne(
          { _id: item._id },
          { 
            $set: { 
              mediaUrl: 'https://res.cloudinary.com/dagweycmz/image/upload/v1749839076/ecolaundryservices/zqpjavwo6x3dvdzxazu6.jpg',
              mediaType: 'image'
            }
          }
        );
        console.log(`✓ Added mediaUrl to item: ${item.title || item._id}`);
      }
    }
    
    // Verify the fix
    const updatedItems = await galleriesCollection.find({}).toArray();
    console.log('\nVerification:');
    for (const item of updatedItems) {
      console.log(`- ${item.title || item._id}: mediaUrl=${!!item.mediaUrl}, mediaType=${item.mediaType}`);
    }
    
    console.log('\nFix completed successfully!');
    
  } catch (error) {
    console.error('Fix failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the fix
fixMissingMediaUrl(); 