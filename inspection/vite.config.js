import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor_maps';
          if (id.includes('jspdf')) return 'vendor_pdf';
          // supabase removed — project uses Django REST backend
          if (id.includes('lucide-react')) return 'vendor_ui';
          return undefined;
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
})
