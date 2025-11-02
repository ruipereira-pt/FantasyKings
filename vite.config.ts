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
  // Expose non-prefixed variables for Bolt.host compatibility
  // This allows SUPABASE_URL/SUPABASE_ANON_KEY to work alongside VITE_ prefixed vars
  define: {
    // Support legacy SUPABASE_URL/SUPABASE_ANON_KEY variables from build environment
    // Note: These are replaced at build time with actual values from process.env
    'import.meta.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || ''),
    'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || ''),
  },
});
