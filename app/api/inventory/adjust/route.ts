import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Inventory from '@/lib/models/Inventory';
import InventoryMovement from '@/lib/models/InventoryMovement';
import { requireAuth } from '@/lib/auth';

// POST adjust inventory stock
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    await connectDB();

    const body = await request.json();
    const { inventoryItemId, quantity, reason, notes } = body;

    // Validate required fields
    if (!inventoryItemId || quantity === undefined || !reason) {
      return NextResponse.json(
        { success: false, error: 'Inventory item ID, quantity, and reason are required' },
        { status: 400 }
      );
    }

    // Find the inventory item
    const inventoryItem = await Inventory.findById(inventoryItemId);
    if (!inventoryItem) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Calculate new stock
    const previousStock = inventoryItem.stock;
    const newStock = Math.max(0, previousStock + quantity);

    // Update inventory
    inventoryItem.stock = newStock;
    await inventoryItem.save();

    // Create movement record
    const movement = new InventoryMovement({
      inventoryItem: inventoryItemId,
      movementType: 'adjustment',
      quantity: quantity,
      previousStock: previousStock,
      newStock: newStock,
      reason: reason,
      reference: `ADJ-${Date.now()}`,
      referenceType: 'adjustment',
      performedBy: new mongoose.Types.ObjectId(), // You might want to get this from auth
      notes: notes || ''
    });
    await movement.save();

    return NextResponse.json({
      success: true,
      message: 'Stock adjusted successfully',
      inventoryItem: {
        _id: inventoryItem._id,
        name: inventoryItem.name,
        sku: inventoryItem.sku,
        previousStock,
        newStock
      },
      movement: {
        _id: movement._id,
        quantity,
        reason,
        createdAt: movement.createdAt
      }
    });

  } catch (error) {
    console.error('Adjust inventory error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to adjust inventory' },
      { status: 500 }
    );
  }
}
