import { NextRequest, NextResponse } from 'next/server';
import {
  requestStockAlertOtp,
  stockAlertCookieOptions,
  verifyStockAlertOtp,
} from '@/lib/stock-alert';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await request.json().catch(() => ({}));
    const action = body.action === 'verify' ? 'verify' : 'request';

    if (action === 'request') {
      const result = await requestStockAlertOtp(token);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    const result = await verifyStockAlertOtp(token, String(body.otp || ''));
    if (!result.success || !result.session) {
      return NextResponse.json(result, { status: 400 });
    }

    const response = NextResponse.json({ success: true, message: 'OTP verified' });
    response.cookies.set(result.cookieName, result.session, stockAlertCookieOptions());
    return response;
  } catch (error) {
    console.error('Stock alert OTP error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'OTP failed' },
      { status: 500 }
    );
  }
}
