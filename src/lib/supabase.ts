import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Get environment variables (Vite automatically exposes VITE_ prefixed variables)
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only log errors in production, not debug info

// Check which variables are missing
const missingVars: string[] = [];
if (!supabaseUrl) {
  missingVars.push('VITE_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  missingVars.push('VITE_SUPABASE_ANON_KEY');
}

if (missingVars.length > 0) {
  // Create a clear error message specifying which variables are missing
  const missingList = missingVars.map(v => `"${v}"`).join(' and ');
  const missingMessage = `Missing Supabase environment variable${missingVars.length > 1 ? 's' : ''}: ${missingList}.`;
  
  // Only log error in production (no detailed debug info)
  if (import.meta.env.PROD) {
    console.error('[Supabase Configuration Error]', missingMessage);
  } else {
    // In development, provide more detailed error info
    console.error('[Supabase Configuration Error]', missingMessage);
    console.error('Missing variables:', missingVars);
    console.error('VITE_SUPABASE_URL exists:', 'VITE_SUPABASE_URL' in import.meta.env);
    console.error('VITE_SUPABASE_ANON_KEY exists:', 'VITE_SUPABASE_ANON_KEY' in import.meta.env);
  }
  
  throw new Error(missingMessage);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  // Configure real-time to handle WebSocket token properly
  // The __WS_TOKEN__ is defined in vite.config.ts to prevent build errors
  realtime: {
    timeout: 20000,
  },
  // Ensure auth persists correctly
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
