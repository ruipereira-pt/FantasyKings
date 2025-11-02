import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://daczuujxslepsrqedttv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhY3p1dWp4c2xlcHNycWVkdHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzcxNzYsImV4cCI6MjA3NjkxMzE3Nn0.067bTgDOsGf9n8Zi0R5-1YlTfVdIZKOPzHXPBxIXC-8';

const supabase = createClient(supabaseUrl, supabaseKey);

class TournamentPaginationManager {
  constructor() {
    this.currentOffset = 0;
    this.batchSize = 20;
    this.maxBatches = 1;
    this.totalProcessed = 0;
    this.totalRemaining = 0;
  }

  async authenticate() {
    const { data } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test123456',
    });
    return data.session?.access_token;
  }

  async processBatch() {
    try {
      const token = await this.authenticate();
      
      console.log(`Processing batch: offset=${this.currentOffset}, batch_size=${this.batchSize}`);
      
      const response = await fetch(`${supabaseUrl}/functions/v1/populate-tournaments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batch_size: this.batchSize,
          offset: this.currentOffset,
          max_batches: this.maxBatches
        })
      });

      if (response.status === 200) {
        const result = await response.json();
        console.log('Batch processed successfully:', JSON.stringify(result, null, 2));
        
        // Update pagination state
        this.currentOffset = result.pagination.next_offset || this.currentOffset;
        this.totalProcessed = result.pagination.processed;
        this.totalRemaining = result.pagination.remaining;
        
        return {
          success: true,
          result: result,
          hasMore: result.pagination.next_offset !== null
        };
      } else if (response.status === 429) {
        const result = await response.json();
        console.log('Rate limited:', result);
        return {
          success: false,
          error: 'Rate limited',
          retryAfter: 'Wait a few hours and try again'
        };
      } else {
        const errorText = await response.text();
        console.log('Error:', errorText);
        return {
          success: false,
          error: errorText
        };
      }
    } catch (error) {
      console.error('Error processing batch:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processAllBatches() {
    console.log('Starting to process all batches...');
    let batchNumber = 1;
    
    while (true) {
      console.log(`\n--- Processing Batch ${batchNumber} ---`);
      
      const result = await this.processBatch();
      
      if (!result.success) {
        if (result.error === 'Rate limited') {
          console.log('Rate limit reached. Stopping processing.');
          console.log('You can resume later by calling processAllBatches() again.');
          break;
        } else {
          console.log('Error processing batch:', result.error);
          break;
        }
      }
      
      if (!result.hasMore) {
        console.log('All batches processed successfully!');
        break;
      }
      
      batchNumber++;
      
      // Add delay between batches to be respectful to the API
      console.log('Waiting 30 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    console.log(`\nProcessing complete! Total processed: ${this.totalProcessed}, Remaining: ${this.totalRemaining}`);
  }

  async getStatus() {
    try {
      const token = await this.authenticate();
      
      // Get current tournament count
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('*')
        .not('sportradar_competition_id', 'is', null);
      
      return {
        tournamentsInDatabase: tournaments?.length || 0,
        currentOffset: this.currentOffset,
        batchSize: this.batchSize,
        totalProcessed: this.totalProcessed,
        totalRemaining: this.totalRemaining
      };
    } catch (error) {
      console.error('Error getting status:', error);
      return null;
    }
  }
}

// Usage examples
async function main() {
  const manager = new TournamentPaginationManager();
  
  // Get current status
  const status = await manager.getStatus();
  console.log('Current status:', status);
  
  // Process a single batch
  // await manager.processBatch();
  
  // Process all batches (use with caution - will take a long time)
  // await manager.processAllBatches();
}

// Export for use in other scripts
export { TournamentPaginationManager };

// Run if called directly
if (import.meta.main) {
  main();
}
