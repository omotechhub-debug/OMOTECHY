const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Category Schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, required: true, trim: true },
  icon: { type: String, required: true, default: 'Shirt' },
  color: { type: String, required: true, default: '#3B82F6' },
  active: { type: Boolean, default: true }
}, {
  timestamps: true
});

const Category = mongoose.model('Category', categorySchema);

// Sample categories data for OMOTECH HUB
const sampleCategories = [
  {
    name: "Electronics Repair",
    description: "Professional repair services for laptops, smartphones, tablets, and other electronic devices",
    icon: "Laptop",
    color: "#3B82F6",
    active: true
  },
  {
    name: "Computer Services",
    description: "System optimization, virus removal, software installation, and computer maintenance services",
    icon: "Monitor",
    color: "#10B981",
    active: true
  },
  {
    name: "Installation Services",
    description: "Professional installation of printers, CCTV cameras, network equipment, and other devices",
    icon: "Settings",
    color: "#F59E0B",
    active: true
  },
  {
    name: "Data Recovery",
    description: "Expert data recovery services for hard drives, SSDs, memory cards, and other storage devices",
    icon: "HardDrive",
    color: "#EF4444",
    active: true
  },
  {
    name: "Gas Services",
    description: "Gas cylinder refilling, cooker installation, safety inspections, and gas-related services",
    icon: "Flame",
    color: "#F97316",
    active: true
  },
  {
    name: "T-Shirt Printing",
    description: "Custom T-shirt printing, bulk printing, and personalized clothing services",
    icon: "Shirt",
    color: "#8B5CF6",
    active: true
  },
  {
    name: "Design Services",
    description: "Logo design, graphic design, and creative consultation services",
    icon: "Palette",
    color: "#EC4899",
    active: true
  },
  {
    name: "Document Services",
    description: "Printing, scanning, photocopying, binding, and document processing services",
    icon: "FileText",
    color: "#6B7280",
    active: true
  },
  {
    name: "IT Consultation",
    description: "Technology consultation, network setup, and IT support services",
    icon: "Headphones",
    color: "#14B8A6",
    active: true
  },
  {
    name: "Custom PC Building",
    description: "Custom computer assembly, gaming PCs, and specialized computer builds",
    icon: "Cpu",
    color: "#6366F1",
    active: true
  }
];

// Seed function
const seedCategories = async () => {
  try {
    console.log('🌱 Starting categories seeding...');
    
    // Clear existing categories
    await Category.deleteMany({});
    console.log('🗑️  Cleared existing categories');
    
    // Insert sample data
    const createdCategories = await Category.insertMany(sampleCategories);
    console.log(`✅ Successfully created ${createdCategories.length} categories`);
    
    // Display summary
    console.log('\n📊 Categories Summary:');
    createdCategories.forEach(category => {
      console.log(`  ${category.name}: ${category.description}`);
    });
    
    console.log('\n🎉 Categories seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the seeding
connectDB().then(() => {
  seedCategories();
});
