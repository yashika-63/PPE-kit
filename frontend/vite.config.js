import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3005,
    proxy: {
      '/api': {
       target: 'http://localhost:5000',
        // target: 'http://52.66.137.154:5000',

        changeOrigin: true
      }
    }
  }
})
