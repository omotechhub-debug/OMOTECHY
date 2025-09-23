"use client"

import { useEffect } from 'react'

// Minimal PWA setup - registers service worker without any UI changes
export function PWASetup() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('PWA: Service Worker registered')
        })
        .catch((error) => {
          console.log('PWA: Service Worker registration failed')
        })
    }
  }, [])

  // No UI - this component is invisible
  return null
} 