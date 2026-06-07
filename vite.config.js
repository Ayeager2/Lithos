import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Try 5173 first. If it's taken, Vite scans upward to find a free
    // port (5174, 5175, …) and prints the real URL it bound to.
    // Flip strictPort to true to fail fast on conflicts instead.
    port: 5173,
    strictPort: false,
  },
})
