"use client"

import { useEffect, useState } from 'react'
import { PWAInstallPrompt } from './pwa-install-prompt'
import { PWAFloatingInstall } from './pwa-floating-install'

// Enhanced PWA setup with install prompt
export function PWASetup() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Register service worker with cache-busting
    if ('serviceWorker' in navigator) {
      // Register service worker (browser will check for updates automatically)
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          console.log('PWA: Service Worker registered successfully')
          
          // Force update check on every page load
          registration.update()
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, automatically reload
                  console.log('PWA: New version available, reloading...')
                  window.location.reload()
                } else if (newWorker.state === 'activated') {
                  // New worker activated, reload to use it
                  console.log('PWA: New service worker activated, reloading...')
                  window.location.reload()
                }
              })
            }
          })
          
          // Periodically check for updates (every 60 seconds)
          setInterval(() => {
            registration.update()
          }, 60000)
        })
        .catch((error) => {
          console.error('PWA: Service Worker registration failed', error)
        })
      
      // Unregister old service workers if they exist
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          if (registration.active?.scriptURL && !registration.active.scriptURL.includes('sw.js')) {
            registration.unregister()
          }
        })
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
      <PWAFloatingInstall />
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