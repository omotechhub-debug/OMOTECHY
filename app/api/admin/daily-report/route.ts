import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { kenyaDateKey, previousKenyaDateKey, sendDailyBusinessReport } from '@/lib/daily-business-report';

export const POST = requireAdmin(async () => {
  try {
    const result = await sendDailyBusinessReport({
      dateKey: kenyaDateKey(),
      force: true,
    });
    return NextResponse.json({
      success: result.sent,
      ...result,
      period: 'today',
      yesterday: previousKenyaDateKey(),
      message: result.sent
        ? 'Today’s business report SMS sent'
        : result.reason === 'not_configured'
          ? 'Add a superadmin number in SMS Settings first'
          : 'Report SMS was not sent',
    });
  } catch (error) {
    console.error('Daily report test error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send report SMS' },
      { status: 500 }
    );
  }
});
