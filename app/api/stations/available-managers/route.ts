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

    // Get all managers who are not already assigned to any station
    // First, get all managers assigned to stations (both through stationId and managers array)
    const assignedManagerIds = new Set();
    
    // Get managers assigned through stationId field
    const managersWithStationId = await User.find({
      role: 'manager',
      stationId: { $exists: true, $ne: null }
    }).select('_id');
    managersWithStationId.forEach(manager => assignedManagerIds.add(manager._id.toString()));
    
    // Get managers assigned through stations.managers array
    const stationsWithManagers = await Station.find({
      managers: { $exists: true, $ne: [] }
    }).select('managers');
    stationsWithManagers.forEach(station => {
      station.managers.forEach(managerId => {
        assignedManagerIds.add(managerId.toString());
      });
    });
    
    // Get all unassigned managers
    const managers = await User.find({
      role: 'manager',
      isActive: true,
      approved: true,
      _id: { $nin: Array.from(assignedManagerIds) }
    }).select('name email role stationId');

    // Get currently assigned managers (both old and new methods)
    const assignedManagers = await Station.find({
      $or: [
        { managerId: { $exists: true, $ne: null } },
        { managers: { $exists: true, $ne: [] } }
      ]
    }).populate('managerId', 'name email role').populate('managers', 'name email role');

    return NextResponse.json({
      success: true,
      availableManagers: managers,
      assignedManagers: assignedManagers.map(station => ({
        stationId: station._id,
        stationName: station.name,
        manager: station.managerId,
        managers: station.managers
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
