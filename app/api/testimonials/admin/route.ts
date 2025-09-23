import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Testimonial from '@/lib/models/Testimonial';
import { requireAdmin, getTokenFromRequest, verifyToken } from '@/lib/auth';

// GET - Retrieve all testimonials for admin management
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectDB();
    
    const testimonials = await Testimonial.find()
      .sort({ submittedAt: -1 })
      .select('name role content rating image status submittedAt reviewedAt reviewedBy gender');
    
    return NextResponse.json({ 
      success: true, 
      data: testimonials 
    });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch testimonials' },
      { status: 500 }
    );
  }
}

// PATCH - Update testimonial status (approve/reject)
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectDB();
    
    const body = await request.json();
    const { testimonialId, status } = body;
    
    if (!testimonialId || !status) {
      return NextResponse.json(
        { success: false, message: 'Testimonial ID and status are required' },
        { status: 400 }
      );
    }
    
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Status must be either "approved" or "rejected"' },
        { status: 400 }
      );
    }
    
    const testimonial = await Testimonial.findByIdAndUpdate(
      testimonialId,
      {
        status,
        reviewedAt: new Date(),
        reviewedBy: decoded.name || decoded.email,
      },
      { new: true }
    );
    
    if (!testimonial) {
      return NextResponse.json(
        { success: false, message: 'Testimonial not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Testimonial ${status} successfully`,
      data: testimonial
    });
    
  } catch (error) {
    console.error('Error updating testimonial:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update testimonial' },
      { status: 500 }
    );
  }
}

// DELETE - Delete testimonial
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const testimonialId = searchParams.get('id');
    
    if (!testimonialId) {
      return NextResponse.json(
        { success: false, message: 'Testimonial ID is required' },
        { status: 400 }
      );
    }
    
    const testimonial = await Testimonial.findByIdAndDelete(testimonialId);
    
    if (!testimonial) {
      return NextResponse.json(
        { success: false, message: 'Testimonial not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Testimonial deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete testimonial' },
      { status: 500 }
    );
  }
} 