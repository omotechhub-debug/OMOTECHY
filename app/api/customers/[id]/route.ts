import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import { requireAdmin } from '@/lib/auth';

export const PUT = requireAdmin(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    
    // Phone validation
    const isValidPhone = (phone: string | undefined) => {
      if (!phone) return false;
      const cleaned = phone.replace(/\s+/g, '');
      if (
        (cleaned.length === 64 && /^[a-f0-9]+$/i.test(cleaned)) ||
        cleaned === 'Data Error' ||
        cleaned === 'Unknown' ||
        !/^\d{10,15}$/.test(cleaned)
      ) {
        return false;
      }
      return true;
    };
    if (!isValidPhone(body.phone)) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number. Client not updated.' },
        { status: 400 }
      );
    }

    // Check for existing customer with same phone or email (excluding current customer)
    const existingCustomer = await Customer.findOne({
      _id: { $ne: id },
      $or: [
        { phone: body.phone },
        ...(body.email ? [{ email: body.email }] : [])
      ]
    });

    if (existingCustomer) {
      return NextResponse.json(
        { success: false, message: 'Customer with this phone number or email already exists' },
        { status: 400 }
      );
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      {
        name: body.name,
        phone: body.phone,
        email: body.email,
        address: body.address,
      },
      { new: true }
    );

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update customer' },
      { status: 500 }
    );
  }
});

export const DELETE = requireAdmin(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await dbConnect();
    const { id } = await params;
    
    const customer = await Customer.findByIdAndDelete(id);
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete customer' },
      { status: 500 }
    );
  }
}); 