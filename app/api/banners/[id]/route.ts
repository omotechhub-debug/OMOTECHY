import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Banner from '@/lib/models/Banner';
import { requireAdmin } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET single banner
export const GET = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    
    const { id } = await params;
    const banner = await Banner.findById(id);
    
    if (!banner) {
      return NextResponse.json(
        { success: false, message: 'Banner not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, banner });
  } catch (error) {
    console.error('Error fetching banner:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch banner' },
      { status: 500 }
    );
  }
};

// PUT update banner
export const PUT = requireAdmin(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    
    const { id } = await params;
    const formData = await request.formData();
    
    const title = formData.get('title') as string;
    const subtitle = formData.get('subtitle') as string;
    const description = formData.get('description') as string;
    const linkUrl = formData.get('linkUrl') as string;
    const isActive = formData.get('isActive') === 'true';
    const position = parseInt(formData.get('position') as string) || 0;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    
    const bannerFile = formData.get('bannerImage') as File | null;
    let bannerImageUrl = formData.get('bannerImageUrl') as string | undefined;
    
    // New fields for full hero/slider management
    let button1, button2, badges, reviewSnippet;
    try {
      button1 = formData.get('button1') ? JSON.parse(formData.get('button1') as string) : undefined;
      button2 = formData.get('button2') ? JSON.parse(formData.get('button2') as string) : undefined;
      badges = formData.get('badges') ? JSON.parse(formData.get('badges') as string) : undefined;
      reviewSnippet = formData.get('reviewSnippet') ? JSON.parse(formData.get('reviewSnippet') as string) : undefined;
    } catch (e) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in one of the hero fields' },
        { status: 400 }
      );
    }
    
    // Upload new image to Cloudinary if provided
    if (bannerFile && bannerFile.size > 0) {
      const arrayBuffer = await bannerFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const uploadRes = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ folder: 'banners' }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }).end(buffer);
      });
      
      bannerImageUrl = (uploadRes as any).secure_url;
    }
    
    const updateData: any = {
      title,
      subtitle,
      description,
      linkUrl,
      isActive,
      position,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      button1,
      button2,
      badges,
      reviewSnippet,
    };
    
    if (bannerImageUrl) {
      updateData.bannerImage = bannerImageUrl;
    }
    
    const banner = await Banner.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!banner) {
      return NextResponse.json(
        { success: false, message: 'Banner not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, banner });
  } catch (error) {
    console.error('Error updating banner:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update banner' },
      { status: 500 }
    );
  }
});

// DELETE banner
export const DELETE = requireAdmin(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    
    const { id } = await params;
    const banner = await Banner.findByIdAndDelete(id);
    
    if (!banner) {
      return NextResponse.json(
        { success: false, message: 'Banner not found' },
        { status: 404 }
      );
    }
    
    // Optionally delete the image from Cloudinary
    if (banner.bannerImage) {
      try {
        const publicId = banner.bannerImage.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (cloudinaryError) {
        console.error('Error deleting image from Cloudinary:', cloudinaryError);
        // Don't fail the request if Cloudinary deletion fails
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Banner deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete banner' },
      { status: 500 }
    );
  }
});
