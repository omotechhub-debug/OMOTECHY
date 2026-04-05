const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || '';

const bannerSchema = new mongoose.Schema({
  title: String,
  description: String,
  bannerImage: String,
  isActive: Boolean,
  position: Number,
  button1: { text: String, link: String },
  button2: { text: String, link: String },
  badges: [{ title: String, icon: String }],
  reviewSnippet: { rating: Number, reviewCount: Number, text: String },
}, { timestamps: true });

const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);

  await Banner.deleteMany({}); // Clear existing banners for demo

  await Banner.create([
    {
      title: 'Redefining Luxury Laundry Experience',
      description: 'Experience the perfect blend of artisanal care and modern technology for your finest garments. Where every thread matters.',
      bannerImage: 'https://res.cloudinary.com/demo/image/upload/v1710000000/laundry-hero1.jpg',
      isActive: true,
      position: 0,
      button1: { text: 'Book Now', link: '/book' },
      button2: { text: 'Our Services', link: '/services' },
      badges: [
        { title: '24h Turnaround', icon: 'clock' },
        { title: 'Eco-Friendly', icon: 'leaf' },
      ],
      reviewSnippet: { rating: 4.9, reviewCount: 2000, text: 'from over 2,000+ reviews' },
    },
    {
      title: 'Office & Home Cleaning Experts',
      description: 'Professional cleaning for your workspace and home. Reliable, thorough, and eco-conscious.',
      bannerImage: 'https://res.cloudinary.com/demo/image/upload/v1710000000/cleaning-hero2.jpg',
      isActive: true,
      position: 1,
      button1: { text: 'Office Cleaning', link: '/services/office-cleaning' },
      button2: { text: 'Home Cleaning', link: '/services/home-cleaning' },
      badges: [
        { title: 'Trusted Staff', icon: 'shield' },
        { title: 'Sparkling Results', icon: 'sparkles' },
      ],
      reviewSnippet: { rating: 4.8, reviewCount: 1200, text: 'Clients love our service!' },
    },
  ]);

  console.log('Seeded two banners!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
}); 