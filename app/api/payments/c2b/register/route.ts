import { NextRequest, NextResponse } from 'next/server';
import { mpesaService } from '@/lib/mpesa';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Authentication !!!!! required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('Admin attempting to register C2B URLs...');

    // Register URLs with M-Pesa
    const result = await mpesaService.registerC2BURLs();

    if (result.success) {
      console.log('✅ C2B URLs registered successfully');
      return NextResponse.json({
        success: true,
        message: 'C2B URLs registered successfully with M-Pesa',
        data: {
          originatorConversationID: result.originatorCoversationID,
          responseCode: result.responseCode,
          responseDescription: result.responseDescription
        }
      });
    } else {
      console.error('❌ C2B URL registration failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to register C2B URLs'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error in C2B URL registration:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check current registration status
export async function GET(request: NextRequest) {
  //TODO: Implement this endpoint
  try {
    // Verify admin authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const validationURL = process.env.MPESA_C2B_VALIDATION_URL;
    const confirmationURL = process.env.MPESA_C2B_CONFIRMATION_URL;
    const responseType = process.env.MPESA_C2B_RESPONSE_TYPE || 'Completed';
    const enableValidation = process.env.MPESA_C2B_ENABLE_VALIDATION === 'true';

    return NextResponse.json({
      configured: !!(validationURL && confirmationURL),
      settings: {
        validationURL,
        confirmationURL,
        responseType,
        enableValidation,
        environment: process.env.MPESA_ENVIRONMENT || 'sandbox'
      }
    });

  } catch (error: any) {
    console.error('Error checking C2B configuration:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 