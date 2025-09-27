import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    // Safely parse URL parameters
    let searchParams;
    try {
      if (!request.url) {
        console.error('Request URL is undefined in expenses download route');
        return NextResponse.json(
          { success: false, error: 'Request URL is undefined' },
          { status: 400 }
        );
      }
      const url = new URL(request.url);
      searchParams = url.searchParams;
    } catch (error) {
      console.error('Error parsing URL in expenses download route:', error);
      console.error('Request URL:', request.url);
      return NextResponse.json(
        { success: false, error: 'Invalid URL' },
        { status: 400 }
      );
    }
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

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

    // Check if user has permission to download expenses
    if (!['admin', 'superadmin', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient permissions to download expenses' 
      }, { status: 403 });
    }

    await connectDB();

    // Build query based on user role and station assignment
    let query: any = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z') // Include the entire end date
      }
    };

    // If user is a manager, filter by their station
    if (currentUser.role === 'manager' && (currentUser.stationId || (currentUser.managedStations && currentUser.managedStations.length > 0))) {
      const userStationId = currentUser.stationId || currentUser.managedStations?.[0];
      query['station.stationId'] = userStationId;
    }

    // Filter expenses by date range and station (if applicable)
    const expenses = await Expense.find(query).sort({ date: -1 });

    if (expenses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No expenses found for the selected date range' },
        { status: 404 }
      );
    }

    // Create CSV content
    const csvHeaders = ['Title', 'Amount (Ksh)', 'Date', 'Category', 'Station', 'Created By', 'Creator Role', 'Notes'];
    const csvRows = expenses.map(expense => [
      `"${expense.title}"`,
      expense.amount.toLocaleString(),
      new Date(expense.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      `"${expense.category}"`,
      `"${expense.station?.name || 'N/A'}"`,
      `"${expense.createdBy?.name || 'N/A'}"`,
      `"${expense.createdBy?.role || 'N/A'}"`,
      `"${expense.notes || ''}"`
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Add BOM for proper Excel encoding
    const csvWithBOM = '\uFEFF' + csvContent;

    // Create filename based on user role and station
    let filename = `expenses_${startDate}_to_${endDate}`;
    if (currentUser.role === 'manager' && currentUser.stationId) {
      const stationName = expenses[0]?.station?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'station';
      filename = `expenses_${stationName}_${startDate}_to_${endDate}`;
    }

    // Create response with CSV headers
    const response = new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });

    return response;

  } catch (error) {
    console.error('Error downloading expenses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download expenses' },
      { status: 500 }
    );
  }
} 