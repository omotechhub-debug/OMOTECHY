import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

async function promoteToManager(request: NextRequest) {
  try {
    await connectDB();
    
    const { userId, stationId } = await request.json();

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

    // Only allow promotion from user role to manager
    if (existingUser.role !== 'user') {
      return NextResponse.json(
        { error: 'User must be a regular user to be promoted to manager' },
        { status: 400 }
      );
    }

    // Find and update user to manager role
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        role: 'manager',
        stationId: stationId || null,
        approved: true // Auto-approve managers
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
        stationId: user.stationId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      message: 'User promoted to manager successfully'
    });

  } catch (error) {
    console.error('Promote to manager error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAdmin(promoteToManager);