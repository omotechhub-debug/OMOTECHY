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

// Inventory Schema
const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 1000 },
  category: { type: String, required: true, enum: ['electronics', 'gas', 'printing', 'accessories'] },
  subcategory: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
  price: { type: Number, required: true, min: 0 },
  cost: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  minStock: { type: Number, required: true, min: 0, default: 0 },
  maxStock: { type: Number, required: true, min: 0, default: 1000 },
  unit: { type: String, required: true, enum: ['piece', 'kg', 'liter', 'meter'] },
  brand: { type: String, trim: true },
  model: { type: String, trim: true },
  specifications: { type: Map, of: mongoose.Schema.Types.Mixed },
  images: [{ type: String }],
  status: { type: String, required: true, enum: ['active', 'inactive', 'discontinued'], default: 'active' },
  tags: [{ type: String, trim: true }],
  supplier: { type: String, trim: true },
  warranty: { type: String, trim: true },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    weight: { type: Number, min: 0 }
  },
}, {
  timestamps: true
});

const Inventory = mongoose.model('Inventory', inventorySchema);

// Sample inventory data
const sampleInventory = [
  // Electronics - Laptops & Desktops
  {
    name: "HP Pavilion 15 Laptop",
    description: "15.6-inch laptop with Intel i5 processor, 8GB RAM, 512GB SSD. Perfect for business and personal use.",
    category: "electronics",
    subcategory: "Laptops & Desktops",
    sku: "ELC-LAP-001",
    price: 85000,
    cost: 70000,
    stock: 5,
    minStock: 2,
    maxStock: 20,
    unit: "piece",
    brand: "HP",
    model: "Pavilion 15",
    images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["laptop", "business", "intel", "ssd"],
    supplier: "Tech Distributors Ltd",
    warranty: "2 years",
    specifications: {
      "Processor": "Intel Core i5-11th Gen",
      "RAM": "8GB DDR4",
      "Storage": "512GB SSD",
      "Display": "15.6-inch FHD",
      "Graphics": "Intel Iris Xe"
    }
  },
  {
    name: "Dell Inspiron Desktop",
    description: "Desktop computer with Intel i7 processor, 16GB RAM, 1TB HDD + 256GB SSD. Ideal for office work.",
    category: "electronics",
    subcategory: "Laptops & Desktops",
    sku: "ELC-DES-002",
    price: 120000,
    cost: 95000,
    stock: 3,
    minStock: 1,
    maxStock: 15,
    unit: "piece",
    brand: "Dell",
    model: "Inspiron 3000",
    images: ["https://images.unsplash.com/photo-1547082299-de196ea013d6?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["desktop", "office", "intel", "dual-storage"],
    supplier: "Dell Kenya",
    warranty: "3 years",
    specifications: {
      "Processor": "Intel Core i7-12th Gen",
      "RAM": "16GB DDR4",
      "Storage": "1TB HDD + 256GB SSD",
      "Graphics": "Intel UHD Graphics"
    }
  },

  // Electronics - Smartphones
  {
    name: "Samsung Galaxy A54",
    description: "5G smartphone with 128GB storage, 50MP camera, 6.4-inch display. Latest Android OS.",
    category: "electronics",
    subcategory: "Smartphones",
    sku: "ELC-PHO-003",
    price: 45000,
    cost: 38000,
    stock: 8,
    minStock: 3,
    maxStock: 25,
    unit: "piece",
    brand: "Samsung",
    model: "Galaxy A54",
    images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["smartphone", "5g", "android", "camera"],
    supplier: "Samsung Kenya",
    warranty: "1 year",
    specifications: {
      "Display": "6.4-inch Super AMOLED",
      "Storage": "128GB",
      "RAM": "8GB",
      "Camera": "50MP Main + 12MP Ultra-wide",
      "Battery": "5000mAh"
    }
  },
  {
    name: "iPhone 14",
    description: "Apple iPhone 14 with 128GB storage, A15 Bionic chip, 6.1-inch Super Retina XDR display.",
    category: "electronics",
    subcategory: "Smartphones",
    sku: "ELC-PHO-004",
    price: 120000,
    cost: 105000,
    stock: 4,
    minStock: 1,
    maxStock: 10,
    unit: "piece",
    brand: "Apple",
    model: "iPhone 14",
    images: ["https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["iphone", "apple", "ios", "premium"],
    supplier: "Apple Authorized Reseller",
    warranty: "1 year",
    specifications: {
      "Display": "6.1-inch Super Retina XDR",
      "Storage": "128GB",
      "Chip": "A15 Bionic",
      "Camera": "12MP Dual Camera",
      "Battery": "Up to 20 hours video playback"
    }
  },

  // Electronics - Printers
  {
    name: "HP LaserJet Pro M404n",
    description: "Monochrome laser printer, 38 pages per minute, automatic duplex printing, network ready.",
    category: "electronics",
    subcategory: "Printers & Copiers",
    sku: "ELC-PRI-005",
    price: 25000,
    cost: 20000,
    stock: 6,
    minStock: 2,
    maxStock: 15,
    unit: "piece",
    brand: "HP",
    model: "LaserJet Pro M404n",
    images: ["https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["printer", "laser", "monochrome", "network"],
    supplier: "HP Kenya",
    warranty: "1 year",
    specifications: {
      "Type": "Monochrome Laser",
      "Speed": "38 ppm",
      "Resolution": "1200 x 1200 dpi",
      "Connectivity": "USB, Ethernet",
      "Duplex": "Automatic"
    }
  },

  // Electronics - TVs
  {
    name: "Samsung 55-inch Smart TV",
    description: "4K UHD Smart TV with HDR, Tizen OS, built-in WiFi, voice control with Bixby.",
    category: "electronics",
    subcategory: "TVs & Audio",
    sku: "ELC-TVV-006",
    price: 85000,
    cost: 70000,
    stock: 2,
    minStock: 1,
    maxStock: 8,
    unit: "piece",
    brand: "Samsung",
    model: "UN55TU8000",
    images: ["https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["tv", "4k", "smart", "hdr"],
    supplier: "Samsung Kenya",
    warranty: "2 years",
    specifications: {
      "Display": "55-inch 4K UHD",
      "Resolution": "3840 x 2160",
      "HDR": "HDR10+",
      "OS": "Tizen",
      "Connectivity": "WiFi, Bluetooth, HDMI"
    }
  },

  // Electronics - Networking
  {
    name: "TP-Link Archer C7 Router",
    description: "AC1750 Dual Band WiFi Router, 1.75Gbps total bandwidth, 4 Gigabit LAN ports.",
    category: "electronics",
    subcategory: "Networking",
    sku: "ELC-NET-007",
    price: 12000,
    cost: 9000,
    stock: 10,
    minStock: 3,
    maxStock: 30,
    unit: "piece",
    brand: "TP-Link",
    model: "Archer C7",
    images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["router", "wifi", "dual-band", "gigabit"],
    supplier: "TP-Link Kenya",
    warranty: "2 years",
    specifications: {
      "WiFi": "AC1750 Dual Band",
      "Speed": "1.75Gbps",
      "LAN Ports": "4 x Gigabit",
      "Antennas": "3 External",
      "Standards": "802.11ac"
    }
  },

  // Electronics - Computer Parts
  {
    name: "Kingston 8GB DDR4 RAM",
    description: "8GB DDR4-3200 Desktop Memory Module, CL22, 1.2V, compatible with most modern motherboards.",
    category: "electronics",
    subcategory: "Computer Parts",
    sku: "ELC-RAM-008",
    price: 4500,
    cost: 3500,
    stock: 25,
    minStock: 10,
    maxStock: 100,
    unit: "piece",
    brand: "Kingston",
    model: "KVR32N22D8/8",
    images: ["https://images.unsplash.com/photo-1591799264318-7e4ef8ddb7ea?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["ram", "ddr4", "memory", "upgrade"],
    supplier: "Kingston Technology",
    warranty: "Lifetime",
    specifications: {
      "Capacity": "8GB",
      "Type": "DDR4",
      "Speed": "3200MHz",
      "CL": "22",
      "Voltage": "1.2V"
    }
  },
  {
    name: "Samsung 500GB SSD",
    description: "500GB SATA III SSD, 560MB/s read, 530MB/s write speeds. Perfect for system drive upgrade.",
    category: "electronics",
    subcategory: "Computer Parts",
    sku: "ELC-SSD-009",
    price: 8000,
    cost: 6500,
    stock: 15,
    minStock: 5,
    maxStock: 50,
    unit: "piece",
    brand: "Samsung",
    model: "870 EVO",
    images: ["https://images.unsplash.com/photo-1591799264318-7e4ef8ddb7ea?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["ssd", "storage", "sata", "upgrade"],
    supplier: "Samsung Kenya",
    warranty: "5 years",
    specifications: {
      "Capacity": "500GB",
      "Interface": "SATA III",
      "Read Speed": "560MB/s",
      "Write Speed": "530MB/s",
      "Form Factor": "2.5-inch"
    }
  },

  // Gas & Supply
  {
    name: "6kg Gas Cylinder (Empty)",
    description: "6kg empty gas cylinder for domestic use. Exchange service available.",
    category: "gas",
    subcategory: "Gas Cylinders",
    sku: "GAS-CYL-010",
    price: 1500,
    cost: 1200,
    stock: 20,
    minStock: 5,
    maxStock: 50,
    unit: "piece",
    brand: "Total",
    model: "6kg Empty",
    images: ["https://images.unsplash.com/photo-1581578731548-c6a0c3f2f2d0?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["gas", "cylinder", "empty", "domestic"],
    supplier: "Total Kenya",
    warranty: "10 years",
    specifications: {
      "Capacity": "6kg",
      "Type": "Empty Cylinder",
      "Material": "Steel",
      "Valve": "Standard",
      "Weight": "8.5kg (empty)"
    }
  },
  {
    name: "Gas Regulator",
    description: "High pressure gas regulator for domestic gas cylinders. Brass construction, adjustable pressure.",
    category: "gas",
    subcategory: "Gas Accessories",
    sku: "GAS-REG-011",
    price: 2500,
    cost: 1800,
    stock: 15,
    minStock: 5,
    maxStock: 40,
    unit: "piece",
    brand: "Generic",
    model: "High Pressure",
    images: ["https://images.unsplash.com/photo-1581578731548-c6a0c3f2f2d0?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["regulator", "gas", "brass", "adjustable"],
    supplier: "Gas Accessories Ltd",
    warranty: "2 years",
    specifications: {
      "Material": "Brass",
      "Pressure": "Adjustable",
      "Connection": "Standard",
      "Safety": "Built-in",
      "Compatibility": "All domestic cylinders"
    }
  },

  // Printing & Branding - Products
  {
    name: "Heat Transfer Vinyl Sheets",
    description: "High-quality heat transfer vinyl sheets for custom T-shirt printing. Various colors available.",
    category: "printing",
    subcategory: "T-Shirt Printing",
    sku: "PRT-VIN-012",
    price: 500,
    cost: 300,
    stock: 50,
    minStock: 10,
    maxStock: 200,
    unit: "piece",
    brand: "Siser",
    model: "EasyWeed",
    images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["vinyl", "heat-transfer", "printing", "custom"],
    supplier: "Printing Supplies Ltd",
    warranty: "1 year",
    specifications: {
      "Type": "Heat Transfer Vinyl",
      "Size": "12x12 inches",
      "Colors": "Multiple available",
      "Material": "PVC",
      "Application": "Heat press"
    }
  },
  {
    name: "Sublimation Paper A4",
    description: "Professional sublimation paper for full-color printing on polyester materials. 100 sheets per pack.",
    category: "printing",
    subcategory: "Bulk Printing",
    sku: "PRT-SUB-013",
    price: 2500,
    cost: 1800,
    stock: 20,
    minStock: 5,
    maxStock: 100,
    unit: "piece",
    brand: "Sawgrass",
    model: "SubliJet",
    images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["sublimation", "paper", "full-color", "polyester"],
    supplier: "Printing Supplies Ltd",
    warranty: "6 months",
    specifications: {
      "Size": "A4",
      "Sheets": "100 per pack",
      "Compatibility": "Sublimation printers",
      "Material": "Polyester compatible",
      "Quality": "High resolution"
    }
  },

  // Accessories
  {
    name: "USB-C to USB-A Cable",
    description: "3ft USB-C to USB-A cable for charging and data transfer. Compatible with most devices.",
    category: "accessories",
    subcategory: "Cables & Adapters",
    sku: "ACC-CAB-017",
    price: 1200,
    cost: 800,
    stock: 50,
    minStock: 20,
    maxStock: 200,
    unit: "piece",
    brand: "Generic",
    model: "3ft USB-C",
    images: ["https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["cable", "usb-c", "charging", "data"],
    supplier: "Cable Suppliers Ltd",
    warranty: "6 months",
    specifications: {
      "Length": "3 feet",
      "Connectors": "USB-C to USB-A",
      "Speed": "USB 2.0",
      "Material": "Nylon braided",
      "Compatibility": "Universal"
    }
  },
  {
    name: "Wireless Mouse",
    description: "Optical wireless mouse with USB receiver. 2.4GHz connection, 1000 DPI, 3-button design.",
    category: "accessories",
    subcategory: "Peripherals",
    sku: "ACC-MOU-018",
    price: 2500,
    cost: 1800,
    stock: 30,
    minStock: 10,
    maxStock: 100,
    unit: "piece",
    brand: "Logitech",
    model: "M100",
    images: ["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["mouse", "wireless", "optical", "usb"],
    supplier: "Logitech Kenya",
    warranty: "1 year",
    specifications: {
      "Connection": "Wireless 2.4GHz",
      "DPI": "1000",
      "Buttons": "3",
      "Battery": "AA x 1",
      "Range": "10 meters"
    }
  },
  {
    name: "Mechanical Keyboard",
    description: "RGB backlit mechanical keyboard with blue switches. Full-size layout, gaming optimized.",
    category: "accessories",
    subcategory: "Peripherals",
    sku: "ACC-KEY-019",
    price: 12000,
    cost: 9000,
    stock: 8,
    minStock: 3,
    maxStock: 25,
    unit: "piece",
    brand: "Redragon",
    model: "K552",
    images: ["https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&h=300&fit=crop"],
    status: "active",
    tags: ["keyboard", "mechanical", "rgb", "gaming"],
    supplier: "Gaming Accessories Ltd",
    warranty: "1 year",
    specifications: {
      "Type": "Mechanical",
      "Switches": "Blue",
      "Backlight": "RGB",
      "Layout": "Full-size",
      "Connection": "USB"
    }
  }
];

// Seed function
const seedInventory = async () => {
  try {
    console.log('🌱 Starting inventory seeding...');
    
    // Clear existing inventory
    await Inventory.deleteMany({});
    console.log('🗑️  Cleared existing inventory');
    
    // Insert sample data
    const createdItems = await Inventory.insertMany(sampleInventory);
    console.log(`✅ Successfully created ${createdItems.length} inventory items`);
    
    // Display summary
    const categories = {};
    createdItems.forEach(item => {
      categories[item.category] = (categories[item.category] || 0) + 1;
    });
    
    console.log('\n📊 Inventory Summary:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} items`);
    });
    
    console.log('\n🎉 Inventory seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding inventory:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the seeding
connectDB().then(() => {
  seedInventory();
});
