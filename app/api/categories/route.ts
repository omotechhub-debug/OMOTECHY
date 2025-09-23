import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import { requireAdmin } from '@/lib/auth';

// GET all categories
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const categories = await Category.find({}).sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new category
export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    await connectDB();
    
    const { name, description, icon, color, active = true } = await request.json();

    if (!name || !description || !icon || !color) {
      return NextResponse.json(
        { error: 'Name, description, icon, and color are required' },
        { status: 400 }
      );
    }

    // Check if category with same name already exists
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 400 }
      );
    }

    // Create new category
    const newCategory = new Category({
      name: name.trim(),
      description: description.trim(),
      icon,
      color,
      active,
    });

    await newCategory.save();

    return NextResponse.json({
      success: true,
      category: newCategory,
      message: 'Category created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}); 