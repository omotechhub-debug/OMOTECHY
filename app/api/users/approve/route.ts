import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

async function approveUser(request: NextRequest) {
  try {
    await connectDB();
    
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find user first
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Set up page permissions for admin users when approving
    if (user.role === 'admin' || user.role === 'superadmin') {
      const defaultPages = [
        'dashboard', 'orders', 'pos', 'customers', 'services', 'categories',
        'reports', 'users', 'expenses', 'gallery', 'testimonials', 'promotions', 'settings'
      ];
      
      const defaultPermissions = defaultPages.map(page => ({
        page,
        canView: true,
        canEdit: user.role === 'superadmin' ? true : ['dashboard', 'orders', 'pos', 'customers', 'services', 'categories'].includes(page),
        canDelete: user.role === 'superadmin' ? true : ['orders', 'customers'].includes(page)
      }));

      user.pagePermissions = defaultPermissions;
    }

    // Approve the user
    user.approved = true;
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
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      message: 'User approved successfully'
    });

  } catch (error) {
    console.error('Approve user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAdmin(approveUser); 