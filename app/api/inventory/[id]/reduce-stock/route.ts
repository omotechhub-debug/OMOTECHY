import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Inventory from '@/lib/models/Inventory';
import { requireAdmin } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request);
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid inventory ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { quantity, stationId } = body;

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid quantity' },
        { status: 400 }
      );
    }

    if (!stationId || !mongoose.Types.ObjectId.isValid(stationId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid station ID' },
        { status: 400 }
      );
    }

    // Find the inventory item
    const inventoryItem = await Inventory.findById(params.id);
    if (!inventoryItem) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Check if the item is assigned to the station
    const isAssignedToStation = inventoryItem.stationIds.some(
      (id: mongoose.Types.ObjectId) => id.toString() === stationId
    );

    if (!isAssignedToStation) {
      return NextResponse.json(
        { success: false, error: 'Item not assigned to this station' },
        { status: 403 }
      );
    }

    // Check if there's enough stock
    if (inventoryItem.stock < quantity) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient stock. Available: ${inventoryItem.stock}, Requested: ${quantity}` 
        },
        { status: 400 }
      );
    }

    // Reduce the stock
    inventoryItem.stock -= quantity;
    await inventoryItem.save();

    console.log(`Inventory reduced for ${inventoryItem.name}: ${quantity} units. New stock: ${inventoryItem.stock}`);

    return NextResponse.json({
      success: true,
      data: {
        _id: inventoryItem._id,
        name: inventoryItem.name,
        previousStock: inventoryItem.stock + quantity,
        newStock: inventoryItem.stock,
        quantityReduced: quantity
      },
      message: 'Inventory reduced successfully'
    });

  } catch (error) {
    console.error('Error reducing inventory:', error);
    return NextResponse.json(
      { success: false, error: `Failed to reduce inventory: ${error.message}` },
      { status: 500 }
    );
  }
}
