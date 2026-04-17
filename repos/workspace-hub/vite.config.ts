import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiPort = Number(process.env.WORKSPACE_HUB_API_PORT ?? '4101')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4100,
    strictPort: true,
    proxy: {
      '/api': `http://127.0.0.1:${apiPort}`,
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4100,
    strictPort: true,
  },
})
