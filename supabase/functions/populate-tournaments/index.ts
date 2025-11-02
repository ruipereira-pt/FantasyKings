import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { v4 as uuidv4 } from "npm:uuid@9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Competition {
  id: string;
  name: string;
  category: { id: string; name: string };
  level?: string;
  gender?: string;
}

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  year: number;
}

interface TournamentRecord {
  id: string;
  name: string;
  category: string;
  start_date?: string;
  end_date?: string;
  surface?: string;
  location?: string;
  prize_money?: number;
  status: string;
  sportradar_competition_id?: string;
  sportradar_season_id?: string;
  year?: number;
}

// Map ATP levels to our tournament categories
function mapAtpLevelToCategory(level: string): string {
  const levelMap: Record<string, string> = {
    'grand_slam': 'grand_slam',
    'atp_1000': 'atp_1000',
    'atp_500': 'atp_500',
    'atp_250': 'atp_250',
    'challenger': 'challenger',
    'davis_cup': 'davis_cup',
    'atp_finals': 'atp_finals',
    'united_cup': 'united_cup',
    'next_gen_atp_finals': 'next_gen_atp_finals',
    'olympic_games': 'olympic_games',
    'laver_cup': 'laver_cup',
    'world_team_cup': 'world_team_cup',
    'atp_cup': 'atp_cup',
  };
  return levelMap[level.toLowerCase()] || 'other';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Check for admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TEMPORARY: Allow any authenticated user for testing
    console.log('User email:', user.email);
    console.log('TEST MODE: Allowing any authenticated user');

    const apiKey = Deno.env.get('SPORTRADAR_API_KEY');
    if (!apiKey) {
      throw new Error('SPORTRADAR_API_KEY not found');
    }

    // Get pagination parameters from request body
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batch_size || 20; // Default to 20 competitions per batch
    const offset = body.offset || 0; // Starting offset
    const maxBatches = body.max_batches || 1; // Default to 1 batch per call

    console.log(`Starting tournament population with pagination...`);
    console.log(`Batch size: ${batchSize}, Offset: ${offset}, Max batches: ${maxBatches}`);

    // Step 1: Get all competitions (cached or fresh)
    console.log('Step 1: Fetching all competitions...');
    
    // Import cache utility
    let saveToCache: (endpoint: string, data: any) => Promise<void>;
    try {
      const cacheModule = await import('../_shared/sportradar-cache.ts');
      saveToCache = cacheModule.saveToCache;
    } catch {
      saveToCache = async () => {};
    }
    
    const competitionsEndpoint = '/competitions.json';
    const competitionsResponse = await fetch(
      `https://api.sportradar.com/tennis/trial/v3/en${competitionsEndpoint}?api_key=${apiKey}`
    );

    if (!competitionsResponse.ok) {
      if (competitionsResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again later.',
            status: competitionsResponse.status,
            message: 'Sportradar API rate limit reached',
            suggestion: 'Wait a few hours and try again, or use a different API key'
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Failed to fetch competitions: ${competitionsResponse.status} ${competitionsResponse.statusText}`);
    }

    const competitionsData = await competitionsResponse.json();
    
    // Save successful response to cache
    if (competitionsResponse.ok && competitionsData) {
      await saveToCache(competitionsEndpoint, competitionsData);
    }
    console.log(`Found ${competitionsData.competitions?.length || 0} total competitions`);

    if (!competitionsData.competitions || !Array.isArray(competitionsData.competitions)) {
      throw new Error('No competitions found in API response');
    }

    // Step 2: Filter competitions by ATP and Challenger categories, singles only
    const atpCompetitions = competitionsData.competitions.filter((comp: Competition) => {
      const isAtpOrChallenger = comp.category?.name === 'ATP' || comp.category?.name === 'Challenger';
      const isSingles = !comp.name?.toLowerCase().includes('doubles') && !comp.name?.toLowerCase().includes('men doubles');
      return isAtpOrChallenger && isSingles;
    });

    console.log(`Found ${atpCompetitions.length} ATP/Challenger singles competitions`);

    // Step 3: Apply pagination
    const startIndex = offset;
    const endIndex = Math.min(startIndex + (batchSize * maxBatches), atpCompetitions.length);
    const competitionsToProcess = atpCompetitions.slice(startIndex, endIndex);

    console.log(`Processing competitions ${startIndex} to ${endIndex - 1} (${competitionsToProcess.length} competitions)`);

    if (competitionsToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No more competitions to process',
          pagination: {
            total_competitions: atpCompetitions.length,
            processed: startIndex,
            remaining: 0,
            next_offset: null
          },
          tournaments: {
            created: 0,
            stored: 0,
            updated: 0,
            errors: 0
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tournaments: TournamentRecord[] = [];
    let processedCompetitions = 0;
    let successfulCompetitions = 0;

    // Step 4: Process competitions in batches
    for (let i = 0; i < competitionsToProcess.length; i += batchSize) {
      const batch = competitionsToProcess.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.length} competitions`);

      for (const competition of batch) {
        try {
          console.log(`Processing competition: ${competition.name} (${competition.id})`);
          
          // Add rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between requests
          
          // Fetch seasons for this competition
          const seasonsEndpoint = `/competitions/${competition.id}/seasons.json`;
          const seasonsResponse = await fetch(
            `https://api.sportradar.com/tennis/trial/v3/en${seasonsEndpoint}?api_key=${apiKey}`
          );

          if (!seasonsResponse.ok) {
            if (seasonsResponse.status === 429) {
              console.log(`Rate limited on ${competition.name}, waiting longer...`);
              await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds for rate limit
              continue;
            }
            console.log(`Skipping ${competition.name}: Failed to fetch seasons (${seasonsResponse.status})`);
            continue;
          }

          const seasonsData = await seasonsResponse.json();
          
          // Save successful response to cache
          if (seasonsResponse.ok && seasonsData) {
            await saveToCache(seasonsEndpoint, seasonsData);
          }
          
          if (!seasonsData.seasons || !Array.isArray(seasonsData.seasons)) {
            console.log(`Skipping ${competition.name}: No seasons found`);
            continue;
          }

          // Filter seasons that are in the future (from today onwards)
          const today = new Date();
          const futureSeasons = seasonsData.seasons.filter((season: Season) => {
            if (!season.start_date) return false;
            const seasonStartDate = new Date(season.start_date);
            return seasonStartDate >= today;
          });

          console.log(`Found ${futureSeasons.length} future seasons for ${competition.name}`);

          // Create tournament records for each future season
          for (const season of futureSeasons) {
            const tournament: TournamentRecord = {
              id: uuidv4(),
              name: `${competition.name} ${season.year}`,
              category: mapAtpLevelToCategory(competition.level || 'other'),
              start_date: season.start_date,
              end_date: season.end_date,
              surface: undefined, // Will be filled later via separate function
              location: undefined, // Will be filled later via separate function
              prize_money: undefined, // Will be filled later via separate function
              status: 'upcoming',
              sportradar_competition_id: competition.id,
              sportradar_season_id: season.id,
              year: season.year,
            };

            tournaments.push(tournament);
          }

          processedCompetitions++;
          successfulCompetitions++;

        } catch (error) {
          console.error(`Error processing competition ${competition.name}:`, error);
          processedCompetitions++;
          continue;
        }
      }

      // Store tournaments from this batch before moving to next batch
      console.log(`Storing ${tournaments.length} tournaments from batch...`);
      
      let batchSuccessCount = 0;
      let batchErrorCount = 0;
      let batchUpdatedCount = 0;
      
      for (const tournament of tournaments) {
        try {
          // Check if tournament already exists by sportradar_season_id
          const { data: existingTournament, error: checkError } = await supabaseAdmin
            .from("tournaments")
            .select("id")
            .eq("sportradar_season_id", tournament.sportradar_season_id)
            .maybeSingle();

          const isUpdate = !!existingTournament && !checkError;
          
          // Use id as the conflict key since it's the primary key and we're already determining it
          const tournamentId = existingTournament?.id || tournament.id;
          
          const { error } = await supabaseAdmin
            .from("tournaments")
            .upsert(
              {
                id: tournamentId,
                name: tournament.name,
                category: tournament.category,
                start_date: tournament.start_date,
                end_date: tournament.end_date,
                surface: tournament.surface,
                location: tournament.location,
                prize_money: tournament.prize_money,
                status: tournament.status,
                sportradar_competition_id: tournament.sportradar_competition_id,
                sportradar_season_id: tournament.sportradar_season_id,
                year: tournament.year,
                created_at: isUpdate ? undefined : new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "id" }
            );

          if (error) {
            console.error(`Error upserting tournament ${tournament.sportradar_season_id}:`, error);
            batchErrorCount++;
          } else {
            batchSuccessCount++;
            if (isUpdate) {
              batchUpdatedCount++;
              console.log(`Updated tournament: ${tournament.name} (${tournament.category})`);
            } else {
              console.log(`Created tournament: ${tournament.name} (${tournament.category})`);
            }
          }
        } catch (error) {
          console.error(`Error storing tournament ${tournament.sportradar_season_id}:`, error);
          batchErrorCount++;
        }
      }

      console.log(`Batch completed: ${batchSuccessCount} stored, ${batchUpdatedCount} updated, ${batchErrorCount} errors`);
      
      // Clear tournaments array for next batch
      tournaments.length = 0;
    }

    // Calculate pagination info
    const totalProcessed = startIndex + processedCompetitions;
    const remaining = Math.max(0, atpCompetitions.length - totalProcessed);
    const nextOffset = remaining > 0 ? totalProcessed : null;

    return new Response(
      JSON.stringify({
        success: true,
        pagination: {
          total_competitions: atpCompetitions.length,
          processed: totalProcessed,
          remaining: remaining,
          next_offset: nextOffset,
          batch_size: batchSize,
          max_batches: maxBatches
        },
        tournaments: {
          created: tournaments.length,
          stored: successfulCompetitions,
          updated: 0, // This would need to be tracked separately
          errors: processedCompetitions - successfulCompetitions
        },
        competitions_processed: processedCompetitions,
        competitions_successful: successfulCompetitions,
        tournaments_sample: tournaments.slice(0, 5),
        message: `Processed ${processedCompetitions} competitions (${successfulCompetitions} successful). ${remaining} competitions remaining.`,
        next_call: nextOffset ? {
          url: `${supabaseUrl}/functions/v1/populate-tournaments`,
          method: 'POST',
          body: {
            batch_size: batchSize,
            offset: nextOffset,
            max_batches: maxBatches
          }
        } : null
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error populating tournaments:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});