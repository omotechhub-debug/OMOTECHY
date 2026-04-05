const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function resetGalleryModel() {
  try {
    console.log('Starting Gallery model reset...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Delete the existing model from mongoose cache
    if (mongoose.models.Gallery) {
      delete mongoose.models.Gallery;
      console.log('Deleted cached Gallery model');
    }
    
    // Define the new schema
    const gallerySchema = new mongoose.Schema({
      title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters'],
      },
      description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters'],
      },
      mediaUrl: {
        type: String,
        required: [true, 'Media URL is required'],
      },
      mediaType: {
        type: String,
        enum: ['image', 'video'],
        required: [true, 'Media type is required'],
        default: 'image',
      },
      category: {
        type: String,
        enum: ['before-after', 'services', 'facility', 'team', 'other'],
        required: [true, 'Category is required'],
        default: 'other',
      },
      status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
      },
      featured: {
        type: Boolean,
        default: false,
      },
      order: {
        type: Number,
        default: 0,
      },
    }, {
      timestamps: true,
    });
    
    // Create indexes
    gallerySchema.index({ status: 1, category: 1 });
    gallerySchema.index({ featured: 1, order: 1 });
    gallerySchema.index({ createdAt: -1 });
    
    // Create the new model
    const Gallery = mongoose.model('Gallery', gallerySchema);
    console.log('Created new Gallery model with updated schema');
    
    // Test the model with a sample document
    const testDoc = new Gallery({
      title: 'Test Item',
      mediaUrl: 'https://example.com/test.jpg',
      mediaType: 'image',
      category: 'other'
    });
    
    console.log('Test document created successfully:', testDoc);
    console.log('Schema validation working correctly');
    
    // Get the galleries collection
    const db = mongoose.connection.db;
    const galleriesCollection = db.collection('galleries');
    
    // Check current documents
    const allItems = await galleriesCollection.find({}).toArray();
    console.log(`\nFound ${allItems.length} gallery items in database`);
    
    for (const item of allItems) {
      console.log(`- ${item.title || item._id}:`);
      console.log(`  mediaUrl: ${!!item.mediaUrl}`);
      console.log(`  mediaType: ${item.mediaType}`);
      console.log(`  imageUrl: ${!!item.imageUrl}`);
      
      // If item has imageUrl but no mediaUrl, fix it
      if (item.imageUrl && !item.mediaUrl) {
        await galleriesCollection.updateOne(
          { _id: item._id },
          { 
            $set: { 
              mediaUrl: item.imageUrl, 
              mediaType: 'image' 
            },
            $unset: { imageUrl: 1 }
          }
        );
        console.log(`  ✓ Fixed: copied imageUrl to mediaUrl`);
      }
    }
    
    console.log('\nGallery model reset completed successfully!');
    
  } catch (error) {
    console.error('Gallery model reset failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the reset
resetGalleryModel(); 