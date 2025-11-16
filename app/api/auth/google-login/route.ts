import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

const JWT_SECRET = process.env.JWT_SECRET;

// Don't throw at module level - check inside route handler instead
// This prevents Next.js from returning HTML error pages
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
    console.log('Google login API called');
    
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

    // Find user by email or googleId
    let user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { googleId }
      ]
    });

    // ⚠️ STRICT ADMIN CHECK - Block regular users immediately
    if (user && user.role === 'user') {
      console.log(`🚫 Regular user attempted admin login via Google: ${email}`);
      return NextResponse.json(
        { 
          error: 'Access denied. Admin privileges required.',
          message: 'This area is restricted to administrators only.' 
        },
        { status: 403 }
      );
    }

    // If user doesn't exist, check if this is an admin email
    // For security, we don't auto-create admin accounts via Google
    if (!user) {
      return NextResponse.json(
        { 
          error: 'Account not found. Please contact administrator to create an admin account.',
          code: 'ACCOUNT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Update user with Google info if not already set
    if (!user.googleId) {
      user.googleId = googleId;
      user.authProvider = 'google';
      // Update name and picture if available
      if (name) user.name = name;
      await user.save();
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 401 }
      );
    }

    // Check if admin is approved
    if (!user.approved) {
      return NextResponse.json(
        { 
          error: 'Admin account is pending approval',
          code: 'PENDING_APPROVAL',
          email: user.email 
        },
        { status: 403 }
      );
    }

    // Ensure user has valid page permissions
    if (!user.pagePermissions || !Array.isArray(user.pagePermissions) || user.pagePermissions.length === 0) {
      console.log(`⚠️ Admin user ${email} has no page permissions, creating default permissions`);
      
      // Create permissions based on user role
      let defaultPages: string[];
      let defaultPermissions: any[];
      
      if (user.role === 'superadmin') {
        // Superadmin can only access Inventory, Inventory Management, Stations, and Services
        defaultPages = ['inventory', 'inventory-management', 'stations', 'services'];
        defaultPermissions = defaultPages.map(page => ({
          page,
          canView: true,
          canEdit: false, // View only
          canDelete: false // View only
        }));
      } else {
        // Regular admin permissions
        defaultPages = [
          'dashboard', 'orders', 'pos', 'customers', 'services', 'categories',
          'reports', 'users', 'expenses', 'gallery', 'testimonials', 'promotions', 'settings'
        ];
        defaultPermissions = defaultPages.map(page => ({
          page,
          canView: true,
          canEdit: ['dashboard', 'orders', 'pos', 'customers', 'services', 'categories'].includes(page),
          canDelete: ['orders', 'customers'].includes(page)
        }));
      }
      
      user.pagePermissions = defaultPermissions;
      await user.save();
    }

    // Create JWT token compatible with client authentication
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return admin user data and token (same format as admin-login)
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      approved: user.approved,
      pagePermissions: user.pagePermissions,
      stationId: user.stationId,
      managedStations: user.managedStations,
      authProvider: user.authProvider,
    };

    console.log(`✅ Admin Google login successful: ${email} (${user.role})`);

    return NextResponse.json({
      success: true,
      user: userResponse,
      token,
      message: `Welcome back, ${user.name}! Admin access granted.`
    });

  } catch (error: any) {
    console.error('Google login error:', error);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack
    });
    
    // More specific error messages
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

