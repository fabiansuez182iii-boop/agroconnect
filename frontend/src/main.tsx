/**
 * Application entry point for AgroConnect.
 *
 * PhD-level features:
 * - StrictMode for development error detection
 * - Service Worker registration for offline support
 * - Error logging for SW registration failures
 *
 * @see https://react.dev/reference/react/StrictMode
 * @see https://vitejs.dev/guide/build.html#load-error-handling
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Exponer Leaflet globalmente para compatibilidad con plugins
(window as any).L = L;

/**
 * Register the Service Worker for offline support.
 *
 * Only registers in production to avoid caching issues during development.
 * Uses a non-blocking registration to avoid impacting initial page load.
 */
function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service Workers not supported in this browser');
    return;
  }

  // Only register in production
  if (import.meta.env.DEV) {
    console.log('[SW] Skipping registration in development mode');
    return;
  }

  // Wait for page load to avoid impacting initial render
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Registered successfully:', registration.scope);

        // Check for updates periodically (every hour)
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        );

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available; notify user
                console.log('[SW] New content available; please refresh the page.');
                // TODO: Show UI notification to user
                // e.g., toast notification with "Update available" button
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[SW] Registration failed:', error);
      });
  });
}

/**
 * Render the root React component.
 * Uses StrictMode in development for additional error checking.
 */
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Check your index.html.');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker after initial render
registerServiceWorker();
