"use client"

import { useAuth } from "@/hooks/useAuth"
import { canViewPage } from "@/lib/permissions"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import NotPermitted from "./NotPermitted"

interface AdminPageProtectionProps {
  children: React.ReactNode
  pageName?: string
}

export default function AdminPageProtection({ 
  children, 
  pageName 
}: AdminPageProtectionProps) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!loading) {
      setIsChecking(false)
    }
  }, [loading])

  // Show loading while checking authentication
  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Extract page name from pathname
  const getPageName = () => {
    if (pageName) return pageName
    
    const pathSegments = pathname.split('/')
    const adminPage = pathSegments[pathSegments.length - 1]
    
    // Map page names to user-friendly names
    const pageNameMap: { [key: string]: string } = {
      'orders': 'Orders',
      'pos': 'POS System',
      'clients': 'Customers',
      'services': 'Services',
      'categories': 'Categories',
      'reports': 'Reports',
      'users': 'User Management',
      'expenses': 'Expenses',
      'gallery': 'Gallery',
      'testimonials': 'Testimonials',
      'promotions': 'Promotions',
      'banners': 'Banners',
      'payments': 'Payments',
      'mpesa-transactions': 'M-Pesa Transactions',
      'dashboard': 'Dashboard'
    }
    
    return pageNameMap[adminPage] || adminPage
  }

  // Map URL path to page name for permission checking
  const getPageNameFromPath = (path: string) => {
    const pathSegments = path.split('/')
    const adminPage = pathSegments[pathSegments.length - 1]
    
    // Handle special cases
    if (adminPage === 'clients') return 'customers'
    if (adminPage === 'inventory-management') return 'inventory-management'
    if (adminPage === 'mpesa-transactions') return 'mpesa-transactions'
    
    return adminPage
  }

  // Check if user has permission to view this page
  const permissionPageName = getPageNameFromPath(pathname)
  const hasPermission = canViewPage(user, permissionPageName)

  if (!hasPermission) {
    return (
      <NotPermitted 
        pageName={getPageName()}
        reason="Your current role does not have permission to access this page."
      />
    )
  }

  return <>{children}</>
}
