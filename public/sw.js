const CACHE_NAME = 'econuru-v1'

// Simple service worker that doesn't interfere with existing design
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  event.waitUntil(self.clients.claim())
})

// Basic fetch handler - doesn't change any existing behavior
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return
  
  // Let all requests go through normally
  event.respondWith(
    fetch(event.request).catch(() => {
      // Only for navigation requests, show a simple offline message
      if (event.request.mode === 'navigate') {
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Offline - OMOTECH HUB</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #6366f1; }
            </style>
          </head>
          <body>
            <h1>OMOTECH HUB</h1>
            <p>You're currently offline</p>
            <p>Please check your internet connection</p>
            <button onclick="location.reload()">Try Again</button>
          </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' }
        })
      }
    })
  )
}) 