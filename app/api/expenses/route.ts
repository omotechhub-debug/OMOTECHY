import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import User from '@/lib/models/User';
import Station from '@/lib/models/Station';

// GET all expenses
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    console.log('Fetching expenses...');
    
    // Get the authenticated user
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access token required' 
      }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or expired token' 
      }, { status: 401 });
    }

    // Get user details from database
    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Check if user has permission to view expenses
    if (!['admin', 'superadmin', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient permissions to view expenses' 
      }, { status: 403 });
    }

    // Fetch expenses
    const expenses = await Expense.find({}).sort({ date: -1 });
    console.log(`Found ${expenses.length} expenses`);
    
    return NextResponse.json({ success: true, expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST create new expense
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Get the authenticated user
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access token required' 
      }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or expired token' 
      }, { status: 401 });
    }

    // Get user details from database
    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Check if user has permission to create expenses
    if (!['admin', 'superadmin', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient permissions to create expenses' 
      }, { status: 403 });
    }

    const expenseData = await request.json();
    
    // Validate required fields
    if (!expenseData.title || !expenseData.amount || !expenseData.date || !expenseData.category) {
      return NextResponse.json({ 
        success: false, 
        error: 'Title, amount, date, and category are required' 
      }, { status: 400 });
    }

    // Validate amount is positive
    if (expenseData.amount <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Amount must be greater than 0' 
      }, { status: 400 });
    }

    // Get user's station information for tracking
    let stationInfo = null;
    console.log('🔍 Checking station assignment for user:', {
      role: currentUser.role,
      stationId: currentUser.stationId,
      managedStations: currentUser.managedStations
    });
    
    if ((currentUser.role === 'manager' || currentUser.role === 'admin') && currentUser.stationId) {
      console.log('🔍 User has stationId, looking up station:', currentUser.stationId);
      try {
        const station = await Station.findById(currentUser.stationId);
        console.log('🔍 Station lookup result:', station ? 'Found' : 'Not found');
        if (station) {
          stationInfo = {
            stationId: station._id,
            name: station.name,
            location: station.location
          };
          console.log('✅ Found station for user:', stationInfo);
        } else {
          console.log('❌ Station not found for ID:', currentUser.stationId);
        }
      } catch (stationError) {
        console.error('❌ Error fetching station info:', stationError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch station information' 
        }, { status: 500 });
      }
    } else if (currentUser.managedStations && currentUser.managedStations.length > 0) {
      console.log('🔍 User has managedStations, using first one:', currentUser.managedStations[0]);
      try {
        const stationId = currentUser.managedStations[0];
        console.log('🔍 Looking up station for managedStations:', stationId);
        const station = await Station.findById(stationId);
        console.log('🔍 Station lookup result for managedStations:', station ? 'Found' : 'Not found');
        if (station) {
          stationInfo = {
            stationId: station._id,
            name: station.name,
            location: station.location
          };
          console.log('✅ Found station for managedStations:', stationInfo);
        } else {
          console.log('❌ Station not found for managedStations ID:', stationId);
        }
      } catch (stationError) {
        console.error('❌ Error fetching station info:', stationError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch station information' 
        }, { status: 500 });
      }
    } else {
      console.log('❌ User has no station assignment');
      return NextResponse.json({ 
        success: false, 
        error: 'User must be assigned to a station to create expenses' 
      }, { status: 400 });
    }
    
    // Validate that we have station information
    if (!stationInfo) {
      console.log('❌ No station information found');
      return NextResponse.json({ 
        success: false, 
        error: 'Station information is required to create expenses' 
      }, { status: 400 });
    }
    
    console.log('✅ Final station info:', stationInfo);

    // Create new expense
    const expense = new Expense({
      title: expenseData.title.trim(),
      amount: Number(expenseData.amount),
      date: new Date(expenseData.date),
      category: expenseData.category,
      notes: expenseData.notes?.trim() || '',
      // Add creator and station information for tracking
      createdBy: {
        userId: currentUser._id,
        name: currentUser.name,
        role: currentUser.role,
      },
      station: stationInfo,
    });

    await expense.save();
    console.log('✅ Expense saved successfully:', expense.title);
    
    return NextResponse.json({
      success: true,
      expense,
      message: 'Expense created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
