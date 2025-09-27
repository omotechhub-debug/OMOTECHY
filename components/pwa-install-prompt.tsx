"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Download, Smartphone, Monitor, Tablet } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      const isInStandaloneMode = (window.navigator as any).standalone === true
      return isStandaloneMode || isInStandaloneMode
    }

    // Detect platform
    const detectPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
      const isAndroidDevice = /android/.test(userAgent)
      const isDesktopDevice = !isIOSDevice && !isAndroidDevice

      setIsIOS(isIOSDevice)
      setIsAndroid(isAndroidDevice)
      setIsDesktop(isDesktopDevice)
      setIsStandalone(checkStandalone())
    }

    detectPlatform()

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show install prompt after a delay if not already installed
      if (!checkStandalone()) {
        setTimeout(() => {
          setShowInstallPrompt(true)
        }, 3000) // Show after 3 seconds
      }
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      console.log('PWA was installed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check if we should show iOS instructions
    if (isIOS && !checkStandalone()) {
      setTimeout(() => {
        setShowInstallPrompt(true)
      }, 5000) // Show iOS instructions after 5 seconds
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isIOS, isAndroid, isDesktop])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    }
  }

  const dismissPrompt = () => {
    setShowInstallPrompt(false)
    // Store dismissal in localStorage to avoid showing again for 24 hours
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // Don't show if already installed or recently dismissed
  if (isStandalone || !showInstallPrompt) {
    return null
  }

  // Check if user recently dismissed
  const dismissedTime = localStorage.getItem('pwa-install-dismissed')
  if (dismissedTime) {
    const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60)
    if (hoursSinceDismissed < 24) {
      return null
    }
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5" />
              Install App
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissPrompt}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-blue-100">
            Get quick access to OMOTECH HUB
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {deferredPrompt ? (
            // Standard install prompt for supported browsers
            <div className="space-y-3">
              <p className="text-sm text-blue-100">
                Install our app for a better experience with offline access and faster loading.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleInstallClick}
                  className="bg-white text-blue-600 hover:bg-blue-50 flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install Now
                </Button>
                <Button
                  variant="outline"
                  onClick={dismissPrompt}
                  className="border-white/30 text-white hover:bg-white/20"
                >
                  Later
                </Button>
              </div>
            </div>
          ) : isIOS ? (
            // iOS-specific instructions
            <div className="space-y-3">
              <p className="text-sm text-blue-100">
                To install this app on your iPhone/iPad:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Tap the Share button</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Scroll down and tap "Add to Home Screen"</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Tap "Add" to confirm</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={dismissPrompt}
                  className="bg-white text-blue-600 hover:bg-blue-50 flex-1"
                >
                  Got it!
                </Button>
              </div>
            </div>
          ) : isAndroid ? (
            // Android-specific instructions
            <div className="space-y-3">
              <p className="text-sm text-blue-100">
                To install this app on your Android device:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Tap the menu (⋮) in your browser</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Select "Add to Home screen"</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Tap "Add" to confirm</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={dismissPrompt}
                  className="bg-white text-blue-600 hover:bg-blue-50 flex-1"
                >
                  Got it!
                </Button>
              </div>
            </div>
          ) : (
            // Desktop instructions
            <div className="space-y-3">
              <p className="text-sm text-blue-100">
                To install this app on your computer:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Look for the install icon in your browser's address bar</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Click "Install" when prompted</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Follow the installation prompts</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={dismissPrompt}
                  className="bg-white text-blue-600 hover:bg-blue-50 flex-1"
                >
                  Got it!
                </Button>
              </div>
            </div>
          )}
          
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center justify-center gap-4 text-xs text-blue-200">
              <div className="flex items-center gap-1">
                <Smartphone className="h-3 w-3" />
                <span>Mobile</span>
              </div>
              <div className="flex items-center gap-1">
                <Tablet className="h-3 w-3" />
                <span>Tablet</span>
              </div>
              <div className="flex items-center gap-1">
                <Monitor className="h-3 w-3" />
                <span>Desktop</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
