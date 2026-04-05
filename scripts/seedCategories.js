const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/luxury-laundry';

// Define the Category schema inline since we can't import the model directly
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    required: true,
    default: 'Shirt'
  },
  color: {
    type: String,
    required: true,
    default: '#3B82F6'
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Category = mongoose.model('Category', categorySchema);

const defaultCategories = [
  {
    name: "Dry Cleaning",
    description: "Professional dry cleaning services",
    icon: "Shirt",
    color: "#3B82F6",
    active: true,
  },
  {
    name: "Wash & Fold",
    description: "Quick wash and fold services",
    icon: "Timer",
    color: "#10B981",
    active: true,
  },
  {
    name: "Luxury Care",
    description: "Premium luxury garment care",
    icon: "Sparkles",
    color: "#F59E0B",
    active: true,
  },
  {
    name: "Business",
    description: "Business laundry services",
    icon: "TrendingUp",
    color: "#8B5CF6",
    active: true,
  },
  {
    name: "Home Cleaning",
    description: "Home cleaning services",
    icon: "Shield",
    color: "#EF4444",
    active: true,
  },
  {
    name: "Business Cleaning",
    description: "Business cleaning services",
    icon: "Truck",
    color: "#06B6D4",
    active: true,
  },
];

async function seedCategories() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('🗑️  Cleared existing categories');

    // Insert default categories
    const categories = await Category.insertMany(defaultCategories);
    console.log(`✅ Inserted ${categories.length} categories`);

    // Display the created categories
    console.log('\n📋 Created Categories:');
    categories.forEach(category => {
      console.log(`- ${category.name} (${category.icon}, ${category.color})`);
    });

    console.log('\n🎉 Categories seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
seedCategories(); 