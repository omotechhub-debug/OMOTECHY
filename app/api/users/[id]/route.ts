import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getTokenFromRequest, verifyToken } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Station from '@/lib/models/Station';

async function deleteUser(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    // Get current user from token
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prevent self-deletion
    if (currentUser._id.toString() === userId) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    // Find user to delete
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Permission checks based on role
    const currentRole = currentUser.role;
    const targetRole = userToDelete.role;

    // Managers can only delete regular users
    if (currentRole === 'manager') {
      if (targetRole !== 'user') {
        return NextResponse.json(
          { error: 'Managers can only delete regular users' },
          { status: 403 }
        );
      }
    }

    // Admins can delete managers and users, but not other admins or superadmins
    if (currentRole === 'admin') {
      if (targetRole === 'admin' || targetRole === 'superadmin') {
        return NextResponse.json(
          { error: 'Admins cannot delete other admins or superadmins' },
          { status: 403 }
        );
      }
    }

    // Superadmins can delete anyone (except themselves, already checked)
    // No additional check needed

    // Remove user from stations they were managing
    const stationUpdateResult = await Station.updateMany(
      { managers: userId },
      { $pull: { managers: userId } }
    );

    // Clear legacy managerId field if it exists
    const legacyUpdateResult = await Station.updateMany(
      { managerId: userId },
      { $unset: { managerId: 1 } }
    );

    // Delete the user
    await User.findByIdAndDelete(userId);

    return NextResponse.json({
      success: true,
      message: `User ${userToDelete.name} (${userToDelete.email}) has been deleted successfully. Removed from ${stationUpdateResult.modifiedCount + legacyUpdateResult.modifiedCount} stations.`
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const DELETE = requireAdmin(deleteUser);

