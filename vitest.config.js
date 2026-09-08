import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  /* Runtime automático de JSX también en los tests: sin esto,
     esbuild los transforma al estilo antiguo y pide un React
     importado a mano en cada fichero. */
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.{js,jsx}'],
    setupFiles: ['test/setup.js'],
  },
})
