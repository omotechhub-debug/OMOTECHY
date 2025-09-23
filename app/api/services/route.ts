import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Service from '@/lib/models/Service';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
    const filter: any = {};
    
    if (category && category !== 'all') filter.category = category;
    if (status && status !== 'all') {
      if (status === 'active') filter.active = true;
      if (status === 'inactive') filter.active = false;
      if (status === 'featured') filter.featured = true;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { features: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get total count for pagination
    const total = await Service.countDocuments(filter);

    // Get services
    const services = await Service.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: services,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

// POST create new service
export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    await connectDB();
    
    const { name, description, category, price, turnaround, features, image, active = true, featured = false } = await request.json();


    if (!name || !description || !category || !price || !turnaround) {
      return NextResponse.json(
        { success: false, error: 'Name, description, category, price, and turnaround are required' },
        { status: 400 }
      );
    }

    // Validate category enum
    const validCategories = ['electronics', 'gas', 'printing', 'accessories', 'repair', 'maintenance', 'installation', 'consultation'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if service with same name already exists
    const existingService = await Service.findOne({ name: name.trim() });
    if (existingService) {
      return NextResponse.json(
        { success: false, error: 'Service with this name already exists' },
        { status: 400 }
      );
    }

    // Create new service
    const newService = new Service({
      name: name.trim(),
      description: description.trim(),
      category,
      price: price.trim(),
      turnaround: turnaround.trim(),
      features: features || [],
      image: image || '/placeholder.svg',
      active,
      featured,
    });

    await newService.save();

    return NextResponse.json({
      success: true,
      service: newService,
      message: 'Service created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Create service error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});