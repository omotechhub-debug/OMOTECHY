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

  const sendSamplePurchaseSMS = async () => {
    setMessage(`OMOTECH HUB COMPUTERS

Thank you for shopping with us.

Purchase: Laptop Service
Amount: Ksh 1,500
Order No: #TEST123

Your purchase has been confirmed successfully.

We offer services including:
- Laptop and desktop sales
- Computer and laptop repairs
- Electronics and accessories
- Printing, photocopying, binding and lamination
- Gas refilling, cylinder sales and delivery
- Laundry and pickup/delivery
- Student storage services
For enquiries or online orders, call/WhatsApp: 0740 802 704.

Thank you for choosing Omotech Hub Computers. We appreciate your business.`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            SMS configuration status
          </CardTitle>
          <CardDescription>
            Check TXTLINK status and send a custom test message
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testSMSConfig} variant="outline" className="mb-4">
            Check SMS configuration
          </Button>
          
          {config && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium">Provider:</span> {config.provider || 'txtlink'}
              </div>
              <div>
                <span className="font-medium">API key:</span> {config.hasApiKey ? config.apiKeyMasked || 'Configured' : 'Not configured'}
              </div>
              <div>
                <span className="font-medium">Sender ID:</span> {config.senderIdName || 'Default'}
              </div>
              <div>
                <span className="font-medium">Enabled:</span> {config.enabled === false ? 'No' : 'Yes'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send test SMS</CardTitle>
          <CardDescription>
            Uses the TXTLINK settings saved on the Configuration tab
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Mobile number
            </label>
            <Input
              type="text"
              placeholder="+254712345678 or 0712345678"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Kenyan numbers are converted to E.164 (+254...)
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
              rows={8}
            />
          </div>

          <div className="flex flex-wrap gap-2">
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
              onClick={sendSamplePurchaseSMS} 
              variant="outline"
              disabled={loading}
            >
              Sample purchase SMS
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
                    <p className="font-medium">SMS sent successfully</p>
                    <p className="text-sm mt-1">Message ID: {result.smsResponse?.messageId || result.smsResponse?.transactionId || 'N/A'}</p>
                    <p className="text-sm">Status: {result.smsResponse?.status || 'queued'}</p>
                    {typeof result.smsResponse?.newBalance === 'number' && (
                      <p className="text-sm">New balance: {result.smsResponse.newBalance} credits</p>
                    )}
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
