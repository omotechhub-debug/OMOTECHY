import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Station from '@/lib/models/Station';

async function demoteAdminToUser(request: NextRequest) {
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

    // Only allow demotion from admin role to user
    if (existingUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'User must be an admin to be demoted to user' },
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

    // Find and update user to user role
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        role: 'user',
        // Clear stationId when demoting to user
        $unset: { stationId: 1 }
      },
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
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      message: `Admin demoted to user successfully. Removed from ${stationUpdateResult.modifiedCount + legacyUpdateResult.modifiedCount} stations.`
    });

  } catch (error) {
    console.error('Demote admin to user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAdmin(demoteAdminToUser);
