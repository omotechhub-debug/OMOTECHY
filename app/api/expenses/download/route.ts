import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import { requireAdmin } from '@/lib/auth';

export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Filter expenses by date range
    const expenses = await Expense.find({
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z') // Include the entire end date
      }
    }).sort({ date: -1 });

    if (expenses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No expenses found for the selected date range' },
        { status: 404 }
      );
    }

    // Create CSV content
    const csvHeaders = ['Title', 'Amount (Ksh)', 'Date', 'Category', 'Notes'];
    const csvRows = expenses.map(expense => [
      `"${expense.title}"`,
      expense.amount.toLocaleString(),
      new Date(expense.date).toLocaleDateString(),
      `"${expense.category}"`,
      `"${expense.notes || ''}"`
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Add BOM for proper Excel encoding
    const csvWithBOM = '\uFEFF' + csvContent;

    // Create response with CSV headers
    const response = new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="expenses_${startDate}_to_${endDate}.csv"`,
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
}); 