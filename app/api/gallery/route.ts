import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Gallery from '@/lib/models/Gallery';
import { requireAuth, requireAdmin } from '@/lib/auth';

// GET /api/gallery - Get all gallery items (public)
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';
    const featured = searchParams.get('featured');
    
    let query: any = { status };
    
    if (category) {
      query.category = category;
    }
    
    if (featured === 'true') {
      query.featured = true;
    }
    
    console.log('Gallery API query:', query);
    
    // First, let's see ALL gallery items in the database
    const allItems = await Gallery.find({}).lean();
    console.log('ALL gallery items in database:', allItems.length);
    console.log('ALL gallery items:', allItems);
    
    const galleryItems = await Gallery.find(query)
      .sort({ order: 1, createdAt: -1 })
      .lean();
    
    console.log('Gallery API found items:', galleryItems.length);
    console.log('Gallery API items:', galleryItems);
    
    return NextResponse.json({
      success: true,
      gallery: galleryItems,
    });
    
  } catch (error) {
    console.error('Error fetching gallery:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery items' },
      { status: 500 }
    );
  }
}

// POST /api/gallery - Create new gallery item (admin only)
export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    await connectDB();
    
    const body = await request.json();
    const { title, description, mediaUrl, mediaType, category, featured, order } = body;
    
    console.log('Creating gallery item with data:', body);
    
    // Validate required fields
    if (!title || !mediaUrl || !mediaType) {
      return NextResponse.json(
        { error: 'Title, media URL, and media type are required' },
        { status: 400 }
      );
    }
    
    const galleryItem = new Gallery({
      title,
      description,
      mediaUrl,
      mediaType,
      category: category || 'other',
      featured: featured || false,
      order: order || 0,
    });
    
    console.log('Gallery item to save:', galleryItem);
    
    await galleryItem.save();
    
    console.log('Gallery item saved successfully:', galleryItem);
    
    return NextResponse.json({
      success: true,
      gallery: galleryItem,
    });
    
  } catch (error: any) {
    console.error('Error creating gallery item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create gallery item' },
      { status: 500 }
    );
  }
}); 