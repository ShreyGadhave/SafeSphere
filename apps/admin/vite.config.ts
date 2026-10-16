import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // MapLibre v6 starts its module worker from a path next to its own file; pre-bundling moves the
  // main file into .vite/deps and the two halves stop matching. Serve it untouched.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  build: {
    // MapLibre GL alone is ~1 MB minified and is already split into its own lazy chunk.
    chunkSizeWarningLimit: 1100,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
