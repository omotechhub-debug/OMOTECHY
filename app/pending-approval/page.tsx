"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Clock, AlertCircle, Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function PendingApproval() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <Card className="luxury-shadow border-0 overflow-hidden">
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                Account Pending Approval
              </CardTitle>
              <CardDescription className="text-gray-600 text-base">
                Your account is currently under review by our admin team
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="luxury-shadow border-0 overflow-hidden">
          <CardHeader className="text-center pb-6">
            <motion.div
              className="w-20 h-20 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <Clock className="w-10 h-10 text-white" />
            </motion.div>
            <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
              Account Pending Approval
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              Your account is currently under review by our admin team
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4"
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">What happens next?</h3>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    Our admin team will review your account details and approve your access within 24-48 hours. 
                    You'll receive an email notification once your account is approved.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Account registration completed</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span>Admin review in progress</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-400">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <span>Access granted (pending)</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Need help?</h4>
                  <p className="text-sm text-gray-600">
                    Contact our support team if you have any questions about your account approval.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 pt-4"
            >
              <Link href="/login" className="flex-1">
                <Button variant="outline" className="w-full" size="lg">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90 text-white" 
                size="lg"
                onClick={() => window.location.reload()}
              >
                Check Status
              </Button>
            </motion.div>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mt-6"
        >
          <p className="text-sm text-gray-500">
            Ecolaundryservices • Premium Care for Your Garments
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
} 