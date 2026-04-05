import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Station from '@/lib/models/Station';

export async function GET(request: NextRequest) {
  try {
    // Get token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Simple JWT verification
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || decoded.role !== 'manager') {
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 });
    }

    await connectDB();

    // Find station where this manager is assigned
    const station = await Station.findOne({
      managers: decoded.userId
    });

    if (!station) {
      return NextResponse.json({
        success: false,
        message: 'No station assigned to this manager'
      });
    }

    // Return station data
    return NextResponse.json({
      success: true,
      station: {
        _id: station._id.toString(),
        name: station.name,
        location: station.location,
        isActive: station.isActive,
        managers: station.managers.map(m => m.toString())
      },
      message: 'Station found successfully'
    });

  } catch (error) {
    console.error('My station API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        success: false
      },
      { status: 500 }
    );
  }
}
