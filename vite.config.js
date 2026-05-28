import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true,   // expose on the local network — `npm run dev` prints a Network: URL
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
