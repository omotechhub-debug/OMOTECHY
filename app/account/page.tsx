"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useClientAuth } from '@/hooks/useClientAuth'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  User, 
  Package, 
  Settings, 
  Edit3, 
  Save, 
  X, 
  Calendar,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShoppingBag,
  ArrowLeft,
  LogOut
} from 'lucide-react'
import Link from 'next/link'

interface Order {
  _id: string
  orderNumber: string
  customer: {
    name: string
    phone: string
    email?: string
    address?: string
  }
  services: Array<{
    serviceId: string
    serviceName: string
    quantity: number
    price: string
  }>
  totalAmount: number
  paymentStatus: 'unpaid' | 'paid' | 'partial' | 'pending' | 'failed'
  status: 'pending' | 'confirmed' | 'in-progress' | 'ready' | 'delivered' | 'cancelled'
  createdAt: string
  updatedAt: string
}

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  approved: boolean
  createdAt: string
}

export default function AccountPage() {
  const { user, isAuthenticated, isLoading, logout } = useClientAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get initial tab from URL params, default to 'profile'
  const initialTab = searchParams?.get('tab') || 'profile'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  })

  // Load profile data
  useEffect(() => {
    if (user) {
      setProfile({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        approved: user.approved,
        createdAt: new Date().toISOString() // We'll get this from API
      })
      setFormData({
        name: user.name,
        email: user.email
      })
    }
  }, [user])

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true)
      const token = localStorage.getItem('clientAuthToken')
      
      const response = await fetch('/api/account/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      } else {
        setError('Failed to load orders')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      setError('Failed to load orders')
    } finally {
      setOrdersLoading(false)
    }
  }

  // Update tab when URL param changes
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab') || 'profile'
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams, activeTab])

  // Load orders when orders tab is active
  useEffect(() => {
    if (activeTab === 'orders' && isAuthenticated) {
      fetchOrders()
    }
  }, [activeTab, isAuthenticated])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    router.push('/login')
    return null
  }

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true)
      setError('')
      setSuccess('')
      
      const token = localStorage.getItem('clientAuthToken')
      
      const response = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Profile updated successfully!')
        setIsEditing(false)
        // Update local profile state
        if (profile) {
          setProfile({
            ...profile,
            name: formData.name,
            email: formData.email
          })
        }
      } else {
        setError(data.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setFormData({
      name: profile?.name || '',
      email: profile?.email || ''
    })
    setError('')
    setSuccess('')
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'unpaid':
        return 'bg-yellow-100 text-yellow-800'
      case 'in-progress':
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'ready':
        return 'bg-purple-100 text-purple-800'
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'paid':
        return <CheckCircle className="w-4 h-4" />
      case 'pending':
      case 'unpaid':
        return <Clock className="w-4 h-4" />
      case 'in-progress':
      case 'confirmed':
        return <Package className="w-4 h-4" />
      case 'ready':
        return <ShoppingBag className="w-4 h-4" />
      case 'cancelled':
      case 'failed':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8 mt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
              <p className="text-gray-600">Manage your profile and view order history</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="text-red-600 hover:bg-red-50 hover:border-red-200"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Alerts */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Manage your personal information and account details
                    </CardDescription>
                  </div>
                  {!isEditing && (
                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Full Name</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email Address</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveProfile} 
                        disabled={isSaving}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button onClick={handleCancelEdit} variant="outline">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="font-medium">{profile?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Email Address</p>
                        <p className="font-medium">{profile?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={profile?.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {profile?.approved ? 'Approved' : 'Pending Approval'}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>
                  View all your past and current orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading orders...</span>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                    <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
                    <Link href="/shop">
                      <Button className="bg-primary hover:bg-primary/90">
                        Start Shopping
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">Order #{order.orderNumber}</h4>
                            <p className="text-sm text-gray-600">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">Ksh {order.totalAmount.toLocaleString()}</p>
                            <Badge className={getStatusColor(order.status)}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1 capitalize">{order.status}</span>
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>{order.customer.address || 'No address provided'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{order.customer.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CreditCard className="w-4 h-4" />
                            <span className="capitalize">{order.paymentStatus}</span>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium mb-2">Services:</p>
                          <div className="space-y-1">
                            {order.services.map((service, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{service.serviceName} x{service.quantity}</span>
                                <span>Ksh {parseFloat(service.price).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account preferences and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Account Status</h4>
                      <p className="text-sm text-gray-600">
                        {profile?.isActive ? 'Your account is active' : 'Your account is inactive'}
                      </p>
                    </div>
                    <Badge variant={profile?.isActive ? 'default' : 'secondary'}>
                      {profile?.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Approval Status</h4>
                      <p className="text-sm text-gray-600">
                        {profile?.approved ? 'Your account is approved' : 'Your account is pending approval'}
                      </p>
                    </div>
                    <Badge variant={profile?.approved ? 'default' : 'secondary'}>
                      {profile?.approved ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Member Since</h4>
                      <p className="text-sm text-gray-600">
                        {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                    <Calendar className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <Footer />
    </div>
  )
} 