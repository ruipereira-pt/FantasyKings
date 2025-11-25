import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://daczuujxslepsrqedttv.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhY3p1dWp4c2xlcHNycWVkdHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzcxNzYsImV4cCI6MjA3NjkxMzE3Nn0.067bTgDOsGf9n8Zi0R5-1YlTfVdIZKOPzHXPBxIXC-8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runCleanup() {
  try {
    console.log('Step 1: Checking current tournament counts...\n');
    
    // Get all tournaments
    const { data: allTournaments, error: fetchError } = await supabase
      .from('tournaments')
      .select('id, name, gender, category, sportradar_season_id, start_date, end_date');
    
    if (fetchError) {
      throw fetchError;
    }
    
    const total = allTournaments.length;
    const menTournaments = allTournaments.filter(t => t.gender === 'men').length;
    const nonMenTournaments = allTournaments.filter(t => t.gender && t.gender !== 'men').length;
    const nullGenderTournaments = allTournaments.filter(t => !t.gender).length;
    const validCategories = ['grand_slam', 'atp_1000', 'atp_500', 'atp_250', 'finals', 'challenger'];
    const validCategoryTournaments = allTournaments.filter(t => 
      t.category && validCategories.includes(t.category)
    ).length;
    const invalidCategoryTournaments = allTournaments.filter(t => 
      t.category && !validCategories.includes(t.category)
    ).length;
    
    console.log(`Total tournaments: ${total}`);
    console.log(`Men tournaments: ${menTournaments}`);
    console.log(`Non-men tournaments: ${nonMenTournaments}`);
    console.log(`Null gender tournaments: ${nullGenderTournaments}`);
    console.log(`Valid category tournaments: ${validCategoryTournaments}`);
    console.log(`Invalid category tournaments: ${invalidCategoryTournaments}`);
    
    // Find tournaments to delete
    const tournamentsToDelete = allTournaments.filter(t => 
      (t.gender && t.gender !== 'men') ||
      (t.category && !validCategories.includes(t.category))
    );
    
    console.log(`\nStep 2: Found ${tournamentsToDelete.length} tournaments to delete\n`);
    
    if (tournamentsToDelete.length === 0) {
      console.log('No tournaments to delete. Exiting.');
      return;
    }
    
    // Preview tournaments to be deleted
    console.log('Tournaments to be deleted:');
    tournamentsToDelete.slice(0, 10).forEach(t => {
      console.log(`  - ${t.name} (ID: ${t.id}, Gender: ${t.gender || 'null'}, Category: ${t.category || 'null'})`);
    });
    if (tournamentsToDelete.length > 10) {
      console.log(`  ... and ${tournamentsToDelete.length - 10} more`);
    }
    
    console.log(`\nStep 3: Deleting tournaments...`);
    
    // Delete tournaments
    const idsToDelete = tournamentsToDelete.map(t => t.id);
    
    // Delete in batches to avoid timeout
    const batchSize = 100;
    let deletedCount = 0;
    
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      const { error: deleteError } = await supabase
        .from('tournaments')
        .delete()
        .in('id', batch);
      
      if (deleteError) {
        console.error(`Error deleting batch:`, deleteError);
        throw deleteError;
      }
      
      deletedCount += batch.length;
      console.log(`Deleted ${deletedCount}/${idsToDelete.length} tournaments...`);
    }
    
    console.log(`\n✅ Successfully deleted ${deletedCount} tournaments!`);
    
    // Verify remaining tournaments
    const { count: remainingCount } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\nStep 4: Verification`);
    console.log(`Remaining tournaments: ${remainingCount}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === 'PGRST301' || error.message.includes('permission')) {
      console.error('\n⚠️  Permission denied. This operation requires admin/service role key.');
      console.error('Please run the SQL file directly in the Supabase Dashboard SQL Editor,');
      console.error('or set SUPABASE_SERVICE_ROLE_KEY environment variable.');
    }
    process.exit(1);
  }
}

runCleanup();
