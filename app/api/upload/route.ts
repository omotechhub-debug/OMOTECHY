import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireAdmin } from '@/lib/auth';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Maximum file sizes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB for videos

export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Determine file type and validate
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Only image and video files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size based on type
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        { error: `${isImage ? 'Image' : 'Video'} file size must be less than ${maxSizeMB}MB` },
        { status: 400 }
      );
    }

    console.log(`Uploading ${isImage ? 'image' : 'video'}: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64String = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Upload to Cloudinary with appropriate settings
    const uploadOptions: any = {
      folder: 'ecolaundryservices',
      resource_type: isVideo ? 'video' : 'auto',
      timeout: isVideo ? 120000 : 60000, // 2 minutes for videos, 1 minute for images
      chunk_size: 6000000, // 6MB chunks
    };

    // For videos, add additional options
    if (isVideo) {
      uploadOptions.eager = [
        { width: 640, height: 480, crop: 'scale' },
        { width: 320, height: 240, crop: 'scale' }
      ];
      uploadOptions.eager_async = true;
    }

    const result = await cloudinary.uploader.upload(base64String, uploadOptions);

    console.log(`Upload successful: ${result.secure_url}`);

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      mediaType: isImage ? 'image' : 'video',
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    
    // Handle specific Cloudinary errors
    if (error.error && error.error.http_code === 499) {
      return NextResponse.json(
        { error: 'Upload timeout. Please try again with a smaller file or check your internet connection.' },
        { status: 408 }
      );
    }
    
    if (error.error && error.error.http_code === 400) {
      return NextResponse.json(
        { error: 'Invalid file format or corrupted file.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}); 