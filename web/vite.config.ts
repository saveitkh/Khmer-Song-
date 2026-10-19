import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Minimal declaration so the config typechecks without pulling in @types/node;
// `process.env` is available when Vite evaluates this file under Node.
declare const process: { env: Record<string, string | undefined> };

// The API runs on the server workspace (default :3000). In dev we proxy /api
// there so the browser talks to a single origin, same as production where one
// Node service serves both the built PWA and the API.
const API_TARGET = process.env.API_TARGET || "http://localhost:3000";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "fonts/*"],
      manifest: {
        name: "Khmer Sonic AI",
        short_name: "Khmer Sonic",
        description: "បង្កើតតន្ត្រី និងក្លូនសំឡេងខ្មែរ ជាមួយ AI",
        lang: "km",
        dir: "ltr",
        start_url: ".",
        display: "standalone",
        background_color: "#f8f9ff",
        theme_color: "#3db88f",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Never cache API responses; the app handles its own offline states.
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts", expiration: { maxEntries: 30 } },
          },
        ],
      },
    }),
  ],
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // wavesurfer is only needed on screens with audio; keep it separable.
          wavesurfer: ["wavesurfer.js"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
    },
  },
});
