import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import connectDB from '@/lib/mongodb'
import User from '@/lib/models/User'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    console.log('Client signup request for email:', body.email) // Only log email, never password
    
    const { name, email, password } = body

    // Validate input
    if (!name || !email || !password) {
      console.log('Validation failed:', { name: !!name, email: !!email, password: !!password })
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    if (password.length > 128) {
      return NextResponse.json(
        { success: false, message: 'Password is too long' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password with high salt rounds for security
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    
    // Clear password from memory (though it will be garbage collected anyway)
    password = ''

    // Create user with default page permissions for regular users
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'user',
      isActive: true,
      approved: true, // Auto-approve for now
      pagePermissions: [
        { page: 'dashboard', canView: true, canEdit: false, canDelete: false },
        { page: 'orders', canView: true, canEdit: false, canDelete: false },
        { page: 'pos', canView: true, canEdit: false, canDelete: false },
        { page: 'customers', canView: true, canEdit: false, canDelete: false }
      ]
    })

    await user.save()

    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined')
      return NextResponse.json(
        { success: false, message: 'Server configuration error' },
        { status: 500 }
      )
    }

    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Return user data (without password)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      approved: user.approved
    }

    const response = NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: userData,
      token
    })

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    return response

  } catch (error: any) {
    console.error('Signup error:', error.name, error.message) // Don't log full error details
    return NextResponse.json(
      { 
        success: false, 
        message: 'Unable to create account. Please try again later.'
      },
      { status: 500 }
    )
  }
}
