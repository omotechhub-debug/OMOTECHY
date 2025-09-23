"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ShirtIcon, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/contexts/AuthContext"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated, isAdmin } = useAuth()
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

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) {
        router.push("/admin")
      } else {
        router.push("/dashboard") // Regular user dashboard
      }
    }
  }, [isAuthenticated, isAdmin, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("") // Clear success message when attempting login

    try {
      // Use dedicated admin login API
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store auth data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authUser', JSON.stringify(data.user));
        
        setSuccess(data.message || "Login successful! Redirecting to admin panel...")
        
        // Use setTimeout to ensure the success message is shown briefly
        setTimeout(() => {
          router.push("/admin")
        }, 1000)
      } else {
        // Handle different types of errors
        if (response.status === 403) {
          setError(data.error || "Access denied. This area is restricted to administrators only.")
        } else if (response.status === 401) {
          setError("Invalid email or password.")
        } else {
          setError(data.error || "Login failed. Please try again.")
        }
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
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link href="/admin/signup" className="font-medium text-[#263C7C] hover:text-[#8B99B9] hover:underline">
                Sign up here
              </Link>
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
