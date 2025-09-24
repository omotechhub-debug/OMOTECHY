"use client"

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Package, 
  Settings, 
  DollarSign, 
  Megaphone, 
  MessageSquare,
  UserCheck,
  BarChart3,
  Shield,
  Crown,
  Home,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Star,
  ImageIcon,
  Calculator,
  FileText,
  CreditCard,
  Database,
  ShoppingCart,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react'
import AdminProtectedRoute from '@/components/AdminProtectedRoute'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AdminPage() {
  const { user, logout } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false)
        setIsCollapsed(false)
      } else {
        setIsSidebarOpen(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const adminSections = [
    {
      title: "Dashboard",
      description: "Overview of your business metrics and performance",
      href: "/admin/dashboard",
      icon: BarChart3,
      color: "bg-gradient-to-br from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700"
    },
    {
      title: "Orders",
      description: "Manage customer orders, track deliveries, and handle returns",
      href: "/admin/orders",
      icon: Package,
      color: "bg-gradient-to-br from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700"
    },
    {
      title: "Clients",
      description: "View and manage customer information and preferences",
      href: "/admin/clients",
      icon: Users,
      color: "bg-gradient-to-br from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700"
    },
    {
      title: "Employees",
      description: "Manage your staff, schedules, and performance",
      href: "/admin/employees",
      icon: UserCheck,
      color: "bg-gradient-to-br from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      textColor: "text-orange-700"
    },
    {
      title: "Services",
      description: "Configure electronics, gas, and printing services",
      href: "/admin/services",
      icon: Settings,
      color: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-700"
    },
    {
      title: "Promotions",
      description: "Create and manage special offers and discounts",
      href: "/admin/promotions",
      icon: Megaphone,
      color: "bg-gradient-to-br from-pink-500 to-pink-600",
      bgColor: "bg-pink-50",
      textColor: "text-pink-700"
    },
    {
      title: "Contact",
      description: "Manage customer inquiries and support tickets",
      href: "/admin/contact",
      icon: MessageSquare,
      color: "bg-gradient-to-br from-cyan-500 to-cyan-600",
      bgColor: "bg-cyan-50",
      textColor: "text-cyan-700"
    },
    {
      title: "Expenses",
      description: "Track business expenses and financial reports",
      href: "/admin/expenses",
      icon: DollarSign,
      color: "bg-gradient-to-br from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700"
    },
    {
      title: "Gallery",
      description: "Manage your service photos and portfolio",
      href: "/admin/gallery",
      icon: ImageIcon,
      color: "bg-gradient-to-br from-violet-500 to-violet-600",
      bgColor: "bg-violet-50",
      textColor: "text-violet-700"
    },
    {
      title: "Reports",
      description: "Generate detailed business analytics and reports",
      href: "/admin/reports",
      icon: FileText,
      color: "bg-gradient-to-br from-slate-500 to-slate-600",
      bgColor: "bg-slate-50",
      textColor: "text-slate-700"
    },
    {
      title: "User Management",
      description: "Manage user accounts, roles, and permissions",
      href: "/admin/users",
      icon: Shield,
      color: "bg-gradient-to-br from-rose-500 to-rose-600",
      bgColor: "bg-rose-50",
      textColor: "text-rose-700"
    },
    {
      title: "POS System",
      description: "Point of sale system for in-store transactions",
      href: "/admin/pos",
      icon: Calculator,
      color: "bg-gradient-to-br from-amber-500 to-amber-600",
      bgColor: "bg-amber-50",
      textColor: "text-amber-700"
    },
    {
      title: "Testimonials",
      description: "Manage customer reviews and testimonials",
      href: "/admin/testimonials",
      icon: Star,
      color: "bg-gradient-to-br from-yellow-500 to-yellow-600",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700"
    },
    {
      title: "M-Pesa Transactions",
      description: "Monitor and manage M-Pesa payment transactions",
      href: "/admin/mpesa-transactions",
      icon: CreditCard,
      color: "bg-gradient-to-br from-green-500 to-green-600",
      bgColor: "bg-green-50",
      textColor: "text-green-700"
    },
    {
      title: "Inventory",
      description: "Manage product inventory and stock levels",
      href: "/admin/inventory",
      icon: Database,
      color: "bg-gradient-to-br from-sky-500 to-sky-600",
      bgColor: "bg-sky-50",
      textColor: "text-sky-700"
    },
    {
      title: "Payments",
      description: "Track and manage all payment transactions",
      href: "/admin/payments",
      icon: ShoppingCart,
      color: "bg-gradient-to-br from-fuchsia-500 to-fuchsia-600",
      bgColor: "bg-fuchsia-50",
      textColor: "text-fuchsia-700"
    },
    {
      title: "Banners",
      description: "Manage homepage banners and promotional content",
      href: "/admin/banners",
      icon: ImageIcon,
      color: "bg-gradient-to-br from-rose-500 to-rose-600",
      bgColor: "bg-rose-50",
      textColor: "text-rose-700"
    }
  ]

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Top Bar */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6">
            {/* Page Title */}
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900">Admin Overview</h1>
            </div>
            {/* User Info */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                <span>Welcome,</span>
                <span className="font-medium text-gray-900">
                  {user?.name || user?.email || "Admin"}
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 bg-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm border border-gray-200">
                {user?.role === 'superadmin' ? (
                  <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                ) : (
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                )}
                <div className="hidden sm:block">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">
                    {user?.name || user?.email}
                  </span>
                  <span className="text-xs text-gray-500 capitalize ml-1">
                    ({user?.role})
                  </span>
                </div>
                <div className="sm:hidden">
                  <span className="text-xs font-medium text-gray-700">
                    {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || "Admin"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Page Content */}
        <div className="p-3 sm:p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Welcome Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-[#F0F2FE] via-[#E8EBF7] to-[#DDE2F0] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 relative overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                <div className="absolute top-4 left-4 w-16 h-16 bg-[#263C7C]/10 rounded-full blur-xl"></div>
                <div className="absolute top-8 right-8 w-12 h-12 bg-[#8B99B9]/15 rounded-full blur-xl"></div>
                <div className="absolute bottom-4 left-1/4 w-20 h-20 bg-[#1FC77A]/10 rounded-full blur-xl"></div>
              </div>
              
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  {user?.role === 'superadmin' ? (
                    <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-[#263C7C] flex-shrink-0" />
                  ) : (
                    <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-[#263C7C] flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#263C7C] mb-1 sm:mb-2">
                      Welcome back, {user?.name || 'Admin'}!
                    </h2>
                    <p className="text-gray-600 text-xs sm:text-sm lg:text-base">
                      Manage your electronics, gas supply, and printing business with ease
                    </p>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 sm:p-3 lg:p-4 text-center">
                    <div className="text-base sm:text-lg lg:text-xl font-bold text-[#263C7C]">17</div>
                    <div className="text-xs sm:text-sm text-gray-600">Admin Sections</div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 sm:p-3 lg:p-4 text-center">
                    <div className="text-base sm:text-lg lg:text-xl font-bold text-[#1FC77A]">3</div>
                    <div className="text-xs sm:text-sm text-gray-600">Service Categories</div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 sm:p-3 lg:p-4 text-center">
                    <div className="text-base sm:text-lg lg:text-xl font-bold text-[#8B99B9]">24/7</div>
                    <div className="text-xs sm:text-sm text-gray-600">System Access</div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 sm:p-3 lg:p-4 text-center">
                    <div className="text-base sm:text-lg lg:text-xl font-bold text-[#263C7C]">100%</div>
                    <div className="text-xs sm:text-sm text-gray-600">Mobile Ready</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats */}
            {/* Removed quickStats cards as requested */}

            {/* Admin Sections */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">Quick Access</h3>
                <p className="text-sm sm:text-base text-gray-600">Navigate to different sections of your admin panel</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
                {adminSections.map((section, index) => {
            const IconComponent = section.icon
            return (
                    <motion.div
                      key={section.href}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
                    >
                      <Link href={section.href}>
                        <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 bg-white shadow-sm hover:shadow-md hover:-translate-y-1 h-full">
                  <CardHeader className="pb-1 sm:pb-2 lg:pb-3 px-2 sm:px-3 lg:px-6">
                    <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
                              <div className={`p-2 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl ${section.color} group-hover:scale-110 transition-transform`}>
                                <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                      </div>
                              <CardTitle className="text-xs sm:text-sm lg:text-base font-semibold group-hover:text-blue-600 transition-colors leading-tight">
                                {section.title}
                              </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 px-2 sm:px-3 lg:px-6">
                            <CardDescription className="text-xs sm:text-sm leading-relaxed text-center line-clamp-2">
                      {section.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
                    </motion.div>
            )
          })}
        </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-4 sm:pt-6 lg:pt-8"
            >
              <Link href="/admin/dashboard">
                <Button className="bg-[#263C7C] hover:bg-[#1e2f5f] text-white px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto">
                  <BarChart3 className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Go to Dashboard</span>
            </Button>
          </Link>
          <Link href="/">
                <Button variant="outline" className="px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl border-2 border-[#263C7C] text-[#263C7C] hover:bg-[#263C7C] hover:text-white transition-all duration-300 w-full sm:w-auto">
                  <Home className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Back to Website</span>
            </Button>
          </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  )
} 