import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Pure logic today → node. Switch to 'jsdom' when adding component tests.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/features/**/constants/**'],
      exclude: ['src/**/*.test.*', 'src/**/*.spec.*'],
    },
  },
})
