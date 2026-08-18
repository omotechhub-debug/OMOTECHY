import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import { requireAdmin } from '@/lib/auth';
import { kenyaPhoneLookupValues, normalizeKenyaPhoneLocal } from '@/lib/phone-utils';
import { repairHashedCustomersFromOrders } from '@/lib/repair-hashed-customers';

function mapCustomer(customer: any) {
  const phone = normalizeKenyaPhoneLocal(customer.phone) || '';
  return {
    ...customer,
    _id: customer._id,
    id: String(customer._id),
    clientNo: phone ? String(phone).slice(-6) : String(customer._id).slice(-6),
    fullName: customer.name,
    phone,
    email: customer.email || '',
    address: customer.address || '',
    joinDate: customer.createdAt,
    lastOrder: customer.lastOrder || customer.createdAt,
    totalOrders: customer.totalOrders || 0,
    totalSpent: customer.totalSpent || 0,
    status: customer.status || 'active',
    isFromDatabase: true,
  };
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    let searchParams;
    try {
      if (!request.url) {
        return NextResponse.json(
          { success: false, error: 'Request URL is undefined' },
          { status: 400 }
        );
      }
      searchParams = new URL(request.url).searchParams;
    } catch (error) {
      console.error('Error parsing URL in customers route:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid URL' },
        { status: 400 }
      );
    }

    const search = (searchParams.get('search') || '').trim();
    const phone = (searchParams.get('phone') || '').trim();
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    if (phone) {
      const variants = kenyaPhoneLookupValues(phone);
      const customers = await Customer.find(
        variants.length ? { phone: { $in: variants } } : { phone }
      )
        .limit(5)
        .lean()
        .maxTimeMS(5000);
      return NextResponse.json({ success: true, customers: customers.map(mapCustomer) });
    }

    const query: Record<string, unknown> = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const or: object[] = [
        { name: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
      const variants = kenyaPhoneLookupValues(search);
      if (variants.length) or.push({ phone: { $in: variants } });
      query.$or = or;
    }

    if (search && !pageParam && !limitParam) {
      const customers = await Customer.find(query)
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
        .maxTimeMS(5000);
      return NextResponse.json({ success: true, customers: customers.map(mapCustomer) });
    }

    try {
      await repairHashedCustomersFromOrders();
    } catch (error) {
      console.error('Hashed customer repair skipped:', error);
    }

    const page = Math.max(parseInt(pageParam || '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(limitParam || '15', 10) || 15, 1), 5000);
    const skip = (page - 1) * limit;
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [customers, filteredTotal, statsTotal, statsNew, statsPremium, statsActive] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().maxTimeMS(8000),
      Customer.countDocuments(query).maxTimeMS(8000),
      Customer.countDocuments({}).maxTimeMS(8000),
      Customer.countDocuments({ createdAt: { $gte: twoWeeksAgo } }).maxTimeMS(8000),
      Customer.countDocuments({ totalSpent: { $gt: 1000 } }).maxTimeMS(8000),
      Customer.countDocuments({ status: { $in: ['active', 'vip', 'premium'] } }).maxTimeMS(8000),
    ]);

    const totalPages = Math.max(Math.ceil(filteredTotal / limit), 1);

    return NextResponse.json({
      success: true,
      customers: customers.map(mapCustomer),
      pagination: {
        currentPage: page,
        totalPages,
        totalCustomers: filteredTotal,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats: {
        total: statsTotal,
        newCount: statsNew,
        premiumCount: statsPremium,
        activeCount: statsActive,
      },
    });
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
    
    const normalizedPhone = normalizeKenyaPhoneLocal(body.phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number. Use format 07XXXXXXXX.' },
        { status: 400 }
      );
    }

    // Check for existing customer with same phone or email
    const existingCustomer = await Customer.findOne({
      $or: [
        { phone: { $in: kenyaPhoneLookupValues(normalizedPhone) } },
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
      phone: normalizedPhone,
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