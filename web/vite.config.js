import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'OrbitBlack360',
        short_name: 'OrbitBlack',
        description: 'Plataforma central de gestión',
        theme_color: '#0b1020',
        background_color: '#0b1020',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      // La API nunca se cachea ni se sirve offline: solo el shell de la app.
      workbox: { navigateFallbackDenylist: [/^\/api\//] },
    }),
  ],
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
