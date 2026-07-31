import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv, type Plugin } from 'vite'

function pwaHtml(registerServiceWorker: boolean): Plugin {
  return {
    name: 'pqs-pwa-html',
    transformIndexHtml() {
      return [
        {
          tag: 'link',
          attrs: { rel: 'manifest', href: '/manifest.webmanifest' },
          injectTo: 'head',
        },
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: '#0f766e' },
          injectTo: 'head',
        },
        {
          tag: 'link',
          attrs: {
            rel: 'apple-touch-icon',
            href: '/icons/pqs-192.png',
          },
          injectTo: 'head',
        },
        {
          tag: 'script',
          attrs: {
            src: registerServiceWorker
              ? '/register-sw.js'
              : '/unregister-sw.js',
            defer: true,
          },
          injectTo: 'body',
        },
      ]
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [vue(), tailwindcss(), pwaHtml(command === 'build')],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': env.VITE_API_URL || 'http://localhost:3000',
      },
    },
    preview: {
      port: 5173,
      proxy: {
        '/api': env.VITE_API_URL || 'http://localhost:3000',
      },
    },
  }
})
