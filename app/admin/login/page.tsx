"use client"

import React, { useState, useEffect, Suspense } from "react"
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

function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isAdmin, isLoading: authLoading, login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

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
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

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
