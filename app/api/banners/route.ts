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

// GET all banners
export const GET = async (request: NextRequest) => {
  try {
    console.log('🚀 FAST Banner API: Starting...');
    const startTime = Date.now();
    
    // Safely parse URL parameters
    let searchParams;
    try {
      if (!request.url) {
        console.error('Request URL is undefined in banners route');
        return NextResponse.json(
          { success: false, error: 'Request URL is undefined' },
          { status: 400 }
        );
      }
      const url = new URL(request.url);
      searchParams = url.searchParams;
    } catch (error) {
      console.error('Error parsing URL in banners route:', error);
      console.error('Request URL:', request.url);
      return NextResponse.json(
        { success: false, error: 'Invalid URL' },
        { status: 400 }
      );
    }
    
    const activeOnly = searchParams.get('active') === 'true';
    
    // Ultra-fast DB connection and query for homepage banners
    if (activeOnly) {
      await connectDB();
      const connectTime = Date.now() - startTime;
      
      // Optimized query for homepage - only essential fields
      const queryStart = Date.now();
      const banners = await Banner.find(
        { isActive: true },
        {
          title: 1,
          description: 1,
          bannerImage: 1,
          position: 1,
          button1: 1,
          button2: 1,
          badges: 1,
          reviewSnippet: 1,
          _id: 1
        }
      )
      .sort({ position: 1 })
      .limit(5) // Only first 5 banners for speed
      .lean()
      .hint({ isActive: 1, position: 1 }); // Use index hint
      
      const queryTime = Date.now() - queryStart;
      console.log(`⚡ FAST Banner API: DB(${connectTime}ms) + Query(${queryTime}ms) = ${Date.now() - startTime}ms TOTAL`);
      
      // Aggressive caching for homepage banners
      const response = NextResponse.json({ success: true, banners });
      response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
      response.headers.set('CDN-Cache-Control', 'public, s-maxage=600');
      response.headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=600');
      
      return response;
    }
    
    // Regular query for admin panel
    await connectDB();
    const banners = await Banner.find({})
      .sort({ position: 1, createdAt: -1 })
      .lean();
    
    console.log(`✅ Banner API: Found ${banners.length} banners in ${Date.now() - startTime}ms`);
    return NextResponse.json({ success: true, banners });
    
  } catch (error) {
    console.error('❌ Banner API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch banners' },
      { status: 500 }
    );
  }
};

// POST create new banner
export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    await connectDB();
    
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
    
    // Upload image to Cloudinary if provided
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
    
    if (!bannerImageUrl) {
      return NextResponse.json(
        { success: false, message: 'Banner image is required' },
        { status: 400 }
      );
    }
    
    const banner = await Banner.create({
      title,
      subtitle,
      description,
      bannerImage: bannerImageUrl,
      linkUrl,
      isActive,
      position,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      button1,
      button2,
      badges,
      reviewSnippet,
    });
    
    return NextResponse.json({ success: true, banner });
  } catch (error) {
    console.error('Error creating banner:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create banner' },
      { status: 500 }
    );
  }
});
