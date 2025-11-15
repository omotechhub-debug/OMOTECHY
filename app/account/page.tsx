"use client"

import React, { useState, useEffect, Suspense } from 'react'
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
  LogOut,
  FileText,
  Printer
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

function AccountPageContent() {
  const { user, isAuthenticated, isLoading, logout } = useClientAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get initial tab from URL params, default to 'profile'
  const initialTab = searchParams?.get('tab') || 'profile'
  const [activeTab, setActiveTab] = useState<string>(initialTab)
  
  // Debug: Log activeTab changes
  useEffect(() => {
    console.log('Active tab state updated to:', activeTab);
  }, [activeTab])
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Payment state
  const [processingPayment, setProcessingPayment] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<{ [orderId: string]: 'pending' | 'success' | 'failed' }>({})
  
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
    setActiveTab(tabFromUrl)
  }, [searchParams])

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

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Generate receipt HTML
  const generateReceiptHTML = (order: Order) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${order.orderNumber}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 20px;
            background: white;
            color: black;
          }
          .receipt {
            max-width: 400px;
            margin: 0 auto;
            border: 2px solid #000;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .business-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .business-tagline {
            font-size: 14px;
            margin-bottom: 5px;
          }
          .order-info {
            margin-bottom: 20px;
          }
          .order-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .customer-info {
            margin-bottom: 20px;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
          }
          .services {
            margin-bottom: 20px;
          }
          .service-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .service-details {
            font-size: 12px;
            color: #666;
            margin-left: 20px;
          }
          .totals {
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-top: 20px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .final-total {
            font-size: 18px;
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 10px;
            margin-top: 10px;
          }
          .payment-status {
            text-align: center;
            margin: 20px 0;
            padding: 10px;
            border: 2px solid #000;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
          }
          .thank-you {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          @media print {
            body { margin: 0; }
            .receipt { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="business-name">ECONURU LAUNDRY</div>
            <div class="business-tagline">Professional Laundry Services</div>
            <div style="font-size: 12px;">Quality Care for Your Garments</div>
          </div>

          <div class="order-info">
            <div class="order-row">
              <span><strong>Order #:</strong></span>
              <span>${order.orderNumber}</span>
            </div>
            <div class="order-row">
              <span><strong>Date:</strong></span>
              <span>${formatDate(order.createdAt)}</span>
            </div>
            <div class="order-row">
              <span><strong>Time:</strong></span>
              <span>${new Date(order.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>

          <div class="customer-info">
            <div class="order-row">
              <span><strong>Customer:</strong></span>
              <span>${order.customer.name || 'N/A'}</span>
            </div>
            <div class="order-row">
              <span><strong>Phone:</strong></span>
              <span>${order.customer.phone}</span>
            </div>
            ${order.customer.email ? `
            <div class="order-row">
              <span><strong>Email:</strong></span>
              <span>${order.customer.email}</span>
            </div>
            ` : ''}
            ${order.customer.address ? `
            <div class="order-row">
              <span><strong>Address:</strong></span>
              <span>${order.customer.address}</span>
            </div>
            ` : ''}
          </div>

          <div class="services">
            <div style="text-align: center; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px;">
              SERVICES
            </div>
            ${order.services.map(service => `
              <div class="service-item">
                <div>
                  <div><strong>${service.serviceName}</strong></div>
                  <div class="service-details">Qty: ${service.quantity} × Ksh ${parseFloat(service.price).toLocaleString()}</div>
                </div>
                <div><strong>Ksh ${(parseFloat(service.price) * service.quantity).toLocaleString()}</strong></div>
              </div>
            `).join('')}
          </div>

          <div class="totals">
            <div class="final-total">
              <div class="total-row">
                <span>TOTAL:</span>
                <span>Ksh ${(order.totalAmount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div class="payment-status">
            <div style="font-weight: bold; margin-bottom: 5px;">PAYMENT STATUS</div>
            <div style="font-size: 18px; font-weight: bold; color: ${(order.paymentStatus || 'unpaid') === 'paid' ? 'green' : (order.paymentStatus || 'unpaid') === 'partial' ? 'orange' : 'red'};">
              ${(order.paymentStatus || 'unpaid').toUpperCase()}
            </div>
            ${(order.paymentStatus || 'unpaid') === 'partial' && (order as any).remainingBalance ? `
            <div style="margin-top: 5px; font-size: 14px;">
              Paid: Ksh ${((order.totalAmount || 0) - ((order as any).remainingBalance || 0)).toLocaleString()}<br>
              Remaining: Ksh ${((order as any).remainingBalance || 0).toLocaleString()}
            </div>
            ` : ''}
            ${(order.paymentStatus === 'paid' || order.paymentStatus === 'partial') && ((order as any).mpesaReceiptNumber || (order as any).mpesaPayment?.mpesaReceiptNumber) ? `
            <div style="margin-top: 5px; font-size: 12px;">
              Receipt: ${(order as any).mpesaPayment?.mpesaReceiptNumber || (order as any).mpesaReceiptNumber}
            </div>
            ` : ''}
          </div>

          <div class="footer">
            <div class="thank-you">Thank You for Choosing Econuru!</div>
            <div style="font-size: 13px; margin-bottom: 2px;">For inquiries: <span style="white-space: nowrap;">+254757883799</span></div>
            <div style="font-size: 13px; margin-bottom: 16px; word-break: break-all;"><span style="font-weight: bold;">Email:</span> econuruservices@gmail.com</div>
            <div style="margin-top: 0; font-size: 10px;">
              This receipt serves as proof of order placement.<br>
              Please keep it safe for order tracking.
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Print receipt
  const printReceipt = (order: Order) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const receiptContent = generateReceiptHTML(order)

    printWindow.document.write(receiptContent)
    printWindow.document.close()
    printWindow.focus()
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  // Download receipt as PDF
  const downloadReceiptAsPDF = async (order: Order) => {
    try {
      // Dynamically import jsPDF and html2canvas
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ])

      // Create a temporary container for the receipt
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '0'
      tempContainer.style.width = '400px'
      tempContainer.style.background = 'white'
      tempContainer.style.padding = '20px'
      tempContainer.style.fontFamily = 'Courier New, monospace'
      tempContainer.style.color = 'black'
      tempContainer.style.border = '2px solid #000'
      tempContainer.innerHTML = generateReceiptHTML(order).replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<head>[\s\S]*?<\/head>/g, '').replace(/<html>|<\/html>|<body>|<\/body>/g, '')

      document.body.appendChild(tempContainer)

      // Wait a bit for the content to render
      await new Promise(resolve => setTimeout(resolve, 100))

      // Convert to canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 400,
        height: tempContainer.scrollHeight
      })

      // Remove the temporary container
      document.body.removeChild(tempContainer)

      // Create PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 295 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Download the PDF
      pdf.save(`receipt-${order.orderNumber}-${formatDate(order.createdAt)}.pdf`)

      setSuccess(`Receipt for order ${order.orderNumber} has been downloaded.`)

    } catch (error) {
      console.error('Error generating PDF:', error)
      setError('There was an error generating the PDF. Please try again.')
    }
  }

  // Poll payment status
  const pollPaymentStatus = async (checkoutRequestId: string, orderId: string) => {
    const maxAttempts = 30 // Poll for up to 5 minutes (30 * 10 seconds)
    let attempts = 0

    const poll = async () => {
      if (attempts >= maxAttempts) {
        console.log('Payment polling timeout')
        setPaymentStatus(prev => ({ ...prev, [orderId]: 'failed' }))
        setProcessingPayment(null)
        setError('Payment verification timeout. Please contact support if payment was successful.')
        return
      }

      attempts++

      try {
        const token = localStorage.getItem('clientAuthToken')
        const response = await fetch(`/api/mpesa/status/${checkoutRequestId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()

        if (data.success && data.resultCode === '0') {
          // Payment successful
          setPaymentStatus(prev => ({ ...prev, [orderId]: 'success' }))
          setProcessingPayment(null)
          setSuccess('Payment successful! Your order has been updated.')
          // Refresh orders to show updated payment status
          await fetchOrders()
        } else if (data.resultCode && data.resultCode !== '1032') {
          // Payment failed (1032 means still processing)
          setPaymentStatus(prev => ({ ...prev, [orderId]: 'failed' }))
          setProcessingPayment(null)
          setError(data.resultDesc || 'Payment failed. Please try again.')
        } else {
          // Still processing, poll again
          setTimeout(poll, 10000) // Poll every 10 seconds
        }
      } catch (error) {
        console.error('Error polling payment status:', error)
        // Continue polling on error
        setTimeout(poll, 10000)
      }
    }

    // Start polling after 5 seconds
    setTimeout(poll, 5000)
  }

  // Handle payment initiation
  const handlePayOrder = async (order: Order) => {
    if (!order.customer.phone) {
      setError('Phone number is required for payment. Please update your profile.')
      return
    }

    try {
      setProcessingPayment(order._id)
      setPaymentStatus(prev => ({ ...prev, [order._id]: 'pending' }))
      setError('')
      setSuccess('')

      const token = localStorage.getItem('clientAuthToken')
      if (!token) {
        setError('Please login to make a payment')
        return
      }

      // Format phone number (remove spaces, ensure +254 format)
      let formattedPhone = order.customer.phone.replace(/\s+/g, '')
      if (!formattedPhone.startsWith('+254')) {
        if (formattedPhone.startsWith('254')) {
          formattedPhone = '+' + formattedPhone
        } else if (formattedPhone.startsWith('0')) {
          formattedPhone = '+254' + formattedPhone.substring(1)
        } else {
          formattedPhone = '+254' + formattedPhone
        }
      }

      // Calculate amount to pay (use remainingAmount if available, otherwise totalAmount)
      const amountToPay = (order as any).remainingAmount || order.totalAmount

      const response = await fetch('/api/mpesa/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: order._id,
          phoneNumber: formattedPhone,
          amount: amountToPay,
          paymentType: 'full'
        })
      })

      const data = await response.json()

      if (data.success && data.checkoutRequestId) {
        setSuccess(`Payment request sent to ${formattedPhone}. Please check your phone and enter your M-Pesa PIN.`)
        // Start polling for payment status
        pollPaymentStatus(data.checkoutRequestId, order._id)
      } else {
        setPaymentStatus(prev => ({ ...prev, [order._id]: 'failed' }))
        setProcessingPayment(null)
        setError(data.error || 'Failed to initiate payment. Please try again.')
      }
    } catch (error) {
      console.error('Error initiating payment:', error)
      setPaymentStatus(prev => ({ ...prev, [order._id]: 'failed' }))
      setProcessingPayment(null)
      setError('Failed to initiate payment. Please try again.')
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

        <Tabs 
          value={activeTab || 'profile'} 
          onValueChange={(value) => {
            console.log('Tab changed to:', value, 'Current activeTab:', activeTab);
            setActiveTab(value);
            // Update URL using router
            router.push(`/account?tab=${value}`, { scroll: false });
          }} 
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger 
              value="profile" 
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="flex items-center gap-2"
            >
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

                        {/* Payment and Receipt Actions */}
                        <div className="mt-4 pt-4 border-t space-y-3">
                          {/* Payment Button for Unpaid Orders */}
                          {(order.paymentStatus === 'unpaid' || order.paymentStatus === 'failed' || order.paymentStatus === 'partial') && (
                            <div>
                              {paymentStatus[order._id] === 'pending' ? (
                                <div className="flex items-center gap-2 text-sm text-blue-600">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Payment request sent! Please check your phone and enter your M-Pesa PIN.</span>
                                </div>
                              ) : paymentStatus[order._id] === 'success' ? (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Payment successful! Your order has been updated.</span>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => handlePayOrder(order)}
                                  disabled={processingPayment === order._id}
                                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                                >
                                  {processingPayment === order._id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <CreditCard className="w-4 h-4 mr-2" />
                                      Pay Now (M-Pesa)
                                    </>
                                  )}
                                </Button>
                              )}
                              {paymentStatus[order._id] === 'failed' && (
                                <p className="text-xs text-red-600 mt-2">Payment failed. Please try again.</p>
                              )}
                            </div>
                          )}

                          {/* Receipt Download Buttons */}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => printReceipt(order)}
                              variant="outline"
                              className="flex-1"
                            >
                              <Printer className="w-4 h-4 mr-2" />
                              Print Receipt
                            </Button>
                            <Button
                              onClick={() => downloadReceiptAsPDF(order)}
                              variant="outline"
                              className="flex-1"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Download PDF
                            </Button>
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

export default function AccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AccountPageContent />
    </Suspense>
  )
} 