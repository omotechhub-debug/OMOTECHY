"use client"

import { motion } from "framer-motion"
import { Shield, ArrowLeft, AlertTriangle, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"

export default function UnauthorizedPage() {
  const { logout } = useAuth()
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md bg-white rounded-2xl luxury-shadow overflow-hidden text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-8">
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-900">Access Denied</h1>
            <p className="text-text-light text-center mt-2">
              You don't have permission to access this area. This section is restricted to authorized personnel only.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700">
                <Shield className="w-5 h-5" />
                <span className="font-medium">Restricted Area</span>
              </div>
              <p className="text-sm text-red-600 mt-1">
                This page requires admin or superadmin privileges.
              </p>
            </div>

            <div className="flex flex-col gap-3 items-center">
              <Link href="/admin">
                <Button className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl justify-center">
                  Dashboard
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full rounded-xl justify-center">
                  Return to Home
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full rounded-xl justify-center text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={logout}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </Button>
            </div>

            <div className="text-xs text-gray-500 mt-6">
              <p>If you believe you should have access to this area,</p>
              <p>please contact your system administrator.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
} 