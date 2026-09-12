import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'freehand-ligament-anthology.ngrok-free.dev'
    ]
  }
})
