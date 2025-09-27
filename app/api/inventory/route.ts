import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Inventory from '@/lib/models/Inventory';
import Station from '@/lib/models/Station';
import { requireAdmin } from '@/lib/auth';
import mongoose from 'mongoose';

// Ensure Station model is registered
if (!mongoose.models.Station) {
  const StationSchema = new mongoose.Schema({
    name: String,
    location: String,
    isActive: Boolean
  });
  mongoose.model('Station', StationSchema);
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    
    // Safely parse URL parameters
    let searchParams;
    try {
      const url = new URL(request.url);
      searchParams = url.searchParams;
    } catch (error) {
      console.error('Error parsing URL:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid URL' },
        { status: 400 }
      );
    }
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const stationId = searchParams.get('stationId');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object - exclude services
    const filter: any = {
      isService: { $ne: true } // Exclude services
    };
    
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (status) filter.status = status;
    
    // Filter by station if stationId is provided
    if (stationId && mongoose.Types.ObjectId.isValid(stationId)) {
      filter.stationIds = { $in: [new mongoose.Types.ObjectId(stationId)] };
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get total count for pagination
    const total = await Inventory.countDocuments(filter);

    // Get inventory items
    const inventory = await Inventory.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
    
    
    // Manually populate station data
    const inventoryWithStations = await Promise.all(
      inventory.map(async (item) => {
        if (item.stationIds && item.stationIds.length > 0) {
          try {
            const stations = await Station.find({ _id: { $in: item.stationIds } }).select('name location').lean();
            return { ...item, stationIds: stations };
          } catch (error) {
            console.error('Error populating stations for item:', item._id, error);
            return { ...item, stationIds: [] };
          }
        }
        return item;
      })
    );


    return NextResponse.json({
      success: true,
      data: inventoryWithStations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    await connectDB();

    const body = await request.json();
    console.log('Inventory create request body:', body); // Debug log
    
    // Validate and convert stationIds if provided
    if (body.stationIds && Array.isArray(body.stationIds)) {
      console.log('Processing stationIds:', body.stationIds);
      // Convert string IDs to ObjectIds
      body.stationIds = body.stationIds.map(id => {
        if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
          return new mongoose.Types.ObjectId(id);
        }
        return id;
      });
      console.log('Converted stationIds to ObjectIds:', body.stationIds);
    }
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'category', 'subcategory', 'price', 'cost', 'unit', 'stationIds'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate stationIds specifically
    if (!body.stationIds || !Array.isArray(body.stationIds) || body.stationIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one station must be selected' },
        { status: 400 }
      );
    }

    // Generate SKU if not provided (same logic as pre-save middleware)
    if (!body.sku) {
      const prefix = body.category.toUpperCase().substring(0, 3);
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      body.sku = `${prefix}-${random}`;
    }

    // Check if SKU already exists
    if (body.sku) {
      const existingItem = await Inventory.findOne({ sku: body.sku });
      if (existingItem) {
        return NextResponse.json(
          { success: false, error: 'SKU already exists' },
          { status: 400 }
        );
      }
    }

    const inventory = new Inventory(body);
    await inventory.save();
    
    // Populate station info for response
    await inventory.populate({
      path: 'stationIds',
      select: 'name location',
      options: { strictPopulate: false }
    });

    return NextResponse.json({
      success: true,
      data: inventory,
      message: 'Inventory item created successfully'
    });

  } catch (error) {
    console.error('Error creating inventory item:', error);
    console.error('Error details:', error.message);
    return NextResponse.json(
      { success: false, error: `Failed to create inventory item: ${error.message}` },
      { status: 500 }
    );
  }
}
