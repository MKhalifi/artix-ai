import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // PROXY RULE: Intercepts any request starting with '/rodin-proxy'
      '/rodin-proxy': {
        target: 'https://hyperhuman.deemos.com', // The real server
        changeOrigin: true,
        // Removes '/rodin-proxy' so the target gets just '/api/v2/...'
        rewrite: (path) => path.replace(/^\/rodin-proxy/, ''),
        secure: true,
        headers: {
          'Origin': 'https://hyperhuman.deemos.com', // Pretend we are them
          'Referer': 'https://hyperhuman.deemos.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    }
  }
})
