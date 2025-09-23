import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import { requireAdmin } from '@/lib/auth';

// GET all expenses
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const expenses = await Expense.find({}).sort({ date: -1 });
    return NextResponse.json({ success: true, expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new expense
export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    await connectDB();
    const { title, amount, date, category, notes } = await request.json();
    if (!title || !amount || !date || !category) {
      return NextResponse.json({ error: 'Title, amount, date, and category are required' }, { status: 400 });
    }
    // Prevent duplicate: same title, date, and amount
    const existing = await Expense.findOne({ title: title.trim(), date: new Date(date), amount });
    if (existing) {
      return NextResponse.json({ error: 'Duplicate expense entry' }, { status: 400 });
    }
    const expense = new Expense({
      title: title.trim(),
      amount,
      date: new Date(date),
      category: category.trim(),
      notes: notes?.trim() || '',
    });
    await expense.save();
    return NextResponse.json({ success: true, expense, message: 'Expense added successfully' }, { status: 201 });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}); 