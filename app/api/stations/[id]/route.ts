import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Station from '@/lib/models/Station';
import User from '@/lib/models/User';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const station = await Station.findById(id)
      .populate('managerId', 'name email role');
    
    // Manually populate managers if they exist
    if (station && station.managers && station.managers.length > 0) {
        try {
          const managerDetails = await User.find({ _id: { $in: station.managers } })
            .select('name email role');
          station.managers = managerDetails;
        } catch (error) {
          console.log('Warning: Could not populate managers field:', error.message);
        }
    }
    
    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      station
    });

  } catch (error) {
    console.error('Error fetching station:', error);
    return NextResponse.json(
      { error: 'Failed to fetch station' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const body = await request.json();
    const { name, location, description, managerId, managers, contactInfo, settings, isActive } = body;

    const { id } = await params;
    const station = await Station.findById(id);
    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    // Validate required fields
    if (name && !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (location && !location.trim()) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      );
    }

    // Check if managers exist and are managers
    const managerIds = managers || (managerId ? [managerId] : []);
    if (managerIds.length > 0) {
      const managerUsers = await User.find({ _id: { $in: managerIds } });
      if (managerUsers.length !== managerIds.length) {
        return NextResponse.json(
          { error: 'One or more managers not found' },
          { status: 400 }
        );
      }

      for (const manager of managerUsers) {
        if (manager.role !== 'manager') {
          return NextResponse.json(
            { error: 'All assigned users must be managers' },
            { status: 400 }
          );
        }

        // Check if manager is already assigned to another station (excluding current station)
        if (manager.stationId && manager.stationId.toString() !== id) {
          return NextResponse.json(
            { error: `Manager ${manager.name} is already assigned to another station. A manager can only manage one station at a time.` },
            { status: 400 }
          );
        }
      }
    }

    // Update station
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (managerId !== undefined) updateData.managerId = managerId || null;
    if (managers !== undefined) updateData.managers = managers || [];
    if (contactInfo !== undefined) updateData.contactInfo = contactInfo;
    if (settings !== undefined) updateData.settings = settings;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedStation = await Station.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('managerId', 'name email role');
    
    // Manually populate managers if they exist
    if (updatedStation && updatedStation.managers && updatedStation.managers.length > 0) {
      await updatedStation.populate('managers', 'name email role');
    }

    // Handle manager assignment changes
    if (managers !== undefined || managerId !== undefined) {
      // Remove previous managers' station assignments
      const previousManagerIds = [
        ...(station.managerId ? [station.managerId] : []),
        ...(station.managers || [])
      ];
      
      if (previousManagerIds.length > 0) {
        await User.updateMany(
          { _id: { $in: previousManagerIds } },
          { 
            $pull: { managedStations: id }
          }
        );
      }

      // Assign new managers (keep original role)
      if (managerIds.length > 0) {
        await User.updateMany(
          { _id: { $in: managerIds } },
          { 
            $addToSet: { managedStations: id },
            $set: { stationId: id }
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      station: updatedStation,
      message: 'Station updated successfully'
    });

  } catch (error) {
    console.error('Error updating station:', error);
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'Station name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update station' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check if user is superadmin only
    const user = await User.findById(decoded.userId);
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only superadmin can delete stations' }, { status: 403 });
    }

    const { id } = await params;
    const station = await Station.findById(id);
    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    // Remove manager assignment if exists
    if (station.managerId) {
      await User.findByIdAndUpdate(station.managerId, {
        role: 'admin',
        $unset: { stationId: 1 }
      });
    }

    await Station.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Station deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting station:', error);
    return NextResponse.json(
      { error: 'Failed to delete station' },
      { status: 500 }
    );
  }
}
