import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Default 'node' for pure logic; component tests opt into jsdom via a
    // `// @vitest-environment jsdom` file directive.
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
