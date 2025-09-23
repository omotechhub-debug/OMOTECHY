import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import Order from '@/lib/models/Order';
import { requireAdmin } from '@/lib/auth';

export const POST = requireAdmin(async (req: NextRequest) => {
  try {
    await dbConnect();
    
    // Fetch all orders
    const orders = await Order.find().populate('customer');
    
    // Get all existing customers
    const existingCustomers = await Customer.find();
    const customerMap = new Map();
    
    // Create map of existing customers by phone
    existingCustomers.forEach(customer => {
      customerMap.set(customer.phone, customer);
    });
    
    // Process orders and update/create customers
    for (const order of orders) {
      const customerData = order.customer;
      if (!customerData?.phone) continue;
      
      const phone = customerData.phone;
      const existingCustomer = customerMap.get(phone);
      
      if (existingCustomer) {
        // Update existing customer statistics
        existingCustomer.totalOrders += 1;
        existingCustomer.totalSpent += order.totalAmount || 0;
        if (!existingCustomer.lastOrder || new Date(order.createdAt) > new Date(existingCustomer.lastOrder)) {
          existingCustomer.lastOrder = order.createdAt;
        }
        await existingCustomer.save();
      } else {
        // Create new customer from order
        const newCustomer = new Customer({
          name: customerData.name || customerData.email || customerData.phone || 'Unknown',
          phone: phone,
          email: customerData.email,
          address: customerData.address,
          totalOrders: 1,
          totalSpent: order.totalAmount || 0,
          lastOrder: order.createdAt,
          status: 'active',
          preferences: [],
        });
        
        await newCustomer.save();
        customerMap.set(phone, newCustomer);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Customer data synced successfully',
      totalCustomers: customerMap.size
    });
  } catch (error: any) {
    console.error('Error syncing customers:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to sync customers' },
      { status: 500 }
    );
  }
}); 