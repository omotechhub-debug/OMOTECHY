"use client"

import React from 'react'
import { CheckCircle, ShoppingBag, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import Link from 'next/link'

export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-2xl mx-auto px-4 py-16 mt-20 text-center">
        <Card>
          <CardHeader>
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Order Placed Successfully!
            </CardTitle>
            <CardDescription className="text-lg">
              Thank you for your order. We'll process it and get back to you soon.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-800 space-y-1 text-left">
                <li>• We'll review your order and confirm availability</li>
                <li>• You'll receive a confirmation call within 30 minutes</li>
                <li>• Your order will be prepared and delivered as scheduled</li>
                <li>• You'll receive updates via SMS throughout the process</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Need help?</h3>
              <p className="text-sm text-gray-600 mb-3">
                If you have any questions about your order, please contact us:
              </p>
              <div className="space-y-1 text-sm">
                <p><strong>Phone:</strong> +254 740 802 704</p>
                <p><strong>Email:</strong> omotechhub@gmail.com</p>
                <p><strong>WhatsApp:</strong> +254 740 802 704</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/shop" className="flex-1">
                <Button className="w-full bg-primary hover:bg-primary/90">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Continue Shopping
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  )
}
