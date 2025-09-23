import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

async function updateUserPermissions(request: NextRequest) {
  try {
    await connectDB();
    
    const { userId, pagePermissions } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!pagePermissions || !Array.isArray(pagePermissions)) {
      return NextResponse.json(
        { error: 'Page permissions array is required' },
        { status: 400 }
      );
    }

    // Validate page permissions structure
    for (const permission of pagePermissions) {
      if (!permission.page || typeof permission.canView !== 'boolean' || 
          typeof permission.canEdit !== 'boolean' || typeof permission.canDelete !== 'boolean') {
        return NextResponse.json(
          { error: 'Invalid page permission structure' },
          { status: 400 }
        );
      }
    }

    // Find and update user
    const user = await User.findByIdAndUpdate(
      userId,
      { pagePermissions },
      { new: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

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
      message: 'User permissions updated successfully'
    });

  } catch (error) {
    console.error('Update user permissions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = requireAdmin(updateUserPermissions); 