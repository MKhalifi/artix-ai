import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/rodin-proxy': {
        target: 'https://hyperhuman.deemos.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rodin-proxy/, ''),
        secure: true,
        headers: {
          'Origin': 'https://hyperhuman.deemos.com',
          'Referer': 'https://hyperhuman.deemos.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    }
  }
})
