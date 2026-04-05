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

// Service Schema
const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['electronics', 'gas', 'printing', 'repair', 'consultation', 'installation', 'maintenance'] 
  },
  price: { type: String, required: true, trim: true },
  turnaround: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  image: { type: String, default: '/placeholder.svg' },
  features: [{ type: String, trim: true }]
}, {
  timestamps: true
});

const Service = mongoose.model('Service', serviceSchema);

// Sample services data for OMOTECH HUB
const sampleServices = [
  // Electronics Services
  {
    name: "Laptop Screen Replacement",
    description: "Professional laptop screen replacement service for all brands and models. We use high-quality replacement screens and provide warranty on all repairs.",
    category: "repair",
    price: "From Ksh 8,000",
    turnaround: "Same day",
    active: true,
    featured: true,
    image: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=300&fit=crop",
    features: [
      "All laptop brands supported",
      "High-quality replacement screens",
      "1-year warranty on parts",
      "Free diagnosis",
      "Same-day service available"
    ]
  },
  {
    name: "Smartphone Screen Repair",
    description: "Expert smartphone screen repair service for iPhone, Samsung, and other major brands. Original and high-quality replacement parts used.",
    category: "repair",
    price: "From Ksh 3,500",
    turnaround: "2-3 hours",
    active: true,
    featured: true,
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop",
    features: [
      "iPhone, Samsung, Huawei support",
      "Original & high-quality parts",
      "6-month warranty",
      "Quick turnaround",
      "Professional repair"
    ]
  },
  {
    name: "Data Recovery Service",
    description: "Professional data recovery service for hard drives, SSDs, and memory cards. High success rate with secure handling of your data.",
    category: "repair",
    price: "From Ksh 15,000",
    turnaround: "3-7 days",
    active: true,
    featured: false,
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop",
    features: [
      "HDD, SSD, Memory card recovery",
      "90%+ success rate",
      "Secure data handling",
      "Free diagnosis",
      "Professional equipment"
    ]
  },
  {
    name: "System Optimization & Tune-up",
    description: "Complete computer system optimization including virus removal, software updates, disk cleanup, and performance enhancement.",
    category: "maintenance",
    price: "From Ksh 2,500",
    turnaround: "2-4 hours",
    active: true,
    featured: false,
    image: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=300&fit=crop",
    features: [
      "Virus & malware removal",
      "System cleanup & optimization",
      "Software updates",
      "Performance enhancement",
      "Preventive maintenance"
    ]
  },
  {
    name: "Custom PC Building",
    description: "Professional custom PC building service tailored to your specific needs - gaming, office work, or professional applications.",
    category: "installation",
    price: "From Ksh 5,000",
    turnaround: "3-5 days",
    active: true,
    featured: true,
    image: "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=400&h=300&fit=crop",
    features: [
      "Custom configuration",
      "Gaming & office PCs",
      "Quality components",
      "Assembly & testing",
      "1-year warranty"
    ]
  },
  {
    name: "Printer Installation & Setup",
    description: "Professional printer installation, network setup, and configuration service for home and office environments.",
    category: "installation",
    price: "From Ksh 1,500",
    turnaround: "1-2 hours",
    active: true,
    featured: false,
    image: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=300&fit=crop",
    features: [
      "All printer brands",
      "Network setup",
      "Driver installation",
      "Testing & calibration",
      "User training"
    ]
  },
  {
    name: "CCTV Installation",
    description: "Complete CCTV camera installation service for home and business security. Professional setup with remote monitoring capabilities.",
    category: "installation",
    price: "From Ksh 8,000",
    turnaround: "1-2 days",
    active: true,
    featured: false,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
    features: [
      "HD & 4K cameras",
      "Remote monitoring setup",
      "Professional installation",
      "Mobile app configuration",
      "Maintenance support"
    ]
  },

  // Gas Services
  {
    name: "Gas Cylinder Refilling",
    description: "Safe and reliable gas cylinder refilling service. We handle all safety procedures and provide quality assurance.",
    category: "gas",
    price: "Ksh 2,500 (6kg)",
    turnaround: "Same day",
    active: true,
    featured: true,
    image: "https://images.unsplash.com/photo-1581578731548-c6a0c3f2f2d0?w=400&h=300&fit=crop",
    features: [
      "6kg & 13kg cylinders",
      "Safety inspection",
      "Quality assurance",
      "Home delivery available",
      "Certified refilling"
    ]
  },
  {
    name: "Gas Cooker Installation",
    description: "Professional gas cooker installation with safety checks and leak testing. We ensure proper setup and safety compliance.",
    category: "installation",
    price: "From Ksh 1,500",
    turnaround: "1-2 hours",
    active: true,
    featured: false,
    image: "https://images.unsplash.com/photo-1581578731548-c6a0c3f2f2d0?w=400&h=300&fit=crop",
    features: [
      "Safety installation",
      "Leak testing",
      "Regulator setup",
      "Safety briefing",
      "Warranty on work"
    ]
  },
  {
    name: "Gas Safety Inspection",
    description: "Comprehensive gas safety inspection service to check for leaks, faulty connections, and ensure safe operation.",
    category: "maintenance",
    price: "From Ksh 1,000",
    turnaround: "1 hour",
    active: true,
    featured: false,
    image: "https://images.unsplash.com/photo-1581578731548-c6a0c3f2f2d0?w=400&h=300&fit=crop",
    features: [
      "Leak detection",
      "Connection inspection",
      "Safety assessment",
      "Detailed report",
      "Recommendations"
    ]
  },

  // Printing Services
  {
    name: "Custom T-Shirt Printing",
    description: "High-quality custom T-shirt printing service using heat transfer vinyl and sublimation techniques. Perfect for personal and business use.",
    category: "printing",
    price: "From Ksh 800",
    turnaround: "Same day",
    active: true,
    featured: true,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop",
    features: [
      "Heat transfer vinyl",
      "Sublimation printing",
      "All sizes available",
      "Custom designs",
      "Bulk order discounts"
    ]
  },
  {
    name: "Bulk T-Shirt Printing",
    description: "Professional bulk T-shirt printing service for schools, companies, events, and organizations. Competitive pricing for large orders.",
    category: "printing",
    price: "From Ksh 600 (50+ pieces)",
    turnaround: "3-5 days",
    active: true,
    featured: false,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop",
    features: [
      "50+ piece minimum",
      "Sublimation printing",
      "Full-color designs",
      "All sizes available",
      "Delivery service"
    ]
  },
  {
    name: "Logo Design Service",
    description: "Professional logo design service for businesses, organizations, and personal branding. Creative and modern designs.",
    category: "consultation",
    price: "From Ksh 3,000",
    turnaround: "2-3 days",
    active: true,
    featured: false,
    image: "https://images.unsplash.com/photo-1558655146-d09347e92766?w=400&h=300&fit=crop",
    features: [
      "Custom logo design",
      "Multiple concepts",
      "High-resolution files",
      "Revisions included",
      "Print-ready formats"
    ]
  },
  {
    name: "Document Printing & Binding",
    description: "Professional document printing, scanning, photocopying, and binding services. Perfect for reports, presentations, and documents.",
    category: "printing",
    price: "From Ksh 5 per page",
    turnaround: "Same day",
    active: true,
    featured: false,
    image: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=300&fit=crop",
    features: [
      "Color & B&W printing",
      "Scanning services",
      "Photocopying",
      "Binding & laminating",
      "Bulk discounts"
    ]
  },

  // Consultation Services
  {
    name: "IT Consultation",
    description: "Professional IT consultation service for businesses and individuals. We help you choose the right technology solutions.",
    category: "consultation",
    price: "From Ksh 2,000/hour",
    turnaround: "Flexible",
    active: true,
    featured: false,
    image: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=300&fit=crop",
    features: [
      "Technology assessment",
      "Solution recommendations",
      "Cost analysis",
      "Implementation planning",
      "Ongoing support"
    ]
  },
  {
    name: "Network Setup Consultation",
    description: "Expert network setup consultation for homes and offices. We design and implement reliable network solutions.",
    category: "consultation",
    price: "From Ksh 3,000",
    turnaround: "1-2 days",
    active: true,
    featured: false,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
    features: [
      "Network design",
      "WiFi optimization",
      "Security setup",
      "Performance tuning",
      "User training"
    ]
  }
];

// Seed function
const seedServices = async () => {
  try {
    console.log('🌱 Starting services seeding...');
    
    // Clear existing services
    await Service.deleteMany({});
    console.log('🗑️  Cleared existing services');
    
    // Insert sample data
    const createdServices = await Service.insertMany(sampleServices);
    console.log(`✅ Successfully created ${createdServices.length} services`);
    
    // Display summary
    const categories = {};
    createdServices.forEach(service => {
      categories[service.category] = (categories[service.category] || 0) + 1;
    });
    
    console.log('\n📊 Services Summary:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} services`);
    });
    
    console.log('\n🎉 Services seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding services:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the seeding
connectDB().then(() => {
  seedServices();
});