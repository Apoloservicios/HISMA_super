import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Code splitting para mejorar la carga
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar librerías grandes en chunks específicos
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'], 
          icons: ['@heroicons/react'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          pdf: ['jspdf', 'html2canvas']
        }
      }
    },
    // Aumentar límite de advertencia de chunk size
    chunkSizeWarningLimit: 1000,
    // Optimizar assets
    assetsInlineLimit: 4096,
    // Minificar CSS y JS
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Eliminar console.log en producción
        drop_debugger: true
      }
    }
  },
  // Optimización de dependencias
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'recharts']
  }
});