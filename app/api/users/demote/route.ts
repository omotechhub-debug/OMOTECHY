import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Station from '@/lib/models/Station';

async function demoteUser(request: NextRequest) {
  try {
    await connectDB();
    
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
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

    // Find and update user
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
      message: `User demoted to regular user successfully. Removed from ${stationUpdateResult.modifiedCount + legacyUpdateResult.modifiedCount} stations.`
    });

  } catch (error) {
    console.error('Demote user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAdmin(demoteUser); 