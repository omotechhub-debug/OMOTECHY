"use client"

import { useEffect, useState } from 'react'
import { PWAInstallPrompt } from './pwa-install-prompt'

// Enhanced PWA setup with install prompt
export function PWASetup() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('PWA: Service Worker registered successfully')
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, prompt user to refresh
                  if (confirm('New version available! Refresh to update?')) {
                    window.location.reload()
                  }
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('PWA: Service Worker registration failed', error)
        })
    }

    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true)
      console.log('PWA: Back online')
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log('PWA: Gone offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial online status
    setIsOnline(navigator.onLine)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <>
      <PWAInstallPrompt />
      {/* Online/Offline indicator */}
      {!isOnline && (
        <div className="fixed top-4 left-4 right-4 z-40 md:left-auto md:right-4 md:max-w-sm">
          <div className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg text-center">
            <span className="text-sm">📡 You're offline - Some features may be limited</span>
          </div>
        </div>
      )}
    </>
  )
} 