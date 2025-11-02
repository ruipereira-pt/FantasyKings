import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Debug: Log all VITE_ prefixed variables (in production for debugging)
const debugEnvVars = () => {
  const viteVars = Object.keys(import.meta.env)
    .filter(key => key.startsWith('VITE_'))
    .reduce((acc, key) => {
      const value = import.meta.env[key];
      // Show first/last chars and length for security, but help debug
      acc[key] = value
        ? `${value.substring(0, 10)}...${value.substring(value.length - 5)} (length: ${value.length})`
        : 'NOT SET';
      return acc;
    }, {} as Record<string, string>);
  
  return viteVars;
};

// Get environment variables (Vite automatically exposes VITE_ prefixed variables)
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Debug: Log variable status BEFORE checking (always visible, even if error is caught)
console.log('[🔍 Supabase Env Check] VITE_SUPABASE_URL:', supabaseUrl ? `SET (length: ${supabaseUrl.length})` : 'NOT SET');
console.log('[🔍 Supabase Env Check] VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `SET (length: ${supabaseAnonKey.length})` : 'NOT SET');

// Check which variables are missing
const missingVars: string[] = [];
if (!supabaseUrl) {
  missingVars.push('VITE_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  missingVars.push('VITE_SUPABASE_ANON_KEY');
}

if (missingVars.length > 0) {
  const allViteVars = debugEnvVars();
  const supabaseRelatedVars = Object.keys(import.meta.env)
    .filter(key => key.includes('SUPABASE'))
    .map(key => ({
      name: key,
      isSet: !!import.meta.env[key],
      length: import.meta.env[key]?.length || 0,
      startsWithHttps: import.meta.env[key]?.startsWith('https://') || false,
    }));
  
  const errorDetails = {
    missing: missingVars,
    found: {
      VITE_SUPABASE_URL: {
        exists: 'VITE_SUPABASE_URL' in import.meta.env,
        isSet: !!supabaseUrl,
        length: supabaseUrl.length,
        value: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'empty',
      },
      VITE_SUPABASE_ANON_KEY: {
        exists: 'VITE_SUPABASE_ANON_KEY' in import.meta.env,
        isSet: !!supabaseAnonKey,
        length: supabaseAnonKey.length,
        value: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'empty',
      },
    },
    allViteVars: allViteVars,
    supabaseRelatedVars: supabaseRelatedVars,
    importMetaEnvKeys: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')),
  };
  
  const errorMessage = `❌ Missing Supabase Environment Variables

🔍 Diagnostic Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Missing Variables: ${missingVars.join(', ')}

Variable Status:
  VITE_SUPABASE_URL:
    - Exists in env: ${errorDetails.found.VITE_SUPABASE_URL.exists}
    - Is set (non-empty): ${errorDetails.found.VITE_SUPABASE_URL.isSet}
    - Length: ${errorDetails.found.VITE_SUPABASE_URL.length}
    - Value preview: ${errorDetails.found.VITE_SUPABASE_URL.value}

  VITE_SUPABASE_ANON_KEY:
    - Exists in env: ${errorDetails.found.VITE_SUPABASE_ANON_KEY.exists}
    - Is set (non-empty): ${errorDetails.found.VITE_SUPABASE_ANON_KEY.isSet}
    - Length: ${errorDetails.found.VITE_SUPABASE_ANON_KEY.length}
    - Value preview: ${errorDetails.found.VITE_SUPABASE_ANON_KEY.value}

All VITE_ prefixed variables found:
${JSON.stringify(allViteVars, null, 2)}

Supabase-related variables in env:
${JSON.stringify(supabaseRelatedVars, null, 2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 How to Fix:

1. Go to Bolt.host Dashboard → Your Project → Environment Variables
2. Add these variables with EXACT names (case-sensitive):
   - VITE_SUPABASE_URL = https://your-project.supabase.co
   - VITE_SUPABASE_ANON_KEY = eyJhbGc... (your anon key)

3. ⚠️ IMPORTANT: 
   - Variables MUST be marked for "Build" or "Both" (not just "Runtime")
   - The VITE_ prefix is REQUIRED
   - Variable names are case-sensitive

4. After adding variables:
   - Trigger a new deployment (push to main or manual redeploy)
   - Variables are embedded at BUILD time, not runtime

5. Verify the build:
   - Check Bolt.host build logs
   - Look for environment variables being loaded during build
   - Ensure the build completes successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  // Log detailed error to console (helps with debugging)
  console.error('[🔴 Supabase Configuration Error]', errorMessage);
  console.error('[📊 Detailed Error Object]', errorDetails);
  
  // Create a clear error message specifying which variables are missing
  const missingList = missingVars.map(v => `"${v}"`).join(' and ');
  const missingMessage = `Missing Supabase environment variable${missingVars.length > 1 ? 's' : ''}: ${missingList}.`;
  
  // Also log a simpler version that might show in error tracking
  const simpleError = `${missingMessage} VITE_SUPABASE_URL: ${errorDetails.found.VITE_SUPABASE_URL.exists ? 'exists' : 'missing'}, ${errorDetails.found.VITE_SUPABASE_URL.isSet ? 'set' : 'empty'}. VITE_SUPABASE_ANON_KEY: ${errorDetails.found.VITE_SUPABASE_ANON_KEY.exists ? 'exists' : 'missing'}, ${errorDetails.found.VITE_SUPABASE_ANON_KEY.isSet ? 'set' : 'empty'}.`;
  
  console.error('[🚨 Throwing Error]', missingMessage);
  throw new Error(simpleError);
}

// Success - log in development mode
if (import.meta.env.DEV) {
  console.log('[✅ Supabase Config]', {
    url: `${supabaseUrl.substring(0, 30)}...`,
    key: `${supabaseAnonKey.substring(0, 30)}...`,
    urlLength: supabaseUrl.length,
    keyLength: supabaseAnonKey.length,
  });
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
