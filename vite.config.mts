import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Относительные пути для Electron
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@electron": path.resolve(__dirname, "electron"),
      "@llm": path.resolve(__dirname, "electron/llm"),
      "@services": path.resolve(__dirname, "electron/services"),
      "@utils": path.resolve(__dirname, "electron/utils"),
      "@rag": path.resolve(__dirname, "electron/rag"),
      "@audio": path.resolve(__dirname, "electron/audio"),
      "@db": path.resolve(__dirname, "electron/db"),
      "@update": path.resolve(__dirname, "electron/update"),
      "@config": path.resolve(__dirname, "electron/config"),
    },
  },
  server: {
    port: 5180,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'framer-motion'],
          ui: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-toast'],
        },
      },
    },
  },
});