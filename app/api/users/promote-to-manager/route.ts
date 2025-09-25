import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Station from '@/lib/models/Station';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin or superadmin
    const currentUser = await User.findById(decoded.userId);
    if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, stationId } = body;

    if (!userId || !stationId) {
      return NextResponse.json(
        { error: 'User ID and Station ID are required' },
        { status: 400 }
      );
    }

    // Check if user exists and is an admin
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'User must be an admin to be promoted to manager' },
        { status: 400 }
      );
    }

    // Check if station exists
    const station = await Station.findById(stationId);
    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    // Check if user is already managing this station
    if (user.managedStations && user.managedStations.includes(stationId)) {
      return NextResponse.json(
        { error: 'User is already managing this station' },
        { status: 400 }
      );
    }

    // Add station to user's managedStations (keep original role)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { managedStations: stationId }
      },
      { new: true }
    ).populate('managedStations', 'name location');

    // Update station to assign manager (add to managers array)
    await Station.findByIdAndUpdate(stationId, {
      $addToSet: { managers: userId }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        approved: updatedUser.approved,
        reasonForAdminAccess: updatedUser.reasonForAdminAccess,
        managedStations: updatedUser.managedStations,
        stations: updatedUser.managedStations ? updatedUser.managedStations.map(station => ({
          _id: station._id,
          name: station.name,
          location: station.location
        })) : [],
        pagePermissions: updatedUser.pagePermissions,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      },
      message: 'User promoted to manager successfully'
    });

  } catch (error) {
    console.error('Error promoting user to manager:', error);
    return NextResponse.json(
      { error: 'Failed to promote user to manager' },
      { status: 500 }
    );
  }
}
