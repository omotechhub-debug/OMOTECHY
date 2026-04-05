"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ShirtIcon, Eye, EyeOff, AlertCircle, UserPlus, Shield, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
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

export default function AdminSignup() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    reason: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const googleButtonRefCallback = useRef<HTMLDivElement | null>(null)
  const [showReasonDialog, setShowReasonDialog] = useState(false)
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null)
  const [googleUserInfo, setGoogleUserInfo] = useState<{ name: string; email: string } | null>(null)
  const [reasonForGoogle, setReasonForGoogle] = useState("")

  const handleGoogleSignIn = useCallback(async (response: any) => {
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

      // Decode the Google ID token to get user info (client-side only for display)
      try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]))
        setGoogleUserInfo({
          name: payload.name || payload.email?.split('@')[0] || 'User',
          email: payload.email || ''
        })
      } catch (e) {
        console.error('Error decoding token:', e)
      }

      // Store the ID token and show reason dialog
      setGoogleIdToken(response.credential)
      setShowReasonDialog(true)
      setIsGoogleLoading(false)
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      setError(error?.message || "Network error. Please check your connection and try again.")
      setIsGoogleLoading(false)
    }
  }, [])

  const handleGoogleSignupSubmit = async () => {
    if (!googleIdToken) {
      setError("Google authentication token is missing. Please try again.")
      return
    }

    if (!reasonForGoogle.trim()) {
      setError("Please provide a reason for requesting admin access")
      return
    }

    setIsGoogleLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch('/api/auth/admin-google-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: googleIdToken,
          reason: reasonForGoogle.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message || "Admin account request submitted successfully! You will be notified when approved.")
        setShowReasonDialog(false)
        setGoogleIdToken(null)
        setReasonForGoogle("")
        setGoogleUserInfo(null)
        
        // Redirect to pending approval page after 2 seconds
        setTimeout(() => {
          router.push(`/admin/pending-approval?email=${encodeURIComponent(data.user?.email || '')}`)
        }, 2000)
      } else {
        if (data.code === 'EXISTING_ADMIN_ACCOUNT') {
          setError(data.error || "An admin account with this email already exists. Please use the login page instead.")
          setShowReasonDialog(false)
          setTimeout(() => {
            router.push('/admin/login')
          }, 2000)
        } else {
          setError(data.error || data.message || "Failed to submit admin request")
        }
      }
    } catch (error) {
      setError("Network error. Please check your connection and try again.")
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
      if (window.google && googleButtonRefCallback.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleSignIn,
          })
          
          // Render Google Sign-In button
          window.google.accounts.id.renderButton(googleButtonRefCallback.current, {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    setSuccess("")

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

    if (!formData.reason.trim()) {
      setError("Please provide a reason for requesting admin access")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/admin-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          reason: formData.reason
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message || "Admin account request submitted successfully! You will be notified when approved.")
        // Clear form
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          reason: "",
        })
        setAgreeToTerms(false)
        
        // Redirect to pending approval page after 2 seconds
        setTimeout(() => {
          router.push(`/admin/pending-approval?email=${encodeURIComponent(formData.email)}`)
        }, 2000)
      } else {
        setError(data.message || "Failed to submit admin request")
      }
    } catch (error) {
      setError("Network error. Please check your connection and try again.")
    }
    
    setIsLoading(false)
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
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-center text-[#263C7C]">Request Admin Access</h1>
            <p className="text-gray-600 text-center mt-2">Submit your request to become an administrator</p>
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
              <Clock className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-600">
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

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                Reason for Admin Access
              </Label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                placeholder="Please explain why you need admin access..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#263C7C] focus:border-transparent resize-none"
                rows={3}
                required
                disabled={isLoading}
              />
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
                <a href="#" className="text-[#263C7C] hover:underline">
                  Terms and Conditions
                </a>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#263C7C] hover:bg-[#1e2f5f] text-white rounded-xl h-12"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? "Submitting Request..." : "Submit Admin Request"}
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
                ref={(el) => { googleButtonRefCallback.current = el }}
                className="w-full flex justify-center"
                style={{ minHeight: '40px' }}
              />
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an admin account?{" "}
              <Link href="/admin/login" className="font-medium text-[#263C7C] hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-r from-[#F0F2FE] to-white border-t border-[#8B99B9]/20 text-center">
          <p className="text-sm text-gray-600">
            Need help?{" "}
            <a href="tel:+254740802704" className="font-medium text-[#263C7C] hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </motion.div>

      {/* Reason Dialog for Google Sign-In */}
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#263C7C]">
              <Shield className="w-5 h-5" />
              Complete Admin Request
            </DialogTitle>
            <DialogDescription>
              {googleUserInfo && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{googleUserInfo.name}</p>
                  <p className="text-sm text-gray-600">{googleUserInfo.email}</p>
                </div>
              )}
              Please provide a reason for requesting admin access to complete your registration.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="googleReason" className="text-sm font-medium">
                Reason for Admin Access *
              </Label>
              <Textarea
                id="googleReason"
                value={reasonForGoogle}
                onChange={(e) => setReasonForGoogle(e.target.value)}
                placeholder="Please explain why you need admin access..."
                className="w-full min-h-[100px]"
                required
                disabled={isGoogleLoading}
              />
            </div>
            {error && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-600">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReasonDialog(false)
                setGoogleIdToken(null)
                setReasonForGoogle("")
                setGoogleUserInfo(null)
                setError("")
              }}
              disabled={isGoogleLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGoogleSignupSubmit}
              disabled={isGoogleLoading || !reasonForGoogle.trim()}
              className="bg-[#263C7C] hover:bg-[#1e2f5f]"
            >
              {isGoogleLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}