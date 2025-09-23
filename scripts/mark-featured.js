const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Import the Service model
const Service = require('../models/Service');

async function markServicesAsFeatured() {
  try {
    // Get all services
    const services = await Service.find({});
    
    if (services.length === 0) {
      console.log('No services found in database');
      return;
    }

    console.log(`Found ${services.length} services in database`);

    // Mark first 4 services as featured
    const servicesToMark = services.slice(0, 4);
    
    for (const service of servicesToMark) {
      service.featured = true;
      await service.save();
      console.log(`Marked "${service.name}" as featured`);
    }

    console.log('Successfully marked services as featured!');
    
    // Show featured services
    const featuredServices = await Service.find({ featured: true });
    console.log(`\nFeatured services (${featuredServices.length}):`);
    featuredServices.forEach(service => {
      console.log(`- ${service.name} (${service.category}) - ${service.price}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

markServicesAsFeatured(); 