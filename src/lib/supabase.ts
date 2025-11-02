import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Get environment variables (Vite automatically exposes VITE_ prefixed variables)
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  const availableVars = Object.keys(import.meta.env)
    .filter(key => key.includes('SUPABASE'))
    .join(', ');
  
  const errorMessage = `Missing Supabase environment variables.
  
Required variables:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY

Available Supabase-related variables: ${availableVars || 'none'}

Please ensure these variables are set in your deployment platform (Bolt.host) 
and trigger a new build. Environment variables must be available during 
the build process for Vite to embed them in the client bundle.`;

  console.error('[Supabase Error]', errorMessage);
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
