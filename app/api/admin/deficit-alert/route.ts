import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { sendDeficitOrdersIfAfternoonLogin } from '@/lib/login-alerts';

export const POST = requireSuperAdmin(async () => {
  try {
    const result = await sendDeficitOrdersIfAfternoonLogin({ force: true });
    return NextResponse.json({
      success: result.sent,
      ...result,
      message: result.sent
        ? 'Partial-payment SMS sent'
        : result.reason === 'not_configured'
          ? 'Add a superadmin number in SMS Settings first'
          : 'Partial-payment SMS was not sent',
    });
  } catch (error) {
    console.error('Deficit alert test error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send partial-payment SMS' },
      { status: 500 }
    );
  }
});
