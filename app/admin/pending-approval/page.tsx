"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  LogOut,
  Shield,
  Mail,
  User,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

function PendingApprovalContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userEmail, setUserEmail] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | 'not_found'>('pending')
  const [userName, setUserName] = useState("")

  useEffect(() => {
    // Get email from URL params or localStorage
    const email = searchParams.get('email') || localStorage.getItem('pendingAdminEmail')
    if (email) {
      setUserEmail(email)
      localStorage.setItem('pendingAdminEmail', email)
    } else {
      // If no email, redirect to signup
      router.push('/admin/signup')
    }
  }, [searchParams, router])

  const checkApprovalStatus = async () => {
    if (!userEmail) return

    setIsChecking(true)
    try {
      const response = await fetch(`/api/users/check-approval?email=${encodeURIComponent(userEmail)}`)
      const data = await response.json()

      if (data.success) {
        setApprovalStatus(data.status)
        if (data.user) {
          setUserName(data.user.name)
        }
        
        if (data.status === 'approved') {
          // Redirect to admin login after a short delay
          setTimeout(() => {
            router.push('/admin/login?approved=true')
          }, 2000)
        }
      } else {
        setApprovalStatus('not_found')
      }
    } catch (error) {
      console.error('Error checking approval status:', error)
    } finally {
      setIsChecking(false)
    }
  }

  // Check status on page load
  useEffect(() => {
    if (userEmail) {
      checkApprovalStatus()
    }
  }, [userEmail])

  const handleLogout = () => {
    localStorage.removeItem('pendingAdminEmail')
    router.push('/admin/signup')
  }

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F0F2FE] to-white flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F2FE] to-white flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="shadow-xl border border-[#8B99B9]/20">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#263C7C] flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-[#263C7C]">Admin Access Request</CardTitle>
            <CardDescription>
              {userName ? `Hello ${userName}` : `Request for ${userEmail}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {approvalStatus === 'pending' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Pending</h3>
                  <p className="text-gray-600 mb-4">
                    Your admin access request is under review. You will be notified once approved.
                  </p>
                </div>
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-600">
                    This process typically takes 24-48 hours. Please check back later.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {approvalStatus === 'approved' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Approved!</h3>
                  <p className="text-gray-600 mb-4">
                    Your admin access has been approved. Redirecting to login...
                  </p>
                </div>
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    You can now access the admin panel with your credentials.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {approvalStatus === 'rejected' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Rejected</h3>
                  <p className="text-gray-600 mb-4">
                    Your admin access request has been rejected. Please contact support for more information.
                  </p>
                </div>
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-600">
                    If you believe this is an error, please contact the administrator.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {approvalStatus === 'not_found' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                  <User className="w-8 h-8 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Not Found</h3>
                  <p className="text-gray-600 mb-4">
                    We couldn't find your admin access request. Please submit a new request.
                  </p>
                </div>
              </motion.div>
            )}

            <div className="space-y-3">
              <Button
                onClick={checkApprovalStatus}
                disabled={isChecking}
                className="w-full bg-[#263C7C] hover:bg-[#1e2f5f] text-white"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Checking Status...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check Status
                  </>
                )}
              </Button>

              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Submit New Request
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>Need help? Contact support at</p>
              <a href="tel:+254740802704" className="text-[#263C7C] hover:underline">
                +254 740 802 704
              </a>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default function PendingApproval() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#F0F2FE] to-white flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    }>
      <PendingApprovalContent />
    </Suspense>
  )
}
