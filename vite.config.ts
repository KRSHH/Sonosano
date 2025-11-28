import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const host = process.env.TAURI_DEV_HOST

export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    // This maps your old imports to the new src structure
    alias: {
      '@': path.resolve(__dirname, './src'),
      components: path.resolve(__dirname, 'src/components'),
      pages: path.resolve(__dirname, 'src/pages'),
      hooks: path.resolve(__dirname, 'src/hooks'),
      providers: path.resolve(__dirname, 'src/providers'),
      utils: path.resolve(__dirname, 'src/utils'),
      lib: path.resolve(__dirname, 'src/lib'),
      managers: path.resolve(__dirname, 'src/managers'),
      global: path.resolve(__dirname, 'src/global'),
      i18n: path.resolve(__dirname, 'src/i18n'),
      types: path.resolve(__dirname, 'src/types'),
    },
  },
  // Prevent Vite from clearing the console
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
}))
