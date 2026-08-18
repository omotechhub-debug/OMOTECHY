import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { sendMorningStockAlert } from '@/lib/stock-alert';

export const POST = requireSuperAdmin(async () => {
  try {
    const result = await sendMorningStockAlert({ force: true });
    return NextResponse.json({
      success: result.sent,
      ...result,
      message: result.sent
        ? 'Stock alert SMS sent'
        : result.reason === 'not_configured'
          ? 'Add a superadmin number in SMS Settings first'
          : 'Stock alert was not sent',
    });
  } catch (error) {
    console.error('Stock alert test error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send stock alert' },
      { status: 500 }
    );
  }
});
