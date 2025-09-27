const CACHE_NAME = 'omotech-hub-v2'
const STATIC_CACHE = 'omotech-static-v2'
const DYNAMIC_CACHE = 'omotech-dynamic-v2'

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/icon-192x192.svg',
  '/icon-512x512.svg',
  '/icon-144by144.png',
  '/offline.html'
]

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files')
        return cache.addAll(STATIC_FILES)
      })
      .then(() => {
        console.log('Service Worker: Static files cached')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static files', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker: Activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return

  // Handle different types of requests
  if (request.destination === 'document') {
    // For navigation requests, try network first, then cache
    event.respondWith(handleNavigationRequest(request))
  } else if (request.destination === 'image' || request.destination === 'style' || request.destination === 'script') {
    // For static assets, try cache first, then network
    event.respondWith(handleStaticAssetRequest(request))
  } else if (url.pathname.startsWith('/api/')) {
    // For API requests, try network first, then cache
    event.respondWith(handleApiRequest(request))
  } else {
    // For other requests, try network first
    event.respondWith(handleOtherRequest(request))
  }
})

// Handle navigation requests (pages)
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('Service Worker: Network failed for navigation, trying cache')
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    // Return offline page
    return caches.match('/offline.html') || createOfflineResponse()
  }
}

// Handle static assets (images, CSS, JS)
async function handleStaticAssetRequest(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('Service Worker: Failed to fetch static asset', request.url)
    return new Response('Asset not available offline', { status: 404 })
  }
}

// Handle API requests
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('Service Worker: API request failed, trying cache')
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    return new Response(JSON.stringify({ error: 'Offline - API not available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Handle other requests
async function handleOtherRequest(request) {
  try {
    return await fetch(request)
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    return new Response('Resource not available offline', { status: 404 })
  }
}

// Create offline response
function createOfflineResponse() {
  return new Response(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - OMOTECH HUB</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center; 
          padding: 50px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
          margin: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          padding: 40px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          max-width: 400px;
          width: 100%;
        }
        h1 { 
          color: #fff;
          margin-bottom: 20px;
          font-size: 2.5rem;
        }
        p {
          margin-bottom: 15px;
          font-size: 1.1rem;
          opacity: 0.9;
        }
        button {
          background: #2E7D32;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 25px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 20px;
        }
        button:hover {
          background: #1B5E20;
          transform: translateY(-2px);
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📱</div>
        <h1>OMOTECH HUB</h1>
        <p>You're currently offline</p>
        <p>Please check your internet connection and try again</p>
        <button onclick="location.reload()">Try Again</button>
      </div>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  })
}

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag)
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  console.log('Service Worker: Performing background sync')
  // Add any background sync logic here
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received')
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: data.data || {}
    }
    event.waitUntil(
      self.registration.showNotification(data.title || 'OMOTECH HUB', options)
    )
  }
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked')
  event.notification.close()
  event.waitUntil(
    clients.openWindow('/')
  )
}) 