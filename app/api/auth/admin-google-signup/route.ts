import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

const JWT_SECRET = process.env.JWT_SECRET;

let googleClient: OAuth2Client | null = null;

function getGoogleClient(): OAuth2Client {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not set in environment variables');
  }
  
  if (!googleClient) {
    googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
  }
  
  return googleClient;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Admin Google signup API called');
    
    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return NextResponse.json(
        { error: 'Server configuration error: JWT_SECRET is not set' },
        { status: 500 }
      );
    }

    let client: OAuth2Client;
    try {
      client = getGoogleClient();
    } catch (error: any) {
      console.error('Google Client ID not configured:', error.message);
      return NextResponse.json(
        { error: 'Google Sign-In is not configured on the server. Please set GOOGLE_CLIENT_ID environment variable.' },
        { status: 500 }
      );
    }

    await connectDB();
    
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { idToken, reason } = requestBody;

    if (!idToken) {
      return NextResponse.json(
        { error: 'Google ID token is required' },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Reason for admin access is required' },
        { status: 400 }
      );
    }

    console.log('Google ID token received, length:', idToken.length);

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Google Client ID not configured' },
        { status: 500 }
      );
    }

    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch (error) {
      console.error('Google token verification error:', error);
      return NextResponse.json(
        { error: 'Invalid Google token' },
        { status: 401 }
      );
    }

    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token payload' },
        { status: 401 }
      );
    }

    const { sub: googleId, email, name } = payload;

    if (!email) {
      return NextResponse.json(
        { error: 'Email not provided by Google' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() }, 
        { googleId }
      ]
    });

    if (existingUser) {
      if (existingUser.role === 'user') {
        return NextResponse.json(
          { 
            error: 'An account with this email already exists as a regular user. Please use a different email or contact support.',
            code: 'EXISTING_USER_ACCOUNT'
          },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { 
            error: 'An admin account with this email already exists. Please use the login page instead.',
            code: 'EXISTING_ADMIN_ACCOUNT'
          },
          { status: 400 }
        );
      }
    }

    // Create new admin user with pending approval
    console.log(`Creating new admin user via Google Sign-In: ${email}`);
    
    const user = new User({
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      googleId,
      authProvider: 'google',
      role: 'admin',
      isActive: true,
      approved: false, // Pending approval
      reasonForAdminAccess: reason.trim(),
      pagePermissions: [] // Will be set when approved
    });

    await user.save();
    console.log(`✅ Admin signup request created via Google: ${email}`);

    // Return success response (no token since not approved yet)
    const response = NextResponse.json({
      success: true,
      message: 'Admin access request submitted successfully. You will be notified when your request is approved.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        approved: user.approved
      }
    });

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;

  } catch (error: any) {
    console.error('Admin Google signup error:', error);
    console.error('Error details:', { 
      message: error?.message, 
      name: error?.name, 
      stack: error?.stack 
    });

    if (error?.message?.includes('MongoDB') || error?.message?.includes('connection')) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: error?.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

