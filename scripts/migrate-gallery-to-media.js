const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Gallery Schema (old version)
const oldGallerySchema = new mongoose.Schema({
  title: String,
  description: String,
  imageUrl: String, // Old field
  category: String,
  status: String,
  featured: Boolean,
  order: Number,
  createdAt: Date,
  updatedAt: Date,
});

// Gallery Schema (new version)
const newGallerySchema = new mongoose.Schema({
  title: String,
  description: String,
  mediaUrl: String, // New field
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image',
  },
  category: String,
  status: String,
  featured: Boolean,
  order: Number,
  createdAt: Date,
  updatedAt: Date,
});

const OldGallery = mongoose.model('Gallery', oldGallerySchema);
const NewGallery = mongoose.model('GalleryNew', newGallerySchema);

async function migrateGallery() {
  try {
    console.log('Starting gallery migration...');
    
    // Get all existing gallery items
    const oldItems = await OldGallery.find({});
    console.log(`Found ${oldItems.length} gallery items to migrate`);
    
    for (const item of oldItems) {
      console.log(`Migrating item: ${item.title}`);
      
      // Create new item with updated schema
      const newItem = new NewGallery({
        title: item.title,
        description: item.description,
        mediaUrl: item.imageUrl, // Copy imageUrl to mediaUrl
        mediaType: 'image', // Default to image for existing items
        category: item.category,
        status: item.status,
        featured: item.featured,
        order: item.order,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
      
      await newItem.save();
      console.log(`✓ Migrated: ${item.title}`);
    }
    
    // Drop the old collection and rename the new one
    await mongoose.connection.db.dropCollection('galleries');
    await mongoose.connection.db.renameCollection('gallerynews', 'galleries');
    
    console.log('Migration completed successfully!');
    console.log(`Migrated ${oldItems.length} gallery items`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration
migrateGallery(); 