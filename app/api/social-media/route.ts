import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SocialMedia from '@/lib/models/SocialMedia';
import { verifyToken } from '@/lib/auth';
import User from '@/lib/models/User';

// GET all social media links (public)
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const socialMediaLinks = await SocialMedia.find({ isActive: true }).sort({ platform: 1 });
    
    return NextResponse.json({ 
      success: true,
      data: socialMediaLinks 
    });
  } catch (error: any) {
    console.error('Error fetching social media links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social media links', details: error.message },
      { status: 500 }
    );
  }
}

// POST/PUT - Update social media links (admin only)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin, superadmin, or manager
    const user = await User.findById(decoded.userId);
    if (!user || !['admin', 'superadmin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { links } = body;

    if (!Array.isArray(links)) {
      return NextResponse.json(
        { error: 'Links must be an array' },
        { status: 400 }
      );
    }

    const results = [];

    for (const link of links) {
      const { platform, url, isActive = true } = link;

      if (!platform || !url) {
        continue; // Skip invalid entries
      }

      if (!['instagram', 'facebook', 'twitter', 'tiktok'].includes(platform)) {
        continue; // Skip invalid platforms
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        continue; // Skip invalid URLs
      }

      // Update or create social media link
      const socialMedia = await SocialMedia.findOneAndUpdate(
        { platform },
        { 
          url,
          isActive,
          updatedAt: new Date()
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );

      results.push(socialMedia);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Social media links updated successfully',
      data: results 
    });
  } catch (error: any) {
    console.error('Error updating social media links:', error);
    return NextResponse.json(
      { error: 'Failed to update social media links', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update social media links (admin only)
export async function PUT(request: NextRequest) {
  return POST(request); // Use same logic as POST
}

