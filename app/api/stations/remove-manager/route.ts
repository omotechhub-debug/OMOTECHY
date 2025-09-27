import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Station from '@/lib/models/Station';

async function removeManagerFromStation(request: NextRequest) {
  try {
    await connectDB();
    
    const { stationId, managerId } = await request.json();

    if (!stationId || !managerId) {
      return NextResponse.json(
        { error: 'Station ID and Manager ID are required' },
        { status: 400 }
      );
    }

    // Check if station exists
    const station = await Station.findById(stationId);
    if (!station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    // Check if manager exists
    const manager = await User.findById(managerId);
    if (!manager) {
      return NextResponse.json(
        { error: 'Manager not found' },
        { status: 404 }
      );
    }

    // Remove manager from station's managers array
    station.managers = station.managers.filter(id => id.toString() !== managerId);
    await station.save();

    // Remove station assignment from manager
    await User.findByIdAndUpdate(managerId, { 
      $unset: { stationId: 1 } 
    });

    // Populate the updated station with manager details
    const updatedStation = await Station.findById(stationId)
      .populate('managers', 'name email role')
      .populate('managerId', 'name email role');

    return NextResponse.json({
      success: true,
      station: updatedStation,
      message: 'Manager removed from station successfully'
    });

  } catch (error) {
    console.error('Remove manager error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAdmin(removeManagerFromStation);
