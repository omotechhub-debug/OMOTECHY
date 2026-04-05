import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

const JWT_SECRET = process.env.JWT_SECRET;

// Don't throw at module level - check inside route handler instead
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
    console.log('Client Google login API called');
    
    // Check JWT_SECRET
    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return NextResponse.json(
        { error: 'Server configuration error: JWT_SECRET is not set' },
        { status: 500 }
      );
    }

    // Check and initialize Google client
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

    const { idToken } = requestBody;

    if (!idToken) {
      console.error('No idToken provided in request');
      return NextResponse.json(
        { error: 'Google ID token is required' },
        { status: 400 }
      );
    }

    console.log('Google ID token received, length:', idToken.length);

    // Verify the Google ID token
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

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return NextResponse.json(
        { error: 'Email not provided by Google' },
        { status: 400 }
      );
    }

    // Find existing user by email or googleId
    let user = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() }, 
        { googleId }
      ]
    });

    if (user) {
      // User exists - check if it's an admin trying to use client login
      if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'manager') {
        console.log(`🚫 Admin user attempted client login via Google: ${email}`);
        return NextResponse.json(
          { 
            error: 'This account is an admin account. Please use the admin login page.',
            code: 'ADMIN_ACCOUNT'
          },
          { status: 403 }
        );
      }

      // Regular user exists - update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        if (name) user.name = name;
        await user.save();
      }

      // Check if user is active and approved
      if (!user.isActive) {
        return NextResponse.json(
          { error: 'Account is deactivated' },
          { status: 401 }
        );
      }

      if (!user.approved) {
        return NextResponse.json(
          { error: 'Account is pending approval' },
          { status: 403 }
        );
      }
    } else {
      // User doesn't exist - create new client user (auto-approve for regular users)
      console.log(`Creating new client user via Google Sign-In: ${email}`);
      
      user = new User({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        googleId,
        authProvider: 'google',
        role: 'user',
        isActive: true,
        approved: true, // Auto-approve client users
        pagePermissions: [
          { page: 'dashboard', canView: true, canEdit: false, canDelete: false },
          { page: 'orders', canView: true, canEdit: false, canDelete: false },
          { page: 'pos', canView: true, canEdit: false, canDelete: false },
          { page: 'customers', canView: true, canEdit: false, canDelete: false }
        ]
      });

      await user.save();
      console.log(`✅ New client user created via Google: ${email}`);
    }

    // Generate JWT token (same format as client-login)
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password)
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      approved: user.approved
    };

    console.log(`✅ Client Google login successful: ${email} (${user.role})`);

    const response = NextResponse.json({
      success: true,
      user: userResponse,
      token,
      message: user.googleId && !user.password ? 
        `Welcome back, ${user.name}!` : 
        `Welcome, ${user.name}! Your account has been created.`
    });

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;

  } catch (error: any) {
    console.error('Client Google login error:', error);
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

