import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

async function promoteToAdmin(request: NextRequest) {
  try {
    await connectDB();
    
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists and validate current role
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only allow promotion from manager role to admin
    if (existingUser.role !== 'manager') {
      return NextResponse.json(
        { error: 'User must be a manager to be promoted to admin' },
        { status: 400 }
      );
    }

    // Find and update user to admin role
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        role: 'admin',
        approved: true, // Auto-approve admins
        // Clear stationId when promoting to admin (admin is not station-specific)
        $unset: { stationId: 1 }
      },
      { new: true }
    );

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
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      message: 'User promoted to admin successfully'
    });

  } catch (error) {
    console.error('Promote to admin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAdmin(promoteToAdmin);
