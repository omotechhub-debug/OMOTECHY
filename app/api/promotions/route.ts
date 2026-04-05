import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Promotion from '@/lib/models/Promotion';
import { requireAdmin } from '@/lib/auth';
import { updatePromotionStatuses } from '@/lib/promotion-utils';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET() {
  await dbConnect();
  
  // Auto-update promotion statuses before fetching
  console.log('🔄 Checking for promotion status updates...');
  await updatePromotionStatuses();
  
  const promotions = await Promotion.find().sort({ createdAt: -1 });
  return NextResponse.json({ success: true, promotions });
}

export const POST = requireAdmin(async (req: NextRequest) => {
  await dbConnect();
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

  const promo = await Promotion.create({
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
    bannerImage: bannerImageUrl,
    createdBy: user.userId,
  });
  return NextResponse.json({ success: true, promotion: promo });
}); 