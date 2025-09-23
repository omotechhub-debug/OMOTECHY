import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import { requireAdmin } from '@/lib/auth';

// PUT - Update expense
export const PUT = requireAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    await connectDB();

    const { title, amount, date, category, notes } = await request.json();

    // Validate required fields
    if (!title || !amount || !date || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if expense exists
    const existingExpense = await Expense.findById(params.id);
    if (!existingExpense) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Update expense
    const updatedExpense = await Expense.findByIdAndUpdate(
      params.id,
      {
        title: title.trim(),
        amount: Number(amount),
        date: new Date(date),
        category,
        notes: notes?.trim() || '',
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      expense: updatedExpense,
      message: 'Expense updated successfully'
    });

  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update expense' },
      { status: 500 }
    );
  }
});

// DELETE - Delete expense
export const DELETE = requireAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    await connectDB();

    // Check if expense exists
    const existingExpense = await Expense.findById(params.id);
    if (!existingExpense) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Delete expense
    await Expense.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}); 