import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Support both VITE_ prefix (standard) and non-prefixed (legacy/Bolt.host)
// Helper function to get environment variables with fallback
function getEnvVar(viteName: string, legacyName: string): string {
  // Access both naming conventions - vite.config.ts define ensures non-prefixed vars are available
  const value = import.meta.env[viteName] || import.meta.env[legacyName] || '';
  
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log(`[Supabase Config] ${viteName}: ${value ? 'SET' : 'NOT SET'}`);
    console.log(`[Supabase Config] ${legacyName}: ${import.meta.env[legacyName] ? 'SET' : 'NOT SET'}`);
  }
  
  return value;
}

export const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'SUPABASE_URL');
export const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  const availableVars = Object.keys(import.meta.env)
    .filter(key => key.includes('SUPABASE'))
    .join(', ');
  
  const errorMessage = `Missing Supabase environment variables.
  
Required variables:
  - VITE_SUPABASE_URL or SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY

Available Supabase-related variables: ${availableVars || 'none'}

Please ensure these variables are set in your deployment platform (Bolt.host) 
and trigger a new build. Environment variables must be available during 
the build process for Vite to embed them in the client bundle.`;

  console.error('[Supabase Error]', errorMessage);
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_ANON_KEY)');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
