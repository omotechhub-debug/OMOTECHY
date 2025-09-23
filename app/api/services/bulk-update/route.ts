import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Service from '@/lib/models/Service';
import { requireAdmin } from '@/lib/auth';

// PUT bulk update services by category
export const PUT = requireAdmin(async (request: NextRequest) => {
  try {
    await connectDB();
    
    const { category, active } = await request.json();

    if (!category || typeof active !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Category and active status are required' },
        { status: 400 }
      );
    }

    // Update all services in the specified category
    const result = await Service.updateMany(
      { category },
      { active, updatedAt: new Date() }
    );

    return NextResponse.json({
      success: true,
      message: `Updated ${result.modifiedCount} services in category "${category}"`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Bulk update services error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update services' },
      { status: 500 }
    );
  }
});
