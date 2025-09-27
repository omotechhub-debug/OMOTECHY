import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Station from '@/lib/models/Station';

async function demoteToManager(request: NextRequest) {
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

    // Only allow demotion from admin role to manager
    if (existingUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'User must be an admin to be demoted to manager' },
        { status: 400 }
      );
    }

    // Remove user from all stations they were managing (both as manager and admin)
    const stationUpdateResult = await Station.updateMany(
      { managers: userId },
      { $pull: { managers: userId } }
    );

    // Clear legacy managerId field if it exists
    const legacyUpdateResult = await Station.updateMany(
      { managerId: userId },
      { $unset: { managerId: 1 } }
    );

    // Find and update user to manager role
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        role: 'manager',
        // Clear stationId when demoting from admin to manager
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
        stationId: user.stationId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      message: `Admin demoted to manager successfully. Removed from ${stationUpdateResult.modifiedCount + legacyUpdateResult.modifiedCount} stations.`
    });

  } catch (error) {
    console.error('Demote to manager error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAdmin(demoteToManager);
