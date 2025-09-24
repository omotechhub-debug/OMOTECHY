import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import InventoryMovement from '@/lib/models/InventoryMovement';
import { requireAuth } from '@/lib/auth';

// GET all inventory movements
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const movementType = searchParams.get('movementType');
    const inventoryItemId = searchParams.get('inventoryItemId');

    const query: any = {};
    if (movementType && movementType !== 'all') {
      query.movementType = movementType;
    }
    if (inventoryItemId) {
      query.inventoryItem = inventoryItemId;
    }

    const movements = await InventoryMovement.find(query)
      .populate('inventoryItem', 'name sku')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await InventoryMovement.countDocuments(query);

    return NextResponse.json({
      success: true,
      movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get inventory movements error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory movements' },
      { status: 500 }
    );
  }
}
