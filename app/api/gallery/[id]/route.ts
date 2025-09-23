import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Gallery from '@/lib/models/Gallery';
import { requireAdmin } from '@/lib/auth';

// GET /api/gallery/[id] - Get single gallery item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const galleryItem = await Gallery.findById(id).lean();
    
    if (!galleryItem) {
      return NextResponse.json(
        { error: 'Gallery item not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      gallery: galleryItem,
    });
    
  } catch (error) {
    console.error('Error fetching gallery item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery item' },
      { status: 500 }
    );
  }
}

// PUT /api/gallery/[id] - Update gallery item (admin only)
export const PUT = requireAdmin(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();
    
    const { id } = await params;
    const body = await request.json();
    const { title, description, mediaUrl, mediaType, category, status, featured, order } = body;
    
    const galleryItem = await Gallery.findById(id);
    
    if (!galleryItem) {
      return NextResponse.json(
        { error: 'Gallery item not found' },
        { status: 404 }
      );
    }
    
    // Update fields if provided
    if (title !== undefined) galleryItem.title = title;
    if (description !== undefined) galleryItem.description = description;
    if (mediaUrl !== undefined) galleryItem.mediaUrl = mediaUrl;
    if (mediaType !== undefined) galleryItem.mediaType = mediaType;
    if (category !== undefined) galleryItem.category = category;
    if (status !== undefined) galleryItem.status = status;
    if (featured !== undefined) galleryItem.featured = featured;
    if (order !== undefined) galleryItem.order = order;
    
    await galleryItem.save();
    
    return NextResponse.json({
      success: true,
      gallery: galleryItem,
    });
    
  } catch (error: any) {
    console.error('Error updating gallery item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update gallery item' },
      { status: 500 }
    );
  }
});

// DELETE /api/gallery/[id] - Delete gallery item (admin only)
export const DELETE = requireAdmin(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();
    
    const { id } = await params;
    const galleryItem = await Gallery.findByIdAndDelete(id);
    
    if (!galleryItem) {
      return NextResponse.json(
        { error: 'Gallery item not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Gallery item deleted successfully',
    });
    
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    return NextResponse.json(
      { error: 'Failed to delete gallery item' },
      { status: 500 }
    );
  }
}); 