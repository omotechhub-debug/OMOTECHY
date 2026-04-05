"use client"

import React, { useState, useEffect, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ShirtIcon, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/hooks/useAuth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

// Declare Google types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: () => void
          renderButton: (element: HTMLElement, config: any) => void
        }
      }
    }
  }
}

function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isAdmin, isLoading: authLoading, login, loginWithGoogle } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const googleButtonRef = useRef<HTMLDivElement>(null)

  const handleGoogleSignIn = async (response: any) => {
    setIsGoogleLoading(true)
    setError("")
    setSuccess("")

    try {
      // Check if credential exists
      if (!response || !response.credential) {
        console.error('Google response missing credential:', response)
        setError("Invalid Google response. Please try again.")
        setIsGoogleLoading(false)
        return
      }

      console.log('Google sign-in initiated, sending credential to backend...')
      
      // Send the Google ID token to our backend
      const result = await loginWithGoogle(response.credential)
      
      console.log('Backend response:', result)
      
      if (result.success) {
        setSuccess(result.message || "Login successful! Redirecting to admin panel...")
        
        // Redirect to admin dashboard
        setTimeout(() => {
          window.location.href = "/admin"
        }, 1500)
      } else {
        if (result.pendingApproval) {
          setError(result.error || "Your admin account is pending approval.")
          setTimeout(() => {
            router.push(`/admin/pending-approval?email=${encodeURIComponent(result.email || '')}`)
          }, 2000)
        } else if (result.code === 'ACCOUNT_NOT_FOUND') {
          setError(result.error || "Account not found. Please contact administrator.")
        } else {
          setError(result.error || "Google sign-in failed. Please try again.")
        }
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      })
      
      // More specific error messages
      if (error?.message?.includes('fetch')) {
        setError("Network error. Please check your connection and try again.")
      } else if (error?.message?.includes('JSON')) {
        setError("Invalid server response. Please try again.")
      } else {
        setError(error?.message || "Network error. Please check your connection and try again.")
      }
    }
    
    setIsGoogleLoading(false)
  }

  // Load Google Identity Services script
  useEffect(() => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    
    if (!googleClientId) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set in environment variables')
      setError("Google Sign-In is not configured. Please contact administrator.")
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google && googleButtonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleSignIn,
          })
          
          // Render Google Sign-In button
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            width: '100%',
          })
          console.log('Google Sign-In button rendered successfully')
        } catch (error) {
          console.error('Error initializing Google Sign-In:', error)
          setError("Failed to initialize Google Sign-In. Please refresh the page.")
        }
      } else {
        console.error('Google Identity Services not loaded or button ref not available')
      }
    }
    script.onerror = () => {
      console.error('Failed to load Google Identity Services script')
      setError("Failed to load Google Sign-In. Please check your internet connection.")
    }
    
    document.body.appendChild(script)

    return () => {
      // Cleanup script if component unmounts
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript)
      }
    }
  }, [handleGoogleSignIn])

  // Check for success message from signup
  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      setSuccess(message)
    }
  }, [searchParams])

  // Redirect if already authenticated and is admin
  React.useEffect(() => {
    if (!authLoading && isAuthenticated && isAdmin) {
      router.push("/admin")
    }
  }, [isAuthenticated, isAdmin, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("") // Clear success message when attempting login

    try {
      // Use the admin login API
      const result = await login(email, password)
      
      if (result.success) {
        setSuccess(result.message || "Login successful! Redirecting to admin panel...")
        
        // Redirect to admin dashboard
        setTimeout(() => {
          window.location.href = "/admin"
        }, 1500)
      } else {
        if (result.pendingApproval) {
          setError(result.error || "Your admin account is pending approval.")
          // Redirect to pending approval page after 2 seconds
          setTimeout(() => {
            router.push(`/admin/pending-approval?email=${encodeURIComponent(email)}`)
          }, 2000)
        } else {
          setError(result.error || "Invalid email or password. Please try again.")
        }
      }
    } catch (error) {
      setError("Network error. Please check your connection and try again.")
    }
    
    setIsLoading(false)
  }

  // Show loading while auth state is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F0F2FE] to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-[#8B99B9]/20">
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#263C7C] flex items-center justify-center mb-4 shadow-lg">
              <ShirtIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-center text-[#263C7C]">OMOTECH HUB Admin</h1>
            <p className="text-gray-600 text-center mt-2">Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F2FE] to-white flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-[#8B99B9]/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-8">
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#263C7C] flex items-center justify-center mb-4 shadow-lg">
              <ShirtIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-center text-[#263C7C]">OMOTECH HUB Admin</h1>
            <p className="text-gray-600 text-center mt-2">Access your admin dashboard</p>
          </div>

          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-600">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-emerald-200 bg-emerald-50">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-600">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="luxury-input"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="luxury-input pr-10"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-text"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" disabled={isLoading} />
                <Label htmlFor="remember" className="text-sm font-medium">
                  Remember me
                </Label>
              </div>
              <a href="#" className="text-sm font-medium text-[#263C7C] hover:text-[#8B99B9] hover:underline">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full btn-primary rounded-xl h-12"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <div className="w-full">
            <div 
              ref={googleButtonRef} 
              className="w-full flex justify-center"
              style={{ minHeight: '40px' }}
            />
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-3">
              Don't have an account?{" "}
              <Link href="/admin/signup" className="font-medium text-[#263C7C] hover:text-[#8B99B9] hover:underline">
                Sign up here
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              Need admin access?{" "}
              <Link href="/admin/signup" className="font-medium text-[#263C7C] hover:text-[#8B99B9] hover:underline">
                Request admin access
              </Link>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Sign up URL: <span className="font-mono bg-gray-100 px-2 py-1 rounded">/admin/signup</span>
            </p>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-r from-[#F0F2FE] to-white border-t border-[#8B99B9]/20 text-center">
          <p className="text-sm text-gray-600">
            Need help?{" "}
            <a href="tel:+254740802704" className="font-medium text-[#263C7C] hover:text-[#8B99B9] hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#F0F2FE] to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-[#8B99B9]/20">
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#263C7C] flex items-center justify-center mb-4 shadow-lg">
              <ShirtIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-center text-[#263C7C]">OMOTECH HUB Admin</h1>
            <p className="text-gray-600 text-center mt-2">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <AdminLoginForm />
    </Suspense>
  )
}
