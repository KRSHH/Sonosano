import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Shared alias configuration
const aliases = {
  '@/app': resolve(__dirname, 'app'),
  '@/lib': resolve(__dirname, 'app/lib'),
  '@/resources': resolve(__dirname, 'resources'),
  components: resolve(__dirname, 'app/components'),
  pages: resolve(__dirname, 'app/pages'),
  hooks: resolve(__dirname, 'app/hooks'),
  providers: resolve(__dirname, 'app/providers'),
  utils: resolve(__dirname, 'app/utils'),
  i18n: resolve(__dirname, 'app/i18n'),
  types: resolve(__dirname, 'app/types'),
}

// https://tauri.app/develop/calling-rust/
export default defineConfig({
  plugins: [tailwindcss(), react()],

  // Vite options tailored for Tauri development
  clearScreen: false,

  // Tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },

  resolve: {
    alias: aliases,
  },

  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari14',
    // Don't minify for debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
