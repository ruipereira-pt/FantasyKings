import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Support both VITE_ prefix (standard) and non-prefixed (legacy/Bolt.host)
// Helper function to get environment variables with fallback
function getEnvVar(viteName: string, legacyName: string): string {
  // @ts-expect-error - Support for non-VITE_ prefixed vars via vite.config.ts define
  return import.meta.env[viteName] || import.meta.env[legacyName] || '';
}

export const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'SUPABASE_URL');
export const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_ANON_KEY)');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
