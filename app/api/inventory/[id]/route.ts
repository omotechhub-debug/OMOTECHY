import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Inventory from '@/lib/models/Inventory';
import Station from '@/lib/models/Station';
import { requireAdmin } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid inventory ID' },
        { status: 400 }
      );
    }

    const inventory = await Inventory.findById(params.id)
      .populate({
        path: 'stationIds',
        select: 'name location',
        options: { strictPopulate: false }
      })
      .lean();

    if (!inventory) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: inventory
    });

  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory item' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('PUT request started for ID:', params.id);
    await requireAdmin(request);
    console.log('Admin auth passed');
    await connectDB();
    console.log('Database connected');

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      console.log('Invalid ID:', params.id);
      return NextResponse.json(
        { success: false, error: 'Invalid inventory ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));

    // Validate stationIds
    if (!body.stationIds || !Array.isArray(body.stationIds) || body.stationIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one station must be selected' },
        { status: 400 }
      );
    }

    // Handle stationIds conversion
    if (body.stationIds && Array.isArray(body.stationIds)) {
      body.stationIds = body.stationIds.map(id => {
        if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
          return new mongoose.Types.ObjectId(id);
        }
        return id;
      });
    }

    // Update the inventory item
    const inventory = await Inventory.findByIdAndUpdate(
      params.id,
      { 
        ...body,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    console.log('Update completed, result:', inventory ? 'Success' : 'Not found');
    console.log('Updated inventory stationIds:', inventory?.stationIds);

    if (!inventory) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Manually populate station data for the response
    let inventoryWithStations = inventory;
    if (inventory.stationIds && inventory.stationIds.length > 0) {
      try {
        const stations = await Station.find({ _id: { $in: inventory.stationIds } }).select('name location').lean();
        inventoryWithStations = { ...inventory, stationIds: stations };
        console.log('Populated stations for response:', stations);
      } catch (error) {
        console.error('Error populating stations in response:', error);
        inventoryWithStations = { ...inventory, stationIds: [] };
      }
    }

    return NextResponse.json({
      success: true,
      data: inventoryWithStations,
      message: 'Inventory item updated successfully'
    });

  } catch (error) {
    console.error('Error updating inventory item:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { success: false, error: `Failed to update inventory item: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const inventory = await Inventory.findByIdAndDelete(params.id);

    if (!inventory) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete inventory item' },
      { status: 500 }
    );
  }
}
