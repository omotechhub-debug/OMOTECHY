import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Service from '@/lib/models/Service';
import Station from '@/lib/models/Station';
import mongoose from 'mongoose';
import { requireAdmin } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid service ID' },
        { status: 400 }
      );
    }

    const service = await Service.findById(id)
      .populate({
        path: 'stationIds',
        select: 'name location',
        options: { strictPopulate: false }
      })
      .lean();

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: service
    });

  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch service' },
      { status: 500 }
    );
  }
}

// PUT update service
export const PUT = requireAdmin(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid service ID' },
        { status: 400 }
      );
    }

    const { name, description, category, price, unit, turnaround, turnaroundUnit, features, image, active, featured, stationIds } = await request.json();

    console.log('Service update request body:', { name, unit, turnaroundUnit, stationIds }); // Debug log

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

    const service = await Service.findById(id);
    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    // Update service fields
    if (name !== undefined) service.name = name.trim();
    if (description !== undefined) service.description = description.trim();
    if (category !== undefined) service.category = category;
    if (price !== undefined) service.price = price.trim();
    if (unit !== undefined) service.unit = unit?.trim();
    if (turnaround !== undefined) service.turnaround = turnaround.trim();
    if (turnaroundUnit !== undefined) service.turnaroundUnit = turnaroundUnit?.trim();
    if (features !== undefined) service.features = features;
    if (image !== undefined) service.image = image;
    if (active !== undefined) service.active = active;
    if (featured !== undefined) service.featured = featured;
    if (stationIds !== undefined) service.stationIds = stationIds;

    try {
      const savedService = await service.save();
      console.log('✅ Service saved successfully to database');
      console.log('📋 Saved service data:', {
        name: savedService.name,
        unit: savedService.unit,
        turnaroundUnit: savedService.turnaroundUnit,
        updatedAt: savedService.updatedAt
      });
    } catch (saveError) {
      console.error('❌ Error saving service:', saveError);
      return NextResponse.json(
        { success: false, error: `Failed to save service: ${saveError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      service,
      message: 'Service updated successfully'
    });

  } catch (error) {
    console.error('Error updating service:', error);
    console.error('Error details:', error.message);
    return NextResponse.json(
      { success: false, error: `Failed to update service: ${error.message}` },
      { status: 500 }
    );
  }
});

// DELETE service
export const DELETE = requireAdmin(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid service ID' },
        { status: 400 }
      );
    }

    const service = await Service.findByIdAndDelete(id);
    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete service' },
      { status: 500 }
    );
  }
});