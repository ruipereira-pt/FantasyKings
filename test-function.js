import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://daczuujxslepsrqedttv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhY3p1dWp4c2xlcHNycWVkdHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzcxNzYsImV4cCI6MjA3NjkxMzE3Nn0.067bTgDOsGf9n8Zi0R5-1YlTfVdIZKOPzHXPBxIXC-8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFunction() {
  try {
    // Try to sign in with a test user
    let { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test123456',
    });

    if (error) {
      console.log('User not found, creating new user...');
      
      // Create a new user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'test123456',
      });

      if (signUpError) {
        console.error('Error creating user:', signUpError);
        return;
      }

      console.log('User created, signing in...');
      
      // Sign in the new user
      const signInResult = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'test123456',
      });

      if (signInResult.error) {
        console.error('Error signing in:', signInResult.error);
        return;
      }

      data = signInResult.data;
    }

    console.log('User signed in successfully!');
    console.log('User email:', data.user?.email);
    console.log('Access token:', data.session?.access_token);
    
    // Test the function with the user token
    const response = await fetch(`${supabaseUrl}/functions/v1/fetch-tournament-players`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tournament_id: '2659' }),
    });

    const result = await response.json();
    console.log('Function response status:', response.status);
    console.log('Function response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testFunction();
