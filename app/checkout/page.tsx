"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'
import { useClientAuth } from '@/hooks/useClientAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ShoppingBag, MapPin, Phone, CreditCard, Loader2, ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import Image from 'next/image'
import Link from 'next/link'

export default function CheckoutPage() {
  const { state, clearCart } = useCart()
  const { user, isAuthenticated, isLoading } = useClientAuth()
  const router = useRouter()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('mpesa')
  const [selectedShop, setSelectedShop] = useState('kutus')
  const [notes, setNotes] = useState('')

  // Shop options
  const shopOptions = [
    { value: 'kutus', label: 'Kutus Shop', address: 'Kutus Town Center' },
    { value: 'ku', label: 'KU (Kenyatta University) Shop', address: 'Kenyatta University Campus' },
    { value: 'kagio', label: 'Kagio Shop', address: 'Kagio Town Center' }
  ]

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your session...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push('/login')
    return null
  }

  if (state.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 mt-20 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-600 mb-6">Add some items to your cart before checking out</p>
          <Link href="/shop">
            <Button className="bg-primary hover:bg-primary/90">
              Continue Shopping
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  const handlePlaceOrder = async () => {
    setIsProcessing(true)
    
    try {
      // Simulate order processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Clear cart after successful order
      clearCart()
      
      // Redirect to success page
      router.push('/order-success')
    } catch (error) {
      console.error('Order failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8 mt-20">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/shop">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600">Complete your order</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Delivery Information
                </CardTitle>
                <CardDescription>
                  Where should we deliver your order?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <Input value={user?.name || ''} disabled className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input value={user?.email || ''} disabled className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+254 700 000 000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Delivery Address</label>
                  <textarea
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter your complete delivery address"
                    className="w-full mt-1 p-3 border border-gray-300 rounded-md resize-none"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Order Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions for your order"
                    className="w-full mt-1 p-3 border border-gray-300 rounded-md resize-none"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment"
                      value="mpesa"
                      checked={paymentMethod === 'mpesa'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium">M-Pesa</div>
                      <div className="text-sm text-gray-600">Pay with M-Pesa mobile money</div>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Collect from Shop</div>
                      <div className="text-sm text-gray-600">Choose your preferred collection location</div>
                    </div>
                  </label>
                  
                  {/* Shop Selection - Only show when cash payment is selected */}
                  {paymentMethod === 'cash' && (
                    <div className="ml-6 mt-3 p-4 bg-gray-50 rounded-lg">
                      <label className="text-sm font-medium mb-2 block">Select Collection Shop:</label>
                      <div className="space-y-2">
                        {shopOptions.map((shop) => (
                          <label key={shop.value} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-white transition-colors">
                            <input
                              type="radio"
                              name="shop"
                              value={shop.value}
                              checked={selectedShop === shop.value}
                              onChange={(e) => setSelectedShop(e.target.value)}
                              className="text-primary"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{shop.label}</div>
                              <div className="text-xs text-gray-600">{shop.address}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>
                  {state.itemCount} item{state.itemCount !== 1 ? 's' : ''} in your order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {state.items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-500 capitalize">
                          {item.subcategory}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {item.type === 'product' ? 'Product' : 'Service'}
                        </Badge>
                        
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-gray-600">
                            Qty: {item.quantity}
                          </span>
                          <span className="font-semibold text-primary">
                            Ksh {(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>Ksh {state.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Collection:</span>
                    <span className="text-emerald-600">Free</span>
                  </div>
                  {paymentMethod === 'cash' && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Collection Shop:</span>
                      <span>{shopOptions.find(shop => shop.value === selectedShop)?.label}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">Ksh {state.total.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing || !deliveryAddress.trim() || !phoneNumber.trim()}
                  className="w-full mt-6 bg-primary hover:bg-primary/90"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing Order...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Place Order
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}
