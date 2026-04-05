import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/lib/models/User'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    console.log('Admin signup request for email:', body.email)
    
    const { name, email, password, reason } = body

    // Validate input
    if (!name || !email || !password || !reason) {
      console.log('Validation failed:', { name: !!name, email: !!email, password: !!password, reason: !!reason })
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
      if (existingUser.role === 'user') {
        return NextResponse.json(
          { success: false, message: 'An account with this email already exists as a regular user. Please use a different email or contact support.' },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { success: false, message: 'An admin account with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Create admin user with pending approval
    const user = new User({
      name,
      email,
      password, // Let the model handle password hashing
      role: 'admin', // Set as admin but pending approval
      isActive: true,
      approved: false, // Pending approval
      reasonForAdminAccess: reason, // Store the reason
      pagePermissions: [] // Will be set when approved
    })

    await user.save()

    console.log(`✅ Admin signup request created for: ${email}`)

    // Return success response (no token since not approved yet)
    const response = NextResponse.json({
      success: true,
      message: 'Admin access request submitted successfully. You will be notified when your request is approved.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        approved: user.approved
      }
    })

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    return response

  } catch (error: any) {
    console.error('Admin signup error:', error.name, error.message)
    console.error('Full error details:', error)
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Unable to submit admin request. Please try again later.'
    
    if (error.name === 'ValidationError') {
      errorMessage = 'Invalid data provided. Please check your information and try again.'
    } else if (error.name === 'MongoError' && error.code === 11000) {
      errorMessage = 'An account with this email already exists.'
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid data format. Please check your information and try again.'
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage
      },
      { status: 500 }
    )
  }
}
