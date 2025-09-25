import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Station from '@/lib/models/Station';
import User from '@/lib/models/User';
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    // Get stations with pagination
    const skip = (page - 1) * limit;
    const stations = await Station.find(query)
      .populate('managerId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Manually populate managers field
    for (const station of stations) {
      if (station.managers && station.managers.length > 0) {
        try {
          const managerDetails = await User.find({ _id: { $in: station.managers } })
            .select('name email role');
          station.managers = managerDetails;
        } catch (error) {
          console.log('Warning: Could not populate managers field:', error.message);
        }
      }
    }

    const total = await Station.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      stations,
      pagination: {
        currentPage: page,
        totalPages,
        totalStations: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching stations:', error);
    return NextResponse.json(
      { error: `Failed to fetch stations: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

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
    const user = await User.findById(decoded.userId);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, location, description, managerId, managers, contactInfo, settings } = body;

    // Validate required fields
    if (!name || !location) {
      return NextResponse.json(
        { error: 'Name and location are required' },
        { status: 400 }
      );
    }

    // Check if managers exist and are admins
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
        if (!['admin', 'superadmin'].includes(manager.role)) {
          return NextResponse.json(
            { error: 'All managers must be admins or superadmins' },
            { status: 400 }
          );
        }
      }
    }

    // Create station
    const station = new Station({
      name,
      location,
      description,
      managerId: managerId || undefined,
      managers: managers || [],
      contactInfo,
      settings
    });

    await station.save();

    // If managers are assigned, add them to managedStations and set stationId (keep original role)
    if (managerIds.length > 0) {
      await User.updateMany(
        { _id: { $in: managerIds } },
        { 
          $addToSet: { managedStations: station._id },
          $set: { stationId: station._id }
        }
      );
    }

    // Populate manager info
    await station.populate('managerId', 'name email role');
    
    // Manually populate managers if they exist
    if (station.managers && station.managers.length > 0) {
      await station.populate('managers', 'name email role');
    }

    return NextResponse.json({
      success: true,
      station,
      message: 'Station created successfully'
    });

  } catch (error) {
    console.error('Error creating station:', error);
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'Station name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create station' },
      { status: 500 }
    );
  }
}
