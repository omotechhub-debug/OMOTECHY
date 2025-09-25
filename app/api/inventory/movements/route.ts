import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import InventoryMovement from '@/lib/models/InventoryMovement';
import { verifyToken } from '@/lib/auth';
import User from '@/lib/models/User';

// GET all inventory movements
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin or superadmin
    const user = await User.findById(decoded.userId);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

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
    
    // Filter out movements with null inventoryItem (orphaned movements)
    const validMovements = movements.filter(movement => movement.inventoryItem !== null);

    const total = await InventoryMovement.countDocuments(query);

    return NextResponse.json({
      success: true,
      movements: validMovements,
      pagination: {
        page,
        limit,
        total: validMovements.length,
        pages: Math.ceil(validMovements.length / limit)
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
