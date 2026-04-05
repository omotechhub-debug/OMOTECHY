const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define schemas inline to avoid import issues
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  email: { type: String, trim: true, lowercase: true, sparse: true },
  address: { type: String, trim: true },
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastOrder: { type: Date },
  status: { type: String, enum: ['active', 'inactive', 'vip', 'premium', 'new'], default: 'active' },
  preferences: [{ type: String, trim: true }],
  notes: { type: String, trim: true },
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  customer: {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  services: [{
    serviceId: { type: String, required: true },
    serviceName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: String, required: true },
  }],
  pickupDate: { type: String },
  pickupTime: { type: String },
  notes: { type: String, trim: true },
  location: { type: String, required: true, default: 'main-branch' },
  totalAmount: { type: Number, required: true, min: 0 },
  pickDropAmount: { type: Number, required: true, min: 0 },
  discount: { type: Number, required: true, min: 0 },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'partial'], required: true },
  laundryStatus: { type: String, enum: ['to-be-picked', 'picked', 'in-progress', 'ready', 'delivered'], required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'in-progress', 'ready', 'delivered', 'cancelled'], default: 'pending' },
}, { timestamps: true });

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
  category: { type: String, required: true, trim: true },
  notes: { type: String, trim: true },
}, { timestamps: true });

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);

async function createSampleData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check existing data
    const existingOrders = await Order.countDocuments();
    const existingCustomers = await Customer.countDocuments();
    const existingExpenses = await Expense.countDocuments();

    console.log(`Existing: ${existingOrders} orders, ${existingCustomers} customers, ${existingExpenses} expenses`);

    // Create customers if none exist
    if (existingCustomers === 0) {
      const customers = [
        {
          name: 'John Doe',
          phone: '+254700123456',
          email: 'john.doe@email.com',
          address: '123 Main St, Nairobi',
          totalOrders: 5,
          totalSpent: 4500,
          status: 'active'
        },
        {
          name: 'Jane Smith',
          phone: '+254700123457',
          email: 'jane.smith@email.com',
          address: '456 Oak Ave, Nairobi',
          totalOrders: 8,
          totalSpent: 7200,
          status: 'vip'
        },
        {
          name: 'Mike Johnson',
          phone: '+254700123458',
          email: 'mike.johnson@email.com',
          address: '789 Pine Rd, Nairobi',
          totalOrders: 3,
          totalSpent: 2400,
          status: 'active'
        },
        {
          name: 'Sarah Wilson',
          phone: '+254700123459',
          email: 'sarah.wilson@email.com',
          address: '321 Elm St, Nairobi',
          totalOrders: 12,
          totalSpent: 10800,
          status: 'premium'
        }
      ];

      await Customer.insertMany(customers);
      console.log('Created customers');
    }

    // Create expenses if none exist
    if (existingExpenses === 0) {
      const expenses = [
        {
          title: 'Laundry Detergent',
          amount: 15000,
          date: new Date('2024-01-15'),
          category: 'Supplies',
          notes: 'Monthly detergent supply'
        },
        {
          title: 'Electricity Bill',
          amount: 25000,
          date: new Date('2024-01-20'),
          category: 'Utilities',
          notes: 'January electricity bill'
        },
        {
          title: 'Employee Salaries',
          amount: 120000,
          date: new Date('2024-01-31'),
          category: 'Salaries',
          notes: 'January employee salaries'
        },
        {
          title: 'Machine Maintenance',
          amount: 35000,
          date: new Date('2024-01-10'),
          category: 'Maintenance',
          notes: 'Washing machine repair'
        },
        {
          title: 'Marketing Campaign',
          amount: 20000,
          date: new Date('2024-01-25'),
          category: 'Marketing',
          notes: 'Social media advertising'
        }
      ];

      await Expense.insertMany(expenses);
      console.log('Created expenses');
    }

    // Create orders if none exist
    if (existingOrders === 0) {
      const customers = await Customer.find({});
      const services = [
        { name: 'Premium Dry Cleaning', price: '1299' },
        { name: 'Express Wash & Fold', price: '899' },
        { name: 'Luxury Garment Care', price: '2499' },
        { name: 'Business Laundry', price: '699' },
        { name: 'Home Deep Cleaning', price: '250' },
        { name: 'Office Cleaning', price: '300' }
      ];

      const orders = [];
      const statuses = ['pending', 'confirmed', 'in-progress', 'ready', 'delivered'];
      const paymentStatuses = ['unpaid', 'paid', 'partial'];

      for (let i = 0; i < 15; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const service = services[Math.floor(Math.random() * services.length)];
        const quantity = Math.floor(Math.random() * 5) + 1;
        const totalAmount = parseInt(service.price) * quantity;
        
        // Create orders with dates spread over the last 30 days
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30));
        
        const order = new Order({
          orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          customer: {
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            address: customer.address
          },
          services: [{
            serviceId: `service-${i}`,
            serviceName: service.name,
            quantity: quantity,
            price: service.price
          }],
          pickupDate: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          pickupTime: '09:00',
          location: 'main-branch',
          totalAmount: totalAmount,
          pickDropAmount: 200,
          discount: 0,
          paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
          laundryStatus: 'ready',
          status: statuses[Math.floor(Math.random() * statuses.length)],
          createdAt: orderDate,
          updatedAt: orderDate
        });
        
        orders.push(order);
      }

      await Order.insertMany(orders);
      console.log('Created orders');
    }

    console.log('Sample data creation completed!');

  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createSampleData(); 