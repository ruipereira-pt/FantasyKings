import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [
      react({
        jsxRuntime: 'automatic',
        // Explicitly disable Fast Refresh in production to prevent RefreshRuntime errors
        // In production, import.meta.hot is undefined, so Fast Refresh shouldn't run
        ...(isProduction ? {
          babel: {
            plugins: [],
          },
        } : {}),
      }),
    ],
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
      // Ensure import.meta.hot is undefined in production
      // This prevents Fast Refresh code from running
      ...(isProduction && {
        'import.meta.hot': 'undefined',
      }),
    },
  };
});
