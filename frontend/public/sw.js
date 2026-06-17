/**
 * AgroConnect Service Worker
 *
 * PhD-level caching strategy:
 * - Cache-First for vendor chunks (rarely change)
 * - Network-First for app chunks (change frequently)
 * - Stale-While-Revalidate for images (Cloudinary)
 * - Network-Only for API calls (when backend is added)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
 * @see https://web.dev/cache-api-quick-guide/
 */

const CACHE_NAME = 'agroconnect-v1';
const STATIC_CACHE_NAME = 'agroconnect-static-v1';
const IMAGE_CACHE_NAME = 'agroconnect-images-v1';

/**
 * Vendor chunks that rarely change and should be cached long-term.
 * These are identified by their filename pattern.
 */
const VENDOR_CHUNK_PATTERNS = [
  /vendor-react.*\.js$/,
  /vendor-leaflet.*\.js$/,
  /vendor-leaflet.*\.css$/,
  /vendor-cloudinary.*\.js$/,
];

/**
 * Static assets to pre-cache during installation.
 */
const PRECACHE_URLS = ['/', '/index.html'];

/**
 * Maximum number of images to cache (prevents unbounded growth).
 */
const MAX_IMAGE_CACHE_SIZE = 50;

/**
 * Install event: pre-cache critical static assets.
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(PRECACHE_URLS);
    })
  );

  // Force the waiting service worker to become the active one
  self.skipWaiting();
});

/**
 * Activate event: clean up old caches.
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return (
              cacheName.startsWith('agroconnect-') &&
              cacheName !== CACHE_NAME &&
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== IMAGE_CACHE_NAME
            );
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );

  // Take control of all clients immediately
  self.clients.claim();
});

/**
 * Fetch event: apply appropriate caching strategy per request type.
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests except for Cloudinary and tile servers
  if (
    url.origin !== location.origin &&
    !url.hostname.includes('cloudinary.com') &&
    !url.hostname.includes('tile.openstreetmap.org') &&
    !url.hostname.includes('arcgisonline.com') &&
    !url.hostname.includes('opentopomap.org') &&
    !url.hostname.includes('cartocdn.com') &&
    !url.hostname.includes('unpkg.com')
  ) {
    return;
  }

  // Strategy 1: Cache-First for vendor chunks (JS/CSS)
  if (isVendorChunk(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME));
    return;
  }

  // Strategy 2: Cache-First for map tiles (they're versioned by z/x/y)
  if (isMapTile(url)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME));
    return;
  }

  // Strategy 3: Stale-While-Revalidate for Cloudinary images
  if (isCloudinaryImage(url)) {
    event.respondWith(staleWhileRevalidateStrategy(request, IMAGE_CACHE_NAME));
    return;
  }

  // Strategy 4: Network-First for app chunks and HTML
  event.respondWith(networkFirstStrategy(request, CACHE_NAME));
});

/**
 * Check if a URL path is a vendor chunk.
 */
function isVendorChunk(pathname) {
  return VENDOR_CHUNK_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Check if a URL is a map tile.
 */
function isMapTile(url) {
  return (
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('arcgisonline.com') ||
    url.hostname.includes('opentopomap.org') ||
    url.hostname.includes('cartocdn.com')
  );
}

/**
 * Check if a URL is a Cloudinary image.
 */
function isCloudinaryImage(url) {
  return (
    url.hostname.includes('cloudinary.com') && url.pathname.includes('/image/upload/')
  );
}

/**
 * Cache-First strategy: try cache, fallback to network.
 * Best for assets that rarely change (vendor chunks, tiles).
 */
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first fetch failed:', error);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network-First strategy: try network, fallback to cache.
 * Best for assets that change frequently (app chunks, HTML).
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Stale-While-Revalidate strategy: return cached version immediately,
 * update cache in the background.
 * Best for images where showing something quickly is more important
 * than always having the latest version.
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
        // Limit cache size
        trimCache(cacheName, MAX_IMAGE_CACHE_SIZE);
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

/**
 * Trim cache to a maximum number of entries.
 * Removes oldest entries first.
 */
async function trimCache(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxSize) {
    const keysToDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(keysToDelete.map((key) => cache.delete(key)));
    console.log(`[SW] Trimmed ${keysToDelete.length} entries from ${cacheName}`);
  }
}
