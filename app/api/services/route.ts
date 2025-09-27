import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Service from '@/lib/models/Service';
import Station from '@/lib/models/Station';
import { requireAdmin } from '@/lib/auth';
import mongoose from 'mongoose';

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
    
    // Manually populate station data
    const servicesWithStations = await Promise.all(
      services.map(async (service) => {
        if (service.stationIds && service.stationIds.length > 0) {
          try {
            const stations = await Station.find({ _id: { $in: service.stationIds } }).select('name location').lean();
            return { ...service, stationIds: stations };
          } catch (error) {
            console.error('Error populating stations for service:', service._id, error);
            return { ...service, stationIds: [] };
          }
        }
        return service;
      })
    );

    return NextResponse.json({
      success: true,
      data: servicesWithStations,
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
    
    const { name, description, category, price, turnaround, features, image, active = true, featured = false, stationIds = [] } = await request.json();

    console.log('Service create request body:', { name, stationIds }); // Debug log

    // Validate stationIds if provided
    if (stationIds && Array.isArray(stationIds)) {
      for (const stationId of stationIds) {
        if (!mongoose.Types.ObjectId.isValid(stationId)) {
          return NextResponse.json(
            { success: false, error: `Invalid station ID: ${stationId}` },
            { status: 400 }
          );
        }
      }
    }
    
    // If stationIds is empty array, set it to undefined to avoid validation issues
    if (stationIds && Array.isArray(stationIds) && stationIds.length === 0) {
      stationIds = undefined;
      console.log('Set stationIds to undefined for empty array');
    }

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
      stationIds,
    });

    await newService.save();

    return NextResponse.json({
      success: true,
      service: newService,
      message: 'Service created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Create service error:', error);
    console.error('Error details:', error.message);
    return NextResponse.json(
      { success: false, error: `Failed to create service: ${error.message}` },
      { status: 500 }
    );
  }
});