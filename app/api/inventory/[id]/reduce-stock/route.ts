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
    let { quantity, stationId } = body;
    
    // Ensure quantity is a number
    quantity = typeof quantity === 'string' ? parseInt(quantity, 10) : Number(quantity);
    quantity = Math.round(quantity);
    
    console.log(`📦 Reduce Stock API called:`, {
      inventoryId: params.id,
      quantity: quantity,
      quantityType: typeof body.quantity,
      originalQuantity: body.quantity,
      stationId: stationId
    });

    if (!quantity || quantity <= 0 || isNaN(quantity)) {
      console.error(`❌ Invalid quantity received:`, { quantity, original: body.quantity });
      return NextResponse.json(
        { success: false, error: `Invalid quantity: ${body.quantity}` },
        { status: 400 }
      );
    }

    if (!stationId || !mongoose.Types.ObjectId.isValid(stationId)) {
      console.error(`❌ Invalid station ID:`, stationId);
      return NextResponse.json(
        { success: false, error: 'Invalid station ID' },
        { status: 400 }
      );
    }

    // Find the inventory item
    const inventoryItem = await Inventory.findById(params.id);
    if (!inventoryItem) {
      console.error(`❌ Inventory item not found:`, params.id);
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    console.log(`📋 Inventory item found:`, {
      name: inventoryItem.name,
      currentStock: inventoryItem.stock,
      requestedReduction: quantity,
      stationIds: inventoryItem.stationIds.map(id => id.toString())
    });

    // Check if the item is assigned to the station
    const isAssignedToStation = inventoryItem.stationIds.some(
      (id: mongoose.Types.ObjectId) => id.toString() === stationId
    );

    if (!isAssignedToStation) {
      console.error(`❌ Item "${inventoryItem.name}" not assigned to station ${stationId}`);
      return NextResponse.json(
        { success: false, error: 'Item not assigned to this station' },
        { status: 403 }
      );
    }

    // Check if there's enough stock
    if (inventoryItem.stock < quantity) {
      console.error(`❌ Insufficient stock for "${inventoryItem.name}": Available: ${inventoryItem.stock}, Requested: ${quantity}`);
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient stock. Available: ${inventoryItem.stock}, Requested: ${quantity}` 
        },
        { status: 400 }
      );
    }

    // Reduce the stock
    const previousStock = inventoryItem.stock;
    inventoryItem.stock -= quantity;
    await inventoryItem.save();

    console.log(`✅ Inventory reduced for "${inventoryItem.name}": ${quantity} units. Stock: ${previousStock} → ${inventoryItem.stock}`);

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
