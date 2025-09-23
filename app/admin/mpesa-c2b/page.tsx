'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, RefreshCw, Settings, Phone, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface C2BSettings {
  configured: boolean;
  settings: {
    validationURL?: string;
    confirmationURL?: string;
    responseType?: string;
    enableValidation?: boolean;
    environment?: string;
  };
}

export default function MpesaC2BPage() {
  const [c2bSettings, setC2bSettings] = useState<C2BSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  const loadC2BSettings = async () => {
    try {
      const response = await fetch('/api/payments/c2b/register');
      if (response.ok) {
        const data = await response.json();
        setC2bSettings(data);
      } else {
        toast.error('Failed to load C2B settings');
      }
    } catch (error) {
      console.error('Error loading C2B settings:', error);
      toast.error('Error loading C2B settings');
    } finally {
      setIsLoading(false);
    }
  };

  const registerC2BURLs = async () => {
    setIsRegistering(true);
    try {
      const response = await fetch('/api/payments/c2b/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('C2B URLs registered successfully with M-Pesa!');
        await loadC2BSettings();
      } else {
        toast.error(data.error || 'Failed to register C2B URLs');
      }
    } catch (error) {
      console.error('Error registering C2B URLs:', error);
      toast.error('Error registering C2B URLs');
    } finally {
      setIsRegistering(false);
    }
  };

  const testEndpoint = async (endpoint: string, type: 'validation' | 'confirmation') => {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} endpoint is working`);
      } else {
        toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} endpoint returned error: ${response.status}`);
      }
    } catch (error) {
      toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} endpoint is not accessible`);
    }
  };

  useEffect(() => {
    loadC2BSettings();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">M-Pesa C2B Register URL</h1>
          <p className="text-muted-foreground mt-1">
            Manage Customer-to-Business payment settings and URL registration
          </p>
        </div>
        <Button
          onClick={() => loadC2BSettings()}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {c2bSettings?.configured ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>C2B URLs Configured</AlertTitle>
              <AlertDescription>
                Your C2B validation and confirmation URLs are properly configured.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>C2B URLs Not Configured</AlertTitle>
              <AlertDescription>
                Please add the required environment variables to enable C2B functionality.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Environment Settings */}
      {c2bSettings?.settings && (
        <Card>
          <CardHeader>
            <CardTitle>Current Settings</CardTitle>
            <CardDescription>
              Environment variables and configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Environment</label>
                <Badge variant={c2bSettings.settings.environment === 'production' ? 'default' : 'secondary'}>
                  {c2bSettings.settings.environment || 'Not set'}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Response Type</label>
                <Badge variant="outline">
                  {c2bSettings.settings.responseType || 'Not set'}
                </Badge>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">External Validation</label>
                <Badge variant={c2bSettings.settings.enableValidation ? 'default' : 'secondary'}>
                  {c2bSettings.settings.enableValidation ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Validation URL</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-muted rounded text-sm">
                    {c2bSettings.settings.validationURL || 'Not configured'}
                  </code>
                  {c2bSettings.settings.validationURL && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testEndpoint(c2bSettings.settings.validationURL!, 'validation')}
                    >
                      Test
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Confirmation URL</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-muted rounded text-sm">
                    {c2bSettings.settings.confirmationURL || 'Not configured'}
                  </code>
                  {c2bSettings.settings.confirmationURL && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testEndpoint(c2bSettings.settings.confirmationURL!, 'confirmation')}
                    >
                      Test
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registration Action */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Register URLs with M-Pesa
          </CardTitle>
          <CardDescription>
            Register your validation and confirmation URLs with Safaricom M-Pesa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              In production, you can only register URLs once per shortcode. In sandbox, you can register multiple times for testing.
            </AlertDescription>
          </Alert>

          <Button
            onClick={registerC2BURLs}
            disabled={isRegistering || !c2bSettings?.configured}
            className="w-full md:w-auto"
          >
            {isRegistering ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Registering URLs...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Register C2B URLs
              </>
            )}
          </Button>

          {!c2bSettings?.configured && (
            <p className="text-sm text-muted-foreground">
              Please configure your environment variables first before registering URLs.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Customer Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Customer Payment Instructions
          </CardTitle>
          <CardDescription>
            Share these instructions with your customers for C2B payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">How to Pay via M-Pesa:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Dial <code className="bg-background px-1 rounded">*334#</code> on your phone</li>
              <li>Select "Pay Bill"</li>
              <li>Enter Business Number: <code className="bg-background px-1 rounded">[YOUR_SHORTCODE]</code></li>
              <li>Enter Amount to pay</li>
              <li>Enter Account Number (your order number)</li>
              <li>Enter M-Pesa PIN and confirm</li>
              <li>Receive SMS confirmation immediately</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              Alternative: Use M-Pesa app → Pay Bill → Follow same steps
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Links and Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Resources & Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/C2B_SETUP_GUIDE.md" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Complete Setup Guide
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="https://developer.safaricom.co.ke/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Safaricom Daraja Portal
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="https://org.ke.m-pesa.com/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              M-Pesa Organization Portal
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 