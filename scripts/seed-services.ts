import mongoose from 'mongoose';
import Service from '../lib/models/Service';

const sampleServices = [
  // Electronics Services
  {
    name: "Laptop Repair",
    description: "Professional laptop repair services including screen replacement, keyboard repair, battery replacement, and software troubleshooting.",
    category: "electronics",
    price: "Ksh 2,500",
    turnaround: "2-3 days",
    active: true,
    featured: true,
    image: "/placeholder.svg",
    features: [
      "Free diagnosis",
      "Warranty on repairs",
      "Original parts used",
      "Expert technicians"
    ]
  },
  {
    name: "Smartphone Repair",
    description: "Complete smartphone repair services for all major brands including screen replacement, battery replacement, and charging port repair.",
    category: "electronics",
    price: "Ksh 1,500",
    turnaround: "1-2 days",
    active: true,
    featured: true,
    image: "/placeholder.svg",
    features: [
      "Same-day service available",
      "Quality replacement parts",
      "Data recovery included",
      "Competitive pricing"
    ]
  },
  {
    name: "TV Repair",
    description: "Professional TV repair services for LED, LCD, and Smart TVs including screen replacement and motherboard repair.",
    category: "electronics",
    price: "Ksh 3,000",
    turnaround: "3-5 days",
    active: true,
    featured: false,
    image: "/placeholder.svg",
    features: [
      "Home service available",
      "All TV brands supported",
      "Warranty on repairs",
      "Free pickup and delivery"
    ]
  },
  {
    name: "Printer Repair",
    description: "Comprehensive printer repair services for home and office printers including laser, inkjet, and multifunction printers.",
    category: "electronics",
    price: "Ksh 1,200",
    turnaround: "1-3 days",
    active: true,
    featured: false,
    image: "/placeholder.svg",
    features: [
      "All printer types",
      "Toner and ink refills",
      "Network setup",
      "Maintenance contracts"
    ]
  },

  // Gas Services
  {
    name: "Gas Refilling",
    description: "Reliable gas refilling service for domestic and commercial use with certified gas cylinders and safety standards.",
    category: "gas",
    price: "Ksh 2,800",
    turnaround: "Same day",
    active: true,
    featured: true,
    image: "/placeholder.svg",
    features: [
      "Certified gas cylinders",
      "Safety inspection included",
      "Free delivery",
      "Emergency service available"
    ]
  },
  {
    name: "Gas Installation",
    description: "Professional gas installation services for homes and businesses including pipe fitting and safety compliance.",
    category: "gas",
    price: "Ksh 5,000",
    turnaround: "1-2 days",
    active: true,
    featured: false,
    image: "/placeholder.svg",
    features: [
      "Licensed installers",
      "Safety compliance",
      "Warranty on installation",
      "Free consultation"
    ]
  },
  {
    name: "Gas Maintenance",
    description: "Regular gas system maintenance and safety checks to ensure optimal performance and safety.",
    category: "gas",
    price: "Ksh 1,500",
    turnaround: "Same day",
    active: true,
    featured: false,
    image: "/placeholder.svg",
    features: [
      "Safety inspections",
      "Leak detection",
      "System cleaning",
      "Preventive maintenance"
    ]
  },

  // Printing Services
  {
    name: "T-Shirt Printing",
    description: "Custom T-shirt printing services with high-quality designs, various printing methods, and bulk order discounts.",
    category: "printing",
    price: "Ksh 800",
    turnaround: "3-5 days",
    active: true,
    featured: true,
    image: "/placeholder.svg",
    features: [
      "Custom designs",
      "Multiple printing methods",
      "Bulk order discounts",
      "Quality guarantee"
    ]
  },
  {
    name: "Banner Printing",
    description: "Professional banner printing for events, advertising, and promotional purposes with various sizes and materials.",
    category: "printing",
    price: "Ksh 1,200",
    turnaround: "2-3 days",
    active: true,
    featured: false,
    image: "/placeholder.svg",
    features: [
      "Various sizes available",
      "Weather-resistant materials",
      "Fast turnaround",
      "Design assistance"
    ]
  },
  {
    name: "Business Cards",
    description: "Professional business card printing with premium paper quality and custom designs for your business needs.",
    category: "printing",
    price: "Ksh 500",
    turnaround: "1-2 days",
    active: true,
    featured: false,
    image: "/placeholder.svg",
    features: [
      "Premium paper quality",
      "Custom designs",
      "Fast printing",
      "Bulk discounts"
    ]
  },

  // Accessories
  {
    name: "Phone Accessories",
    description: "Wide range of phone accessories including cases, screen protectors, chargers, and cables for all phone models.",
    category: "accessories",
    price: "Ksh 300",
    turnaround: "In stock",
    active: true,
    featured: true,
    image: "/placeholder.svg",
    features: [
      "All phone models",
      "Quality products",
      "Competitive prices",
      "Warranty included"
    ]
  },
  {
    name: "Computer Accessories",
    description: "Complete range of computer accessories including keyboards, mice, cables, adapters, and storage devices.",
    category: "accessories",
    price: "Ksh 1,000",
    turnaround: "In stock",
    active: true,
    featured: false,
    image: "/placeholder.svg",
    features: [
      "Genuine products",
      "All computer types",
      "Expert advice",
      "Installation service"
    ]
  },
  {
    name: "Cable and Adapters",
    description: "Various cables and adapters for electronics including HDMI, USB, charging cables, and audio cables.",
    category: "accessories",
    price: "Ksh 200",
    turnaround: "In stock",
    active: true,
    featured: false,
    image: "/placeholder.svg",
    features: [
      "All cable types",
      "High quality",
      "Compatible with all devices",
      "Bulk orders welcome"
    ]
  }
];

async function seedServices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecolaundryservices');
    console.log('Connected to MongoDB');

    // Clear existing services
    await Service.deleteMany({});
    console.log('Cleared existing services');

    // Insert sample services
    const createdServices = await Service.insertMany(sampleServices);
    console.log(`Created ${createdServices.length} services`);

    // Display created services
    createdServices.forEach(service => {
      console.log(`- ${service.name} (${service.category}) - ${service.price}`);
    });

    console.log('Services seeded successfully!');
  } catch (error) {
    console.error('Error seeding services:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedServices();
