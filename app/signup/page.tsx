"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ShirtIcon, Eye, EyeOff, AlertCircle, UserPlus, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/contexts/AuthContext"
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

export default function Signup() {
  const router = useRouter()
  const { signup, isAuthenticated, loginWithGoogle } = useAuth()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement>(null)

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push("/shop")
    }
  }, [isAuthenticated, router])

  const handleGoogleSignIn = async (response: any) => {
    setIsGoogleLoading(true)
    setError("")
    setSuccess("")
    
    try {
      if (!response || !response.credential) {
        console.error('Google response missing credential:', response)
        setError("Invalid Google response. Please try again.")
        setIsGoogleLoading(false)
        return
      }

      console.log('Google sign-in initiated, sending credential to backend...')
      const result = await loginWithGoogle(response.credential)
      console.log('Backend response:', result)
      
      if (result.success) {
        setSuccess(result.message || "Account created successfully! Redirecting...")
        setTimeout(() => {
          router.push('/shop')
        }, 1500)
      } else {
        if (result.error?.includes('admin')) {
          setError(result.error || "This is an admin account. Please use the admin login page.")
        } else {
          setError(result.error || "Google sign-in failed. Please try again.")
        }
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      if (error?.message?.includes('fetch')) {
        setError("Network error. Please check your connection and try again.")
      } else {
        setError(error?.message || "Network error. Please check your connection and try again.")
      }
    } finally {
      setIsGoogleLoading(false)
    }
  }

  // Load Google Identity Services script
  useEffect(() => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    
    if (!googleClientId) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set in environment variables')
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
            text: 'signup_with',
            width: '100%',
          })
          console.log('Google Sign-In button rendered successfully')
        } catch (error) {
          console.error('Error initializing Google Sign-In:', error)
        }
      }
    }
    script.onerror = () => {
      console.error('Failed to load Google Identity Services script')
    }
    
    document.body.appendChild(script)

    return () => {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript)
      }
    }
  }, [handleGoogleSignIn])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validation
    if (!agreeToTerms) {
      setError("You must agree to the terms and conditions")
      setIsLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    const result = await signup(formData.name, formData.email, formData.password)
    
    if (result.success) {
      // Redirect to shop page after successful registration (user is already logged in)
      router.push('/shop')
    } else {
      setError(result.error || "Signup failed")
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md bg-white rounded-2xl luxury-shadow overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-8">
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-4">
              <Monitor className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-center">Create Account</h1>
            <p className="text-text-light text-center mt-2">Join OMOTECH HUB - Your trusted technology partner</p>
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
            <Alert className="mb-6 border-green-200 bg-green-50">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="John Doe"
                className="luxury-input"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="john@example.com"
                className="luxury-input"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="luxury-input pr-10"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-text"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                checked={agreeToTerms}
                onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="terms" className="text-sm font-medium">
                I agree to the{" "}
                <a href="#" className="text-primary hover:underline">
                  Terms and Conditions
                </a>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-4 w-full">
              <div
                ref={googleButtonRef}
                className="w-full flex justify-center"
                style={{ minHeight: '40px' }}
              />
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-light">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        <div className="p-6 bg-secondary border-t border-gray-100 text-center">
          <p className="text-sm text-text-light">
            Need help?{" "}
            <a href="#" className="font-medium text-primary hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  )
} 