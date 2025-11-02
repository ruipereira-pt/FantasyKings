import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 4000,
  },
  define: {
    // Fix for Supabase real-time WebSocket token
    // This prevents '__WS_TOKEN__ is not defined' errors
    '__WS_TOKEN__': JSON.stringify(null),
  },
});
