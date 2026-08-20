"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, CheckCircle, XCircle, MessageSquare, Settings, Bell, Save, Eye, EyeOff, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import SMSTest from '@/components/SMSTest';
import SmsTemplateEditor from '@/components/SmsTemplateEditor';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';

interface SmsConfig {
  provider: string;
  baseUrl: string;
  sendUrl: string;
  hasApiKey: boolean;
  apiKeyMasked: string;
  senderIdName: string;
  enabled: boolean;
  source: 'admin' | 'env' | 'none';
  dailyReportPhone?: string;
  dailyReportEnabled?: boolean;
  lastDailyReportDate?: string;
  lastDailyReportAt?: string | null;
}

export default function SMSAdminPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('settings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [senderIdName, setSenderIdName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [dailyReportPhone, setDailyReportPhone] = useState('');
  const [dailyReportEnabled, setDailyReportEnabled] = useState(true);
  const [sendingDailyReport, setSendingDailyReport] = useState(false);
  const [sendingDeficitAlert, setSendingDeficitAlert] = useState(false);
  const [sendingPendingAlert, setSendingPendingAlert] = useState(false);
  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const loadSettings = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/sms-settings', { headers: authHeaders });
      const data = await response.json();
      if (data.success && data.config) {
        setConfig(data.config);
        setSenderIdName(data.config.senderIdName || '');
        setEnabled(data.config.enabled !== false);
        setApiKey(data.config.hasApiKey ? data.config.apiKeyMasked : '');
        setDailyReportPhone(data.config.dailyReportPhone || '');
        setDailyReportEnabled(data.config.dailyReportEnabled !== false);
      }
    } catch (error) {
      console.error('Failed to load SMS settings:', error);
      setStatusMessage({ type: 'error', text: 'Failed to load SMS settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const saveSettings = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/admin/sms-settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          apiKey,
          senderIdName,
          enabled,
          dailyReportPhone,
          dailyReportEnabled,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save SMS settings');
      }
      setConfig(data.config);
      setApiKey(data.config.apiKeyMasked || '');
      setDailyReportPhone(data.config.dailyReportPhone || dailyReportPhone);
      setDailyReportEnabled(data.config.dailyReportEnabled !== false);
      setShowApiKey(false);
      setStatusMessage({ type: 'success', text: 'SMS settings saved.' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save SMS settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTestSms = async () => {
    if (!testPhone.trim()) {
      setTestResult({ success: false, error: 'Enter a phone number to test' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: testPhone.trim(),
          message: 'OMOTECH HUB COMPUTERS\n\nThis is a test SMS from your admin settings.\n\nThank you for choosing Omotech Hub Computers.',
          type: 'test',
        }),
      });
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test SMS',
      });
    } finally {
      setTesting(false);
    }
  };

  const sendDailyReportNow = async () => {
    setSendingDailyReport(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/admin/daily-report', {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to send daily report SMS');
      }
      const profit = data.summary?.profit ?? 0;
      setStatusMessage({
        type: 'success',
        text: `Today’s report sent to ${data.phone}. Profit: KSh ${Math.round(profit).toLocaleString('en-KE')}.`,
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send daily report SMS',
      });
    } finally {
      setSendingDailyReport(false);
    }
  };

  const sendDeficitAlertNow = async () => {
    setSendingDeficitAlert(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/admin/deficit-alert', {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to send partial-payment SMS');
      }
      setStatusMessage({
        type: 'success',
        text: `Partial-payment SMS sent to ${data.phone}. Orders listed: ${data.count || 0}.`,
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send partial-payment SMS',
      });
    } finally {
      setSendingDeficitAlert(false);
    }
  };

  const sendPendingAlertNow = async () => {
    setSendingPendingAlert(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/admin/pending-confirmations-alert', {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to send pending-confirmations SMS');
      }
      setStatusMessage({
        type: 'success',
        text: `Pending-confirmations SMS sent to ${data.phone}. Payments waiting: ${data.count || 0}.`,
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send pending-confirmations SMS',
      });
    } finally {
      setSendingPendingAlert(false);
    }
  };

  return (
    <AdminProtectedRoute requireSuperAdmin={true}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">SMS Settings</h1>
            </div>
            <p className="text-gray-600">
              Midnight profit SMS runs on Vercel Cron. 8 AM stock, 1 PM balances, and 8 PM payment confirmations send when someone logs in.
            </p>
          </div>

          <div className="flex space-x-1 mb-6 bg-white rounded-lg p-1 shadow-sm">
            <Button
              variant={activeTab === 'settings' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configuration
            </Button>
            <Button
              variant={activeTab === 'test' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('test')}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Test SMS
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

          <div className="space-y-6">
            {activeTab === 'settings' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      TXTLINK configuration
                    </CardTitle>
                    <CardDescription>
                      Paste your TXTLINK API key and sender ID. These are used for paid-order SMS and other admin messages.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading settings...
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {statusMessage && (
                          <Alert className={statusMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                            {statusMessage.type === 'success' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <AlertDescription className={statusMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                              {statusMessage.text}
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <p className="font-medium">Enable SMS sending</p>
                            <p className="text-sm text-gray-500">Turn this off to pause all outgoing SMS</p>
                          </div>
                          <Switch checked={enabled} onCheckedChange={setEnabled} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="apiKey">API key</Label>
                          <div className="relative">
                            <Input
                              id="apiKey"
                              type={showApiKey ? 'text' : 'password'}
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder="Paste your TXTLINK API key"
                              autoComplete="off"
                              className="pr-10"
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                              onClick={() => setShowApiKey((prev) => !prev)}
                              aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                            >
                              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500">
                            {config?.hasApiKey
                              ? `Saved key: ${config.apiKeyMasked}. Leave as-is to keep it, or paste a new key to replace it.`
                              : 'Get this from your TXTLINK dashboard. Requests use Bearer authentication.'}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="senderIdName">Sender ID name</Label>
                          <Input
                            id="senderIdName"
                            value={senderIdName}
                            onChange={(e) => setSenderIdName(e.target.value)}
                            placeholder="e.g. OMOTECH"
                          />
                          <p className="text-xs text-gray-500">
                            Must be a sender ID already approved on your TXTLINK account. Leave blank to use the TXTLINK default.
                          </p>
                        </div>

                        <div className="grid gap-3 text-sm rounded-lg bg-gray-50 p-4">
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-600">Provider</span>
                            <span className="font-medium">TXTLINK</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-600">Base URL</span>
                            <span className="font-medium break-all">https://txtlink.co.ke/api/v1</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-600">Status</span>
                            <span className="font-medium">
                              {config?.hasApiKey ? 'Configured' : 'Not configured'}
                              {config?.source && config.source !== 'none' ? ` (${config.source})` : ''}
                            </span>
                          </div>
                        </div>

                        <Button onClick={saveSettings} disabled={saving} className="flex items-center gap-2">
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save configuration
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      Superadmin daily report
                    </CardTitle>
                    <CardDescription>
                      Midnight: profit (Cron). Login from 8 AM: stock. From 1 PM: unpaid balances. From 8 PM: payments awaiting confirmation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">Send daily report SMS</p>
                        <p className="text-sm text-gray-500">Turn this off to pause the midnight summary</p>
                      </div>
                      <Switch checked={dailyReportEnabled} onCheckedChange={setDailyReportEnabled} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dailyReportPhone">Superadmin number</Label>
                      <Input
                        id="dailyReportPhone"
                        value={dailyReportPhone}
                        onChange={(e) => setDailyReportPhone(e.target.value)}
                        placeholder="0712345678 or +254712345678"
                      />
                      <p className="text-xs text-gray-500">
                        12:00 AM cron: daily profit. First login from 8:00 AM: stock. From 1:00 PM: partial payments. From 8:00 PM: M-Pesa payments still awaiting confirmation.
                      </p>
                    </div>

                    {config?.lastDailyReportDate && (
                      <p className="text-sm text-gray-600">
                        Last automatic report: {config.lastDailyReportDate}
                        {config.lastDailyReportAt
                          ? ` (${new Date(config.lastDailyReportAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })})`
                          : ''}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={saveSettings} disabled={saving} className="flex items-center gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save number
                      </Button>
                      <Button
                        variant="outline"
                        onClick={sendDailyReportNow}
                        disabled={sendingDailyReport || !dailyReportPhone.trim()}
                        className="flex items-center gap-2"
                      >
                        {sendingDailyReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send today’s report now
                      </Button>
                      <Button
                        variant="outline"
                        onClick={sendDeficitAlertNow}
                        disabled={sendingDeficitAlert || !dailyReportPhone.trim()}
                        className="flex items-center gap-2"
                      >
                        {sendingDeficitAlert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send partial payments now
                      </Button>
                      <Button
                        variant="outline"
                        onClick={sendPendingAlertNow}
                        disabled={sendingPendingAlert || !dailyReportPhone.trim()}
                        className="flex items-center gap-2"
                      >
                        {sendingPendingAlert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send pending confirmations now
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick test</CardTitle>
                    <CardDescription>
                      Send a short test message after saving your API key
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="testPhone">Phone number</Label>
                      <Input
                        id="testPhone"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="+254712345678 or 0712345678"
                      />
                    </div>
                    <Button onClick={sendTestSms} disabled={testing} variant="outline" className="flex items-center gap-2">
                      {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send test SMS
                    </Button>
                    {testResult && (
                      <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                        {testResult.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                          {testResult.success ? (
                            <div>
                              <p className="font-medium">Test SMS sent</p>
                              {testResult.smsResponse?.messageId && (
                                <p className="text-sm mt-1">Message ID: {testResult.smsResponse.messageId}</p>
                              )}
                              {typeof testResult.smsResponse?.newBalance === 'number' && (
                                <p className="text-sm">New balance: {testResult.smsResponse.newBalance} credits</p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium">Failed to send test SMS</p>
                              <p className="text-sm mt-1">{testResult.error}</p>
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'test' && (
              <SMSTest />
            )}

            {activeTab === 'templates' && (
              <SmsTemplateEditor token={token} />
            )}
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
