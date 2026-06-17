/**
 * Vite configuration with optimized code splitting.
 *
 * PhD-level optimizations:
 * - Manual chunks via function for heavy libraries (Leaflet, Cloudinary, React)
 * - Vendor chunk separation for better long-term caching
 * - Dynamic imports for route-based code splitting
 * - Chunk size warning limit adjusted to 600 kB
 *
 * @see https://vitejs.dev/config/
 * @see https://rollupjs.org/configuration-options/
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Increase warning limit to 600 kB (map applications are inherently larger)
    chunkSizeWarningLimit: 600,

    // Disable source maps for production to reduce bundle size
    sourcemap: false,

    // Target modern browsers for smaller output
    target: 'es2020',

    rollupOptions: {
      output: {
        /**
         * Manual chunk configuration using a function.
         *
         * This approach is required by Vite 8 / Rolldown TypeScript definitions
         * and provides dynamic, path-based chunking which is more robust than
         * static package name mapping.
         *
         * @param id - The absolute path of the module being bundled
         * @returns The name of the chunk or undefined for default chunking
         */
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            // React ecosystem (~140KB)
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'vendor-react';
            }

            // Mapping libraries (~220KB)
            if (
              id.includes('/leaflet/') ||
              id.includes('/react-leaflet/') ||
              id.includes('/leaflet-draw/') ||
              id.includes('/leaflet.heat/') ||
              id.includes('/leaflet-geosearch/') ||
              id.includes('/react-leaflet-markercluster/')
            ) {
              return 'vendor-leaflet';
            }

            // Image processing (~50KB)
            if (id.includes('/@cloudinary/')) {
              return 'vendor-cloudinary';
            }
          }
          // Returning undefined lets Vite/Rolldown handle the rest automatically
          return undefined;
        },

        // Organize output files in subdirectories
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') ?? [];
          const ext = info[info.length - 1];

          if (/\.(png|jpe?g|gif|svg|webp|avif|ico)$/i.test(assetInfo.name ?? '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/\.css$/i.test(assetInfo.name ?? '')) {
            return `assets/css/[name]-[hash][extname]`;
          }
          if (/\.(woff2?|ttf|otf|eot)$/i.test(assetInfo.name ?? '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/${ext ?? 'other'}/[name]-[hash][extname]`;
        },
      },
    },
  },

  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'leaflet'],
  },
});
