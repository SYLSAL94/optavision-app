import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api-scouting': {
        target: 'https://api-scouting.theanalyst.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-scouting/, '')
      },
      '/api-optavision': {
        target: 'https://api-optavision.theanalyst.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-optavision/, '')
      }
    }
  }
})
