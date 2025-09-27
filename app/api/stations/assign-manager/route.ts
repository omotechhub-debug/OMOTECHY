import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Station from '@/lib/models/Station';

async function assignManagerToStation(request: NextRequest) {
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

    // Check if user exists and is a manager
    const manager = await User.findById(managerId);
    if (!manager) {
      return NextResponse.json(
        { error: 'Manager not found' },
        { status: 404 }
      );
    }

    if (manager.role !== 'manager') {
      return NextResponse.json(
        { error: 'User must be a manager to be assigned to a station' },
        { status: 400 }
      );
    }

    // Check if manager is already assigned to another station
    if (manager.stationId && manager.stationId.toString() !== stationId) {
      return NextResponse.json(
        { error: 'Manager is already assigned to another station. A manager can only manage one station at a time.' },
        { status: 400 }
      );
    }

    // Update manager's station assignment
    await User.findByIdAndUpdate(managerId, { stationId });

    // Add manager to station's managers array if not already present
    if (!station.managers.includes(managerId)) {
      station.managers.push(managerId);
      await station.save();
    }

    // Populate the updated station with manager details
    const updatedStation = await Station.findById(stationId)
      .populate('managers', 'name email role')
      .populate('managerId', 'name email role');

    return NextResponse.json({
      success: true,
      station: updatedStation,
      message: 'Manager assigned to station successfully'
    });

  } catch (error) {
    console.error('Assign manager error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAdmin(assignManagerToStation);
