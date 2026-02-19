import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: {
    open: true,
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
})
