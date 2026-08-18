import { NextRequest, NextResponse } from 'next/server';
import { findStockAlertByToken, readStockAlertSession, SESSION_COOKIE } from '@/lib/stock-alert';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const session = readStockAlertSession(token, request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ success: false, error: 'OTP required' }, { status: 401 });
    }

    const link = await findStockAlertByToken(token);
    if (!link) {
      return NextResponse.json({ success: false, error: 'This link is invalid or has expired' }, { status: 404 });
    }

    const header = ['Status', 'Item', 'SKU', 'Stock', 'Minimum', 'Unit', 'Category'];
    const rows = link.items.map((item) => [
      item.status === 'out_of_stock' ? 'Out of stock' : 'Low stock',
      item.name,
      item.sku,
      String(item.stock),
      String(item.minStock),
      item.unit,
      item.category,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="omotech-stock-alert-${link.dateKey}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Stock alert download error:', error);
    return NextResponse.json({ success: false, error: 'Failed to download' }, { status: 500 });
  }
}
