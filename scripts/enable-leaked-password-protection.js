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
          console.log('Response:', body);
          resolve(JSON.parse(body));
        } else {
          console.error(`❌ Error: ${res.statusCode}`);
          console.error('Response:', body);
          
          // Parse error message if possible
          let errorMessage = `HTTP ${res.statusCode}`;
          try {
            const errorBody = JSON.parse(body);
            if (errorBody.message) {
              errorMessage = errorBody.message;
            }
          } catch (e) {
            errorMessage = body;
          }
          
          reject(new Error(errorMessage));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
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
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    console.log(`📋 Checking current auth configuration for project: ${PROJECT_REF}`);
    const currentConfig = await getAuthConfig();
    
    if (currentConfig.password_hibp_enabled) {
      console.log('✅ Leaked password protection (HaveIBeenPwned) is already enabled!');
      process.exit(0);
    }
    
    console.log(`Current password_hibp_enabled: ${currentConfig.password_hibp_enabled}`);
    console.log('\n🔒 Attempting to enable leaked password protection...');
    
    await updateAuthConfig();
    
    // Verify the change
    const updatedConfig = await getAuthConfig();
    if (updatedConfig.password_hibp_enabled) {
      console.log('\n✨ Success! Leaked password protection (HaveIBeenPwned) is now enabled.');
    } else {
      console.log('\n⚠️  Warning: Update completed but password_hibp_enabled is still false.');
      console.log('Please verify in the dashboard: https://supabase.com/dashboard/project/' + PROJECT_REF + '/auth/providers');
    }
  } catch (error) {
    console.error('\n❌ Failed to update auth configuration:', error.message);
    
    if (error.message.includes('Pro Plans')) {
      console.error('\n⚠️  This feature requires a Supabase Pro Plan or higher.');
      console.error('   Please upgrade your plan at: https://supabase.com/dashboard/org/_/billing');
      console.error('   Or enable it manually after upgrading:');
    } else {
      console.error('\n💡 Alternative: Enable it manually via Supabase Dashboard:');
    }
    console.error('   1. Go to: https://supabase.com/dashboard/project/' + PROJECT_REF + '/auth/providers');
    console.error('   2. Navigate to Authentication → Settings');
    console.error('   3. Enable "Password Protection" or "HaveIBeenPwned Integration"');
    process.exit(1);
  }
}

main();

