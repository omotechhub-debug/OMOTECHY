import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Station from '@/lib/models/Station';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
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
    const user = await User.findById(decoded.userId);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all admins and superadmins (can now manage multiple stations)
    const admins = await User.find({
      role: { $in: ['admin', 'superadmin'] },
      isActive: true,
      approved: true
    }).select('name email role managedStations');

    // Get currently assigned managers
    const assignedManagers = await Station.find({
      managerId: { $exists: true, $ne: null }
    }).populate('managerId', 'name email role');

    return NextResponse.json({
      success: true,
      availableManagers: admins,
      assignedManagers: assignedManagers.map(station => ({
        stationId: station._id,
        stationName: station.name,
        manager: station.managerId
      }))
    });

  } catch (error) {
    console.error('Error fetching available managers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available managers' },
      { status: 500 }
    );
  }
}
