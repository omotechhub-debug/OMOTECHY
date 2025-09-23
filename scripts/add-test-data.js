const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const Order = require('../lib/models/Order.ts');
const Customer = require('../lib/models/Customer.ts');
const Expense = require('../lib/models/Expense.ts');
const Service = require('../lib/models/Service.ts');

async function addTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if data already exists
    const existingOrders = await Order.countDocuments();
    const existingCustomers = await Customer.countDocuments();
    const existingExpenses = await Expense.countDocuments();
    const existingServices = await Service.countDocuments();

    console.log(`Existing data: ${existingOrders} orders, ${existingCustomers} customers, ${existingExpenses} expenses, ${existingServices} services`);

    if (existingOrders > 0 && existingCustomers > 0 && existingExpenses > 0 && existingServices > 0) {
      console.log('Data already exists. Skipping data creation.');
      return;
    }

    // Create services if they don't exist
    if (existingServices === 0) {
      const services = [
        {
          name: 'Dry Cleaning - Suit',
          description: 'Professional dry cleaning for suits and formal wear',
          category: 'dry-cleaning',
          price: '800',
          turnaround: '24 hours',
          active: true,
          featured: true,
          features: ['Professional cleaning', 'Starch finish', 'Press finish']
        },
        {
          name: 'Wash & Fold - Regular',
          description: 'Standard wash and fold service',
          category: 'wash-fold',
          price: '300',
          turnaround: '48 hours',
          active: true,
          featured: false,
          features: ['Gentle wash', 'Softener included', 'Neat folding']
        },
        {
          name: 'Luxury Laundry - Silk',
          description: 'Specialized care for silk and delicate fabrics',
          category: 'luxury',
          price: '1200',
          turnaround: '72 hours',
          active: true,
          featured: true,
          features: ['Hand wash', 'Gentle care', 'Premium finish']
        }
      ];

      await Service.insertMany(services);
      console.log('Created services');
    }

    // Create customers if they don't exist
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
        }
      ];

      await Customer.insertMany(customers);
      console.log('Created customers');
    }

    // Create expenses if they don't exist
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
        }
      ];

      await Expense.insertMany(expenses);
      console.log('Created expenses');
    }

    // Create orders if they don't exist
    if (existingOrders === 0) {
      const services = await Service.find({});
      const customers = await Customer.find({});

      if (services.length > 0 && customers.length > 0) {
        const orders = [];
        const statuses = ['pending', 'confirmed', 'in-progress', 'ready', 'delivered'];
        const paymentStatuses = ['unpaid', 'paid', 'partial'];

        for (let i = 0; i < 10; i++) {
          const customer = customers[Math.floor(Math.random() * customers.length)];
          const service = services[Math.floor(Math.random() * services.length)];
          const quantity = Math.floor(Math.random() * 5) + 1;
          const totalAmount = parseFloat(service.price) * quantity;
          
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
              serviceId: service._id.toString(),
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
    }

    console.log('Test data creation completed!');

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

addTestData(); 