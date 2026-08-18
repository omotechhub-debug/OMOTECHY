import { NextRequest, NextResponse } from 'next/server';
import {
  findStockAlertByToken,
  maskPhone,
  readStockAlertSession,
  SESSION_COOKIE,
} from '@/lib/stock-alert';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const link = await findStockAlertByToken(token);
    if (!link) {
      return NextResponse.json({ success: false, error: 'This link is invalid or has expired' }, { status: 404 });
    }

    const session = readStockAlertSession(token, request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({
        success: true,
        verified: false,
        phoneMasked: maskPhone(link.phone),
        outCount: link.items.filter((item) => item.status === 'out_of_stock').length,
        lowCount: link.items.filter((item) => item.status === 'low_stock').length,
      });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      phoneMasked: maskPhone(link.phone),
      dateKey: link.dateKey,
      items: link.items,
    });
  } catch (error) {
    console.error('Stock alert GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load stock alert' }, { status: 500 });
  }
}
