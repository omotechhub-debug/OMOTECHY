import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

function getDefaultPermissions(role: string) {
  const defaultPages = [
    'dashboard',
    'orders',
    'pos',
    'customers',
    'services',
    'categories',
    'reports',
    'users',
    'expenses',
    'gallery',
    'testimonials',
    'promotions',
    'settings'
  ];
  
  if (role === 'superadmin') {
    return defaultPages.map(page => ({
      page,
      canView: true,
      canEdit: true,
      canDelete: true
    }));
  } else if (role === 'admin') {
    return defaultPages.map(page => ({
      page,
      canView: true,
      canEdit: ['dashboard', 'orders', 'pos', 'customers', 'services', 'categories', 'stations'].includes(page),
      canDelete: ['orders', 'customers', 'stations'].includes(page)
    }));
  } else if (role === 'manager') {
    return defaultPages.map(page => ({
      page,
      canView: ['dashboard', 'orders', 'pos', 'expenses'].includes(page),
      canEdit: ['orders', 'pos', 'expenses'].includes(page),
      canDelete: ['orders'].includes(page)
    }));
  } else {
    return defaultPages.map(page => ({
      page,
      canView: ['dashboard', 'orders', 'pos', 'customers'].includes(page),
      canEdit: ['orders', 'pos'].includes(page),
      canDelete: false
    }));
  }
}

async function fixUserPermissions(request: NextRequest) {
  try {
    await connectDB();
    
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get default permissions for user's role
    const defaultPermissions = getDefaultPermissions(user.role);
    
    // Update user's permissions
    user.pagePermissions = defaultPermissions;
    await user.save();

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        approved: user.approved,
        pagePermissions: user.pagePermissions,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      message: 'User permissions fixed successfully'
    });

  } catch (error) {
    console.error('Fix user permissions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAdmin(fixUserPermissions); 