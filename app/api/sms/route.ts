import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/lib/sms';

// POST send SMS
export async function POST(request: NextRequest) {
  try {
    const { mobile, message, type } = await request.json();
    
    if (!mobile || !message) {
      return NextResponse.json({ 
        success: false, 
        error: 'Mobile number and message are required' 
      }, { status: 400 });
    }

    let smsResponse;
    
    switch (type) {
      case 'test':
        // Send a test message
        smsResponse = await smsService.sendSMS(mobile, message);
        break;
      case 'custom':
        // Send custom message
        smsResponse = await smsService.sendSMS(mobile, message);
        break;
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid SMS type. Use "test" or "custom"' 
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      smsResponse,
      message: 'SMS sent successfully'
    });

  } catch (error) {
    console.error('SMS API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send SMS' 
    }, { status: 500 });
  }
}

// GET SMS configuration status
export async function GET() {
  try {
    const config = {
      userId: process.env.SMS_USER_ID ? 'Configured' : 'Not configured',
      password: process.env.SMS_PASSWORD ? 'Configured' : 'Not configured',
      senderId: process.env.SMS_SENDER_ID || 'LUXURY',
      apiUrl: 'https://portal.zettatel.com/SMSApi/send'
    };

    return NextResponse.json({
      success: true,
      config,
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