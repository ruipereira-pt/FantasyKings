import { supabase } from './supabase';

let isInitializing = false;
let isInitialized = false;

export async function initializeData() {
  if (isInitializing || isInitialized) return;

  isInitializing = true;

  try {
    const { count: playerCount } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true });

    if (playerCount && playerCount > 0) {
      isInitialized = true;
      isInitializing = false;
      return;
    }

    console.log('Initializing database with player and tournament data...');

    const playersResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-rankings`,
      {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (playersResponse.ok) {
      console.log('Players loaded successfully');
    }

    const tournamentsResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-tournament-schedules`,
      {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (tournamentsResponse.ok) {
      console.log('Tournaments loaded successfully');
    }

    isInitialized = true;
  } catch (error) {
    console.error('Error initializing data:', error);
  } finally {
    isInitializing = false;
  }
}
