const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function fixGallerySchema() {
  try {
    console.log('Starting gallery schema fix...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get the galleries collection directly
    const db = mongoose.connection.db;
    const galleriesCollection = db.collection('galleries');
    
    // Find all documents
    const allItems = await galleriesCollection.find({}).toArray();
    console.log(`Found ${allItems.length} gallery items to check`);
    
    let fixedCount = 0;
    
    for (const item of allItems) {
      let needsUpdate = false;
      const updateData = {};
      
      // Check if item has imageUrl but no mediaUrl
      if (item.imageUrl && !item.mediaUrl) {
        updateData.mediaUrl = item.imageUrl;
        updateData.mediaType = 'image';
        needsUpdate = true;
        console.log(`Fixing item ${item._id}: copying imageUrl to mediaUrl`);
      }
      
      // Check if item has mediaUrl but no mediaType
      if (item.mediaUrl && !item.mediaType) {
        updateData.mediaType = 'image';
        needsUpdate = true;
        console.log(`Fixing item ${item._id}: adding mediaType`);
      }
      
      // Remove imageUrl field if it exists (since we now use mediaUrl)
      if (item.imageUrl) {
        updateData.$unset = { imageUrl: 1 };
        needsUpdate = true;
        console.log(`Fixing item ${item._id}: removing old imageUrl field`);
      }
      
      if (needsUpdate) {
        await galleriesCollection.updateOne(
          { _id: item._id },
          updateData
        );
        fixedCount++;
        console.log(`✓ Fixed item: ${item.title || item._id}`);
      }
    }
    
    console.log('Schema fix completed successfully!');
    console.log(`Fixed ${fixedCount} gallery items`);
    
    // Verify the fix
    const verifyItems = await galleriesCollection.find({}).toArray();
    console.log('\nVerification:');
    for (const item of verifyItems) {
      console.log(`- ${item.title || item._id}: mediaUrl=${!!item.mediaUrl}, mediaType=${item.mediaType}, imageUrl=${!!item.imageUrl}`);
    }
    
  } catch (error) {
    console.error('Schema fix failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the fix
fixGallerySchema(); 