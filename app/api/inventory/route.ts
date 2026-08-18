import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Inventory from '@/lib/models/Inventory';
import Station from '@/lib/models/Station';
import User from '@/lib/models/User';
import { requireAdmin, getTokenFromRequest, verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

void Station;

function stockStatusOf(item: { stock?: number; minStock?: number; maxStock?: number }) {
  const stock = Number(item.stock) || 0;
  const minStock = Number(item.minStock) || 0;
  const maxStock = Number(item.maxStock) || 0;
  if (stock <= 0) return 'out_of_stock';
  if (stock <= minStock) return 'low_stock';
  if (maxStock > 0 && stock >= maxStock) return 'overstock';
  return 'in_stock';
}

function profitMarginOf(item: { price?: number; cost?: number }) {
  const cost = Number(item.cost) || 0;
  const price = Number(item.price) || 0;
  if (cost <= 0) return 0;
  return Number(((price - cost) / cost * 100).toFixed(2));
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

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
      console.error('Error parsing URL in inventory route:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid URL' },
        { status: 400 }
      );
    }

    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '12', 10) || 12, 1), 1000);
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const status = searchParams.get('status');
    const search = (searchParams.get('search') || '').trim();
    const stationId = searchParams.get('stationId');
    const noStation = searchParams.get('noStation') === '1';
    const stockStatus = searchParams.get('stockStatus');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const filter: Record<string, unknown> = {
      isService: { $ne: true },
    };

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (status) filter.status = status;

    if (noStation) {
      filter.$or = [
        { stationIds: { $exists: false } },
        { stationIds: { $size: 0 } },
        { stationIds: null },
      ];
    } else if (stationId && mongoose.Types.ObjectId.isValid(stationId)) {
      filter.stationIds = new mongoose.Types.ObjectId(stationId);
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchClause = {
        $or: [
          { name: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
          { sku: { $regex: escaped, $options: 'i' } },
          { brand: { $regex: escaped, $options: 'i' } },
          { model: { $regex: escaped, $options: 'i' } },
          { tags: { $regex: escaped, $options: 'i' } },
        ],
      };
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or as object[] }, searchClause];
        delete filter.$or;
      } else {
        Object.assign(filter, searchClause);
      }
    }

    if (stockStatus === 'out_of_stock') {
      filter.stock = { $lte: 0 };
    } else if (stockStatus === 'low_stock') {
      filter.$expr = {
        $and: [
          { $gt: ['$stock', 0] },
          { $lte: ['$stock', '$minStock'] },
        ],
      };
    } else if (stockStatus === 'overstock') {
      filter.$expr = { $gte: ['$stock', '$maxStock'] };
    } else if (stockStatus === 'in_stock') {
      filter.$expr = {
        $and: [
          { $gt: ['$stock', '$minStock'] },
          { $lt: ['$stock', '$maxStock'] },
        ],
      };
    }

    const skip = (page - 1) * limit;
    const allowedSort = new Set(['createdAt', 'updatedAt', 'name', 'price', 'stock', 'sku']);
    const sortField = allowedSort.has(sortBy) ? sortBy : 'createdAt';
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const [total, inventory] = await Promise.all([
      Inventory.countDocuments(filter).maxTimeMS(8000),
      Inventory.find(filter)
        .select('-specifications -dimensions')
        .populate({ path: 'stationIds', select: 'name location', options: { strictPopulate: false } })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .maxTimeMS(8000),
    ]);

    const data = inventory.map((item: any) => ({
      ...item,
      stockStatus: stockStatusOf(item),
      profitMargin: profitMarginOf(item),
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(Math.ceil(total / limit), 1),
      },
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

    // Get the authenticated user to check specific permissions
    const token = getTokenFromRequest(request);
    const decoded = verifyToken(token);
    const currentUser = await User.findById(decoded.userId);
    
    // Check if user has permission to add inventory
    // Superadmins can always add inventory
    if (currentUser?.role === 'superadmin') {
      // Allow superadmin to proceed
    } else if (currentUser?.role === 'admin') {
      // Check if admin has inventory edit permission
      const inventoryPermission = currentUser.pagePermissions?.find(p => p.page === 'inventory');
      if (!inventoryPermission?.canEdit) {
        return NextResponse.json({ 
          success: false, 
          error: 'Insufficient permissions to add inventory. Contact superadmin to grant inventory permissions.' 
        }, { status: 403 });
      }
    } else if (currentUser?.role === 'manager') {
      return NextResponse.json({ 
        success: false, 
        error: 'Managers cannot add inventory items. Only superadmins and authorized admins can add inventory.' 
      }, { status: 403 });
    }

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
