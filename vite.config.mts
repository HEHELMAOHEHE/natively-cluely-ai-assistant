import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
