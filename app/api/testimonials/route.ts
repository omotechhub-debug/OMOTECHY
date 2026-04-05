import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Testimonial from '@/lib/models/Testimonial';

// GET - Retrieve approved testimonials for public display
export async function GET() {
  try {
    console.log('🔍 Fetching testimonials...');
    await connectDB();
    
    const testimonials = await Testimonial.find({ status: 'approved' })
      .sort({ submittedAt: -1 })
      .limit(10)
      .select('name role content rating image submittedAt gender');
    
    console.log(`✅ Found ${testimonials.length} approved testimonials`);
    return NextResponse.json({ 
      success: true, 
      data: testimonials 
    });
  } catch (error) {
    console.error('❌ Error fetching testimonials:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch testimonials' },
      { status: 500 }
    );
  }
}

// POST - Add new testimonial (no authentication required)
export async function POST(request: NextRequest) {
  console.log('📝 Starting testimonial submission...');
  
  try {
    console.log('🔗 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected');
    
    const body = await request.json();
    console.log('📋 Received data:', { 
      name: body.name, 
      role: body.role, 
      rating: body.rating, 
      contentLength: body.content?.length 
    });
    
    const { name, role, content, rating, email, phone, gender } = body;
    
    // Basic validation
    if (!name || !content || !rating || !gender) {
      console.log('❌ Validation failed: missing required fields');
      return NextResponse.json(
        { success: false, message: 'Name, content, rating, and gender are required' },
        { status: 400 }
      );
    }
    
    if (rating < 1 || rating > 5) {
      console.log('❌ Validation failed: invalid rating');
      return NextResponse.json(
        { success: false, message: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }
    
    if (content.length < 10) {
      console.log('❌ Validation failed: content too short');
      return NextResponse.json(
        { success: false, message: 'Testimonial content must be at least 10 characters' },
        { status: 400 }
      );
    }
    
    if (content.length > 1000) {
      console.log('❌ Validation failed: content too long');
      return NextResponse.json(
        { success: false, message: 'Testimonial content cannot exceed 1000 characters' },
        { status: 400 }
      );
    }
    
    if (!['male', 'female'].includes(gender)) {
      console.log('❌ Validation failed: invalid gender');
      return NextResponse.json(
        { success: false, message: 'Gender must be either male or female' },
        { status: 400 }
      );
    }
    
    console.log('✅ Validation passed, creating testimonial...');
    
    // Create new testimonial
    const testimonial = new Testimonial({
      name: name.trim(),
      role: role?.trim() || '',
      content: content.trim(),
      rating: parseInt(rating),
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      gender: gender,
      status: 'pending', // All new testimonials start as pending
      submittedAt: new Date(),
    });
    
    console.log('💾 Saving testimonial to database...');
    await testimonial.save();
    console.log('✅ Testimonial saved successfully:', testimonial._id);
    
    return NextResponse.json({
      success: true,
      message: 'Testimonial submitted successfully! It will be reviewed and published soon.',
      data: {
        id: testimonial._id,
        name: testimonial.name,
        status: testimonial.status,
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error creating testimonial:', error);
    
    // Handle mongoose validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      console.log('❌ Mongoose validation error');
      return NextResponse.json(
        { success: false, message: 'Invalid testimonial data' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to submit testimonial' },
      { status: 500 }
    );
  }
}

// Simple test endpoint
export async function PUT() {
  return NextResponse.json({
    success: true,
    message: 'Testimonials API is accessible',
    timestamp: new Date().toISOString()
  });
} 