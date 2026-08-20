import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

function isCronAuthorized(request: NextRequest) {
  const secret = (process.env.CRON_SECRET || '').trim();
  const auth = request.headers.get('authorization') || '';
  const headerSecret = request.headers.get('x-cron-secret') || '';
  if (request.headers.get('x-vercel-cron')) return true;
  if (secret && (auth === `Bearer ${secret}` || headerSecret === secret)) return true;
  return false;
}

async function handleCron() {
  return NextResponse.json({ success: true, sent: false, reason: 'disabled' });
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return await handleCron();
  } catch (error) {
    console.error('Morning stock alert cron error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send stock alert' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
