import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    cors: true,
    strictPort: true,
    hmr: {
      host: 'localhost'
    },
    watch: {
      usePolling: true,
    },
    // Set specific ngrok host and also allow all hosts
    allowedHosts: [
      '105a1a84ee04.ngrok-free.app',
      '.ngrok-free.app',
      'localhost',
      'all'
    ],
  },
})
