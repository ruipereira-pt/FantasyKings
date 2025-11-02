import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://daczuujxslepsrqedttv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhY3p1dWp4c2xlcHNycWVkdHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzcxNzYsImV4cCI6MjA3NjkxMzE3Nn0.067bTgDOsGf9n8Zi0R5-1YlTfVdIZKOPzHXPBxIXC-8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function signInAdmin() {
  try {
    // Sign in the admin user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@fk.com',
      password: 'admin123456',
    });

    if (error) {
      console.error('Error signing in:', error);
      return;
    }

    console.log('Admin user signed in successfully!');
    console.log('User email:', data.user?.email);
    console.log('Access token:', data.session?.access_token);
    
    // Test the function with the admin token
    const response = await fetch(`${supabaseUrl}/functions/v1/fetch-tournament-players`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tournament_id: '2659' }),
    });

    const result = await response.json();
    console.log('Function response:', result);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

signInAdmin();
