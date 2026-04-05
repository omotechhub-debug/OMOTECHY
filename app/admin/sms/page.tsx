"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, CheckCircle, XCircle, MessageSquare, Settings, Bell } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import SMSTest from '@/components/SMSTest';

export default function SMSAdminPage() {
  const [activeTab, setActiveTab] = useState('test');

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">SMS Management</h1>
            </div>
            <p className="text-gray-600">
              Configure and test SMS notifications for your luxury laundry service
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-white rounded-lg p-1 shadow-sm">
            <Button
              variant={activeTab === 'test' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('test')}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Test SMS
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configuration
            </Button>
            <Button
              variant={activeTab === 'templates' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('templates')}
              className="flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              Message Templates
            </Button>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'test' && (
              <SMSTest />
            )}

            {activeTab === 'settings' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    SMS Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure your Zettatel SMS service settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        To configure SMS, add the following environment variables to your <code>.env.local</code> file:
                      </AlertDescription>
                    </Alert>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm text-gray-700">
{`# SMS Configuration (Zettatel)
SMS_USER_ID=your-zettatel-username
SMS_PASSWORD=your-zettatel-password
SMS_SENDER_ID=LUXURY`}
                      </pre>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Configuration Steps:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                        <li>Sign up for a Zettatel account at <a href="https://portal.zettatel.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">portal.zettatel.com</a></li>
                        <li>Get your User ID and Password from your Zettatel dashboard</li>
                        <li>Register and get approval for your Sender ID (e.g., "LUXURY")</li>
                        <li>Add the environment variables to your <code>.env.local</code> file</li>
                        <li>Restart your development server</li>
                        <li>Test the SMS functionality using the Test SMS tab</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'templates' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    SMS Message Templates
                  </CardTitle>
                  <CardDescription>
                    Predefined message templates for different scenarios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Booking Confirmation</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          Sent when a customer books a service
                        </p>
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          "Thank you for booking with Luxury Laundry! Your order {orderNumber} has been confirmed. Services: {services}. Pickup: {date} at {time}. We'll contact you soon."
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Order Status Update</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          Sent when order status changes
                        </p>
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          "Your order {orderNumber} status has been updated to: {status}. Thank you for choosing Luxury Laundry!"
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Pickup Reminder</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          Sent before scheduled pickup
                        </p>
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          "Reminder: Your laundry pickup is scheduled for {date} at {time}. Order: {orderNumber}. Please ensure someone is available."
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Delivery Notification</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          Sent when order is ready for delivery
                        </p>
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          "Your order {orderNumber} is ready for delivery! We'll contact you shortly to arrange delivery. Thank you for choosing Luxury Laundry!"
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 