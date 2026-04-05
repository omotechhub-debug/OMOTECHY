"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, CheckCircle, XCircle } from 'lucide-react';

export default function SMSTest() {
  const [mobile, setMobile] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);

  const testSMSConfig = async () => {
    try {
      const response = await fetch('/api/sms');
      const data = await response.json();
      setConfig(data.config);
    } catch (error) {
      console.error('Failed to get SMS config:', error);
    }
  };

  const sendTestSMS = async () => {
    if (!mobile || !message) {
      alert('Please enter both mobile number and message');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile,
          message,
          type: 'test'
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to send SMS'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendSampleBookingSMS = async () => {
    setMobile('254796030992'); // Replace with your test number
    setMessage(`*** Welcome to Econuru Services! ***

Your order #ORD-123456 has been confirmed! 

Services: Wash & Fold, Dry Cleaning
Pickup: 2024-01-15 at 10:00 AM

We're excited to serve you with our premium laundry care!

You'll get a text as soon as your booking is approved.

Thank you for choosing Econuru Services!

Need help? Call us: +254757883799`);
  };

  const sendSampleStatusUpdate = async () => {
    setMobile('254796030992');
    setMessage(`✓ Order Update - Econuru Services ✓

Your order #ORD-123456 is now: COMPLETED

We're working hard to give your clothes the care they deserve!

Stay tuned for more updates! 

Thank you for trusting Econuru Services!

Customer care: +254757883799`);
  };

  const sendSampleDeliveryNotification = async () => {
    setMobile('254796030992');
    setMessage(`*** Great News! - Econuru Services ***

Your order #ORD-123456 is ready for delivery! 

Your clothes have been treated with our premium care and are looking fabulous!

We'll contact you shortly to arrange delivery.

Thank you for choosing Econuru Services - where quality meets care!

Don't forget to share your experience with friends and family!

We appreciate your business!

Customer care: +254757883799`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            SMS Configuration Status
          </CardTitle>
          <CardDescription>
            Check your SMS service configuration and test SMS functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testSMSConfig} variant="outline" className="mb-4">
            Check SMS Configuration
          </Button>
          
          {config && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">User ID:</span> {config.userId}
                </div>
                <div>
                  <span className="font-medium">Password:</span> {config.password}
                </div>
                <div>
                  <span className="font-medium">Sender ID:</span> {config.senderId}
                </div>
                <div>
                  <span className="font-medium">API URL:</span> {config.apiUrl}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send Test SMS</CardTitle>
          <CardDescription>
            Test SMS functionality with custom messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Mobile Number (with country code)
            </label>
            <Input
              type="text"
              placeholder="919999999999"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Include country code (e.g., 91 for India)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Message
            </label>
            <Textarea
              placeholder="Enter your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={sendTestSMS} 
              disabled={loading || !mobile || !message}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send SMS
            </Button>
            
            <Button 
              onClick={sendSampleBookingSMS} 
              variant="outline"
              disabled={loading}
            >
              Sample Booking
            </Button>

            <Button 
              onClick={sendSampleStatusUpdate} 
              variant="outline"
              disabled={loading}
            >
              Sample Status
            </Button>

            <Button 
              onClick={sendSampleDeliveryNotification} 
              variant="outline"
              disabled={loading}
            >
              Sample Delivery
            </Button>
          </div>

          {result && (
            <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                {result.success ? (
                  <div>
                    <p className="font-medium">SMS sent successfully!</p>
                    <p className="text-sm mt-1">Transaction ID: {result.smsResponse?.transactionId}</p>
                    <p className="text-sm">Status: {result.smsResponse?.status}</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">Failed to send SMS</p>
                    <p className="text-sm mt-1">{result.error}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 