import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            minify: false,
            rollupOptions: {
              external: [
                'electron',
                'electron-log',
                'better-sqlite3',
                'keytar',
                'natively-audio-win32-x64-msvc',
                'bufferutil',
                'utf-8-validate',
                'ws',
                'sharp',
                '@img/sharp-win32-x64'
              ]
            }
          },
          resolve: {
            alias: {
              '@utils/logger': path.resolve(__dirname, 'electron/utils/logger.ts')
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            minify: false,
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    renderer()
  ],
  base: './', // Относительные пути для Electron
  define: {
    __dirname: 'undefined',
    __filename: 'undefined'
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@utils/logger": path.resolve(__dirname, "src/lib/logger.ts"),
      "path": "path-browserify"
    }
  },
  server: {
    port: 5180,
    strictPort: true
  },
  optimizeDeps: {
    include: ['path-browserify'],
    exclude: ['electron', 'chunk-A55SIDN3']
  },
  build: {
    rollupOptions: {
      external: [
        'electron',
        /^node_modules\/electron/
      ],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'framer-motion'],
          ui: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-toast']
        }
      }
    }
  }
});
