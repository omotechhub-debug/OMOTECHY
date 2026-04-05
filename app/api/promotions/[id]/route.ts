import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Promotion from '@/lib/models/Promotion';
import { requireAdmin } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const PUT = requireAdmin(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await dbConnect();
  const { id } = await params;
  const user = (req as any).user;
  const formData = await req.formData();
  const bannerFile = formData.get('bannerImage') as File | null;
  let bannerImageUrl = formData.get('bannerImageUrl') as string | undefined;

  if (bannerFile && bannerFile.size > 0) {
    // Upload to Cloudinary
    const arrayBuffer = await bannerFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadRes = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: 'promotions' }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }).end(buffer);
    });
    bannerImageUrl = uploadRes.secure_url;
  }

  const updateData: any = {
    title: formData.get('title'),
    promoCode: formData.get('promoCode'),
    description: formData.get('description'),
    discount: Number(formData.get('discount')),
    discountType: formData.get('discountType'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    status: formData.get('status') || 'scheduled',
    usageLimit: Number(formData.get('usageLimit')),
    minOrderAmount: Number(formData.get('minOrderAmount')),
    maxDiscount: Number(formData.get('maxDiscount')),
    updatedBy: user.userId,
  };

  if (bannerImageUrl) {
    updateData.bannerImage = bannerImageUrl;
  }

  const promotion = await Promotion.findByIdAndUpdate(id, updateData, { new: true });
  
  if (!promotion) {
    return NextResponse.json({ success: false, message: 'Promotion not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, promotion });
});

export const DELETE = requireAdmin(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await dbConnect();
  const { id } = await params;

  const promotion = await Promotion.findByIdAndDelete(id);
  
  if (!promotion) {
    return NextResponse.json({ success: false, message: 'Promotion not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Promotion deleted successfully' });
}); 