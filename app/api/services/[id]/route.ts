import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Service from '@/lib/models/Service';
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

    const service = await Service.findById(id).lean();

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

    const { name, description, category, price, turnaround, features, image, active, featured } = await request.json();

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
    if (turnaround !== undefined) service.turnaround = turnaround.trim();
    if (features !== undefined) service.features = features;
    if (image !== undefined) service.image = image;
    if (active !== undefined) service.active = active;
    if (featured !== undefined) service.featured = featured;

    await service.save();

    return NextResponse.json({
      success: true,
      service,
      message: 'Service updated successfully'
    });

  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update service' },
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