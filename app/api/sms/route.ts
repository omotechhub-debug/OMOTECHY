import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/lib/sms';
import { sendPurchaseConfirmationIfNeeded } from '@/lib/purchase-confirmation-sms';
import { getSmsRuntimeConfig, publicSmsConfig } from '@/lib/sms-config';
import connectDB from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';

const SMS_MAX_LENGTH = 1600;

async function resolveBulkRecipients(audience: string, recipients: unknown): Promise<string[]> {
  if (audience === 'all' || audience === 'new') {
    await connectDB();
    const query: Record<string, unknown> = {};
    if (audience === 'new') {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      query.createdAt = { $gte: twoWeeksAgo };
    }
    const rows = await Customer.find(query, { phone: 1 }).lean().maxTimeMS(20000);
    return rows
      .map((row: { phone?: string }) => normalizeKenyaPhoneLocal(row.phone) || '')
      .filter(Boolean);
  }

  const list = Array.isArray(recipients) ? recipients : [];
  return list
    .map((phone) => normalizeKenyaPhoneLocal(phone) || '')
    .filter(Boolean);
}

// POST send SMS
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobile, message, type, orderId, audience, recipients } = body;

    if (type === 'purchase_confirmation') {
      if (!orderId) {
        return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
      }
      const result = await sendPurchaseConfirmationIfNeeded(orderId);
      return NextResponse.json({
        success: result.sent || result.reason === 'already_sent' || result.reason === 'already_sent_or_unpaid',
        sent: result.sent,
        reason: result.reason,
        message: result.sent ? 'Purchase confirmation SMS sent' : 'SMS not sent',
      });
    }

    if (type === 'bulk') {
      const text = String(message || '').trim();
      if (!text) {
        return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
      }
      if (text.length > SMS_MAX_LENGTH) {
        return NextResponse.json({ success: false, error: `Message must be ${SMS_MAX_LENGTH} characters or less` }, { status: 400 });
      }

      const phones = await resolveBulkRecipients(audience || 'specific', recipients);
      if (phones.length === 0) {
        return NextResponse.json({ success: false, error: 'No clients with valid Kenyan phone numbers' }, { status: 400 });
      }

      const result = await smsService.sendBulkSMS(phones, text);
      return NextResponse.json({
        success: result.sent > 0,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        errors: result.errors,
        total: phones.length,
        message: result.sent > 0 ? 'SMS sent' : 'SMS failed',
      });
    }
    
    if (!mobile || !message) {
      return NextResponse.json({ 
        success: false, 
        error: 'Mobile number and message are required' 
      }, { status: 400 });
    }

    let smsResponse;
    
    switch (type) {
      case 'test':
        smsResponse = await smsService.sendSMS(mobile, message);
        break;
      case 'custom':
        smsResponse = await smsService.sendSMS(mobile, message);
        break;
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid SMS type. Use "test", "custom", "bulk", or "purchase_confirmation"' 
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      smsResponse,
      message: 'SMS sent successfully'
    });

  } catch (error) {
    console.error('SMS API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send SMS';
    return NextResponse.json({ 
      success: false, 
      error: message 
    }, { status: 500 });
  }
}

// GET SMS configuration status (no secrets)
export async function GET() {
  try {
    const runtime = await getSmsRuntimeConfig();
    return NextResponse.json({
      success: true,
      config: publicSmsConfig(runtime),
      message: 'SMS configuration status'
    });

  } catch (error) {
    console.error('SMS config error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get SMS configuration' 
    }, { status: 500 });
  }
} 