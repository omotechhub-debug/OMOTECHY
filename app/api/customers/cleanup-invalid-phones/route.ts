import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import { requireAdmin } from '@/lib/auth';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';

function isRealKenyaNumber(phone: unknown) {
  return !!normalizeKenyaPhoneLocal(phone);
}

export const POST = requireAdmin(async (req: NextRequest) => {
  try {
    await dbConnect();

    const body = await req.json().catch(() => ({}));
    const confirm = body?.confirm === true;

    const customers = await Customer.find({}).select('_id phone').lean();
    const invalid = customers.filter((customer) => !isRealKenyaNumber(customer.phone));

    if (!confirm) {
      return NextResponse.json({
        success: true,
        invalidCount: invalid.length,
        total: customers.length,
        kept: customers.length - invalid.length,
      });
    }

    if (invalid.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        scanned: customers.length,
        message: 'No clients without a real Kenyan phone number were found.',
      });
    }

    const result = await Customer.deleteMany({
      _id: { $in: invalid.map((customer) => customer._id) },
    });

    return NextResponse.json({
      success: true,
      deleted: result.deletedCount || 0,
      scanned: customers.length,
      kept: customers.length - (result.deletedCount || 0),
    });
  } catch (error: any) {
    console.error('cleanup-invalid-phones:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete clients without real numbers' },
      { status: 500 }
    );
  }
});
