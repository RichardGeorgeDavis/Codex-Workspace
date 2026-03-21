import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4100,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:4101',
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4100,
    strictPort: true,
  },
})
