#!/usr/bin/env node
/**
 * Script to enable leaked password protection via Supabase Management API
 * 
 * This script uses the Supabase Management API to enable HaveIBeenPwned integration
 * for password protection.
 * 
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=your_token PROJECT_REF=your_ref node scripts/enable-leaked-password-protection.js
 * 
 * To get an access token:
 *   1. Go to https://supabase.com/dashboard/account/tokens
 *   2. Generate a new access token with appropriate permissions
 */

import https from 'https';

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.PROJECT_REF || 'daczuujxslepsrqedttv';

if (!ACCESS_TOKEN) {
  console.error('Error: SUPABASE_ACCESS_TOKEN environment variable is required');
  console.error('Get your token from: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

async function updateAuthConfig() {
  const url = `/v1/projects/${PROJECT_REF}/config/auth`;
  
  // Only update the password_hibp_enabled setting
  // We don't send other fields to avoid validation errors
  const data = JSON.stringify({
    password_hibp_enabled: true,
  });

  const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: url,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Successfully enabled leaked password protection!');
          // Don't log full response body as it may contain sensitive config data
          console.log('Response status:', res.statusCode);
          resolve(JSON.parse(body));
        } else {
          console.error(`❌ Error: HTTP ${res.statusCode}`);
          // Don't log full response body as it may contain sensitive data
          
          // Parse error message if possible
          let errorMessage = `HTTP ${res.statusCode}`;
          try {
            const errorBody = JSON.parse(body);
            if (errorBody.message && typeof errorBody.message === 'string') {
              // Sanitize error message
              errorMessage = errorBody.message.replace(/[\r\n]/g, ' ').substring(0, 200);
            }
          } catch (e) {
            // If body is not JSON, use status code only
            errorMessage = `HTTP ${res.statusCode}`;
          }
          
          reject(new Error(errorMessage));
        }
      });
    });

    req.on('error', (error) => {
      // Sanitize error logging to prevent log injection
      // Only log error type, not the full error object or message
      const errorType = (error?.constructor?.name || 'Unknown').replace(/[\r\n]/g, ' ').substring(0, 100);
      console.error('Request error: Network request failed');
      console.error('Error type:', errorType);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function getAuthConfig() {
  const url = `/v1/projects/${PROJECT_REF}/config/auth`;
  
  const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: url,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          // Don't include response body in error to avoid logging sensitive data
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    // Sanitize PROJECT_REF to prevent log injection
    const sanitizedProjectRef = PROJECT_REF.replace(/[^\w-]/g, '');
    console.log(`📋 Checking current auth configuration for project: ${sanitizedProjectRef}`);
    const currentConfig = await getAuthConfig();
    
    if (currentConfig.password_hibp_enabled) {
      console.log('✅ Leaked password protection (HaveIBeenPwned) is already enabled!');
      process.exit(0);
    }
    
    // Don't log sensitive config data
    console.log('Current status: password_hibp_enabled is false');
    console.log('\n🔒 Attempting to enable leaked password protection...');
    
    await updateAuthConfig();
    
    // Verify the change
    const updatedConfig = await getAuthConfig();
    if (updatedConfig.password_hibp_enabled) {
      console.log('\n✨ Success! Leaked password protection (HaveIBeenPwned) is now enabled.');
    } else {
      console.log('\n⚠️  Warning: Update completed but password_hibp_enabled is still false.');
      // Sanitize PROJECT_REF to prevent log injection
      const sanitizedProjectRef = PROJECT_REF.replace(/[^\w-]/g, '');
      console.log('Please verify in the dashboard: https://supabase.com/dashboard/project/' + sanitizedProjectRef + '/auth/providers');
    }
  } catch (error) {
    // Sanitize error message to prevent log injection
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    console.error('\n❌ Failed to update auth configuration');
    
    // Check for specific error patterns without logging full message
    if (errorMsg.includes('Pro Plans')) {
      console.error('\n⚠️  This feature requires a Supabase Pro Plan or higher.');
      console.error('   Please upgrade your plan at: https://supabase.com/dashboard/org/_/billing');
      console.error('   Or enable it manually after upgrading:');
    } else {
      console.error('\n💡 Alternative: Enable it manually via Supabase Dashboard:');
    }
    // Sanitize PROJECT_REF to prevent log injection
    const sanitizedProjectRef = PROJECT_REF.replace(/[^\w-]/g, '');
    console.error('   1. Go to: https://supabase.com/dashboard/project/' + sanitizedProjectRef + '/auth/providers');
    console.error('   2. Navigate to Authentication → Settings');
    console.error('   3. Enable "Password Protection" or "HaveIBeenPwned Integration"');
    process.exit(1);
  }
}

main();

