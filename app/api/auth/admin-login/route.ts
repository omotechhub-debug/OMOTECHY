import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables');
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // ⚠️ STRICT ADMIN CHECK - Block regular users immediately
    if (user.role === 'user') {
      console.log(`🚫 Regular user attempted admin login: ${email}`);
      return NextResponse.json(
        { 
          error: 'Access denied. Admin privileges required.',
          message: 'This area is restricted to administrators only.' 
        },
        { status: 403 }
      );
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

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
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

    // Return admin user data and token
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
    };

    console.log(`✅ Admin login successful: ${email} (${user.role})`);

    return NextResponse.json({
      success: true,
      user: userResponse,
      token,
      message: `Welcome back, ${user.name}! Admin access granted.`
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 