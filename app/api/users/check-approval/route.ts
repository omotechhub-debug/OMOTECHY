import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email }).select('-password');

    if (!user) {
      return NextResponse.json({
        success: true,
        status: 'not_found',
        message: 'User not found'
      });
    }

    // Determine status based on user properties
    let status: 'pending' | 'approved' | 'rejected' = 'pending';
    
    if (user.approved) {
      status = 'approved';
    } else if (user.role === 'admin' || user.role === 'superadmin') {
      // If user is admin/superadmin but not approved, they're pending
      status = 'pending';
    } else {
      // If user is regular user, they don't have an admin request
      status = 'not_found';
    }

    return NextResponse.json({
      success: true,
      status,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approved: user.approved,
        reasonForAdminAccess: user.reasonForAdminAccess,
        createdAt: user.createdAt
      },
      message: status === 'approved' ? 'Your request has been approved!' : 
               status === 'pending' ? 'Your request is still pending approval' :
               'Your request was not found'
    });

  } catch (error) {
    console.error('Check approval status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
