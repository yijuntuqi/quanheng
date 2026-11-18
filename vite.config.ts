import devServer from "@hono/vite-dev-server"
import path from 'path'
const __dirname = import.meta.dirname
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { inspectAttr } from 'kimi-plugin-inspect-react'

export default defineConfig({
  plugins: [
    {
      name: "kimi-preview-host",
      config(config) {
        const hosts = config.server?.allowedHosts;
        if (hosts === true || hosts?.includes("3000.proxy.internal")) return;
        return { server: { allowedHosts: ["3000.proxy.internal"] } };
      },
    },
    devServer({ entry: "api/boot.ts", exclude: [/^\/(?!api\/).*$/] }),
    inspectAttr(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: '权衡 — 把决定的理由留下来',
        short_name: '权衡',
        description: '一个透明、可质疑的本地决策工具。',
        theme_color: '#f2ecdc',
        background_color: '#f2ecdc',
        display: 'standalone',
        lang: 'zh-CN',
        start_url: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['assets/**/*', 'icons/**/*'],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin }) => sameOrigin
              && ['script', 'style', 'font', 'image'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'decision-assets',
              expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'decision-pages', networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
  server: { port: 3000 },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
})
