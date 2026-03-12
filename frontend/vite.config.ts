import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/restaurants': 'http://localhost:8080',
      '/pick': 'http://localhost:8080',
      '/resolve-location': 'http://localhost:8080',
    }
  }
})
