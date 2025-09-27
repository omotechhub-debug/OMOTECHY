import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import User from '@/lib/models/User';

// PUT update expense
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Check if user has permission to update expenses
    if (!['admin', 'superadmin', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient permissions to update expenses' 
      }, { status: 403 });
    }

    const { id } = params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid expense ID' 
      }, { status: 400 });
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

    // Find and update expense
    const expense = await Expense.findById(id);
    if (!expense) {
      return NextResponse.json({ 
        success: false, 
        error: 'Expense not found' 
      }, { status: 404 });
    }

    // Update expense fields
    expense.title = expenseData.title.trim();
    expense.amount = Number(expenseData.amount);
    expense.date = new Date(expenseData.date);
    expense.category = expenseData.category;
    expense.notes = expenseData.notes?.trim() || '';
    expense.updatedAt = new Date();

    await expense.save();
    console.log('✅ Expense updated successfully:', expense.title);
    
    return NextResponse.json({
      success: true,
      expense,
      message: 'Expense updated successfully'
    });

  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// DELETE expense
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Check if user has permission to delete expenses (managers cannot delete)
    if (!['admin', 'superadmin'].includes(currentUser.role)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only administrators can delete expenses' 
      }, { status: 403 });
    }

    const { id } = params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid expense ID' 
      }, { status: 400 });
    }

    // Find and delete expense
    const expense = await Expense.findById(id);
    if (!expense) {
      return NextResponse.json({ 
        success: false, 
        error: 'Expense not found' 
      }, { status: 404 });
    }

    await Expense.findByIdAndDelete(id);
    console.log('✅ Expense deleted successfully:', expense.title);
    
    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
