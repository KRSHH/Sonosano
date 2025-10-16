import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

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

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'app/lib/main/main.ts'),
        },
      },
    },
    resolve: {
      alias: aliases,
    },
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          preload: resolve(__dirname, 'app/lib/preload/preload.ts'),
        },
      },
    },
    resolve: {
      alias: aliases,
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: './app',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'app/index.html'),
        },
      },
    },
    resolve: {
      alias: aliases,
    },
    plugins: [tailwindcss(), react()],
  },
})
