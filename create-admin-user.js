import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://daczuujxslepsrqedttv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhY3p1dWp4c2xlcHNycWVkdHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzcxNzYsImV4cCI6MjA3NjkxMzE3Nn0.067bTgDOsGf9n8Zi0R5-1YlTfVdIZKOPzHXPBxIXC-8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
  try {
    // Sign up a new user
    const { data, error } = await supabase.auth.signUp({
      email: 'admin@fk.com',
      password: 'admin123456',
    });

    if (error) {
      console.error('Error creating user:', error);
      return;
    }

    console.log('Admin user created successfully:', data);
    
    // Sign in the user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@fk.com',
      password: 'admin123456',
    });

    if (signInError) {
      console.error('Error signing in:', signInError);
      return;
    }

    console.log('Admin user signed in successfully:', signInData);
    console.log('Access token:', signInData.session?.access_token);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createAdminUser();