import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { sendPendingConfirmationsIfEveningLogin } from '@/lib/login-alerts';

export const POST = requireSuperAdmin(async () => {
  try {
    const result = await sendPendingConfirmationsIfEveningLogin({ force: true });
    return NextResponse.json({
      success: result.sent,
      ...result,
      message: result.sent
        ? 'Pending-confirmations SMS sent'
        : result.reason === 'not_configured'
          ? 'Add a superadmin number in SMS Settings first'
          : 'Pending-confirmations SMS was not sent',
    });
  } catch (error) {
    console.error('Pending confirmations alert test error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send pending-confirmations SMS' },
      { status: 500 }
    );
  }
});
