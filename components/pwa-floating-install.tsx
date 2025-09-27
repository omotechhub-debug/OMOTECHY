"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X } from 'lucide-react'

export function PWAFloatingInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showButton, setShowButton] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      const isInStandaloneMode = (window.navigator as any).standalone === true
      return isStandaloneMode || isInStandaloneMode
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowButton(true)
      console.log('PWA: Floating install button - beforeinstallprompt received')
    }

    const handleAppInstalled = () => {
      setShowButton(false)
      setDeferredPrompt(null)
      setIsInstalled(true)
      console.log('PWA: App installed via floating button')
    }

    // Check if already installed
    if (checkStandalone()) {
      setIsInstalled(true)
      return
    }

    // Check if recently dismissed
    const dismissedTime = localStorage.getItem('pwa-install-dismissed')
    const recentlyDismissed = dismissedTime && (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60) < 24

    if (!recentlyDismissed) {
      // Show button after a delay
      setTimeout(() => {
        setShowButton(true)
      }, 5000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      if (choiceResult.outcome === 'accepted') {
        setShowButton(false)
      }
      setDeferredPrompt(null)
    }
  }

  const dismissButton = () => {
    setShowButton(false)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  if (isInstalled || !showButton) {
    return null
  }

  return (
    <div className="fixed top-20 right-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Install App</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissButton}
            className="h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-gray-600 mb-3">
          Get quick access to OMOTECH HUB with our app
        </p>
        <Button
          onClick={handleInstallClick}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm py-2"
        >
          <Download className="w-4 h-4 mr-2" />
          Install Now
        </Button>
      </div>
    </div>
  )
}
