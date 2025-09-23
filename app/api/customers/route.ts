import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const phone = searchParams.get('phone');
    
    let query = {};
    
    if (search) {
      // Search by name or phone number
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      };
    } else if (phone) {
      // Search by exact phone number
      query = { phone: phone };
    }
    
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .limit(search ? 20 : 0); // Limit search results, but not regular fetch
      
    return NextResponse.json({ success: true, customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export const POST = requireAdmin(async (req: NextRequest) => {
  try {
    await dbConnect();
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
        { success: false, message: 'Invalid phone number. Client not created.' },
        { status: 400 }
      );
    }

    // Check for existing customer with same phone or email
    const existingCustomer = await Customer.findOne({
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

    const customer = await Customer.create({
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      status: 'active',
      preferences: [],
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create customer' },
      { status: 500 }
    );
  }
}); 