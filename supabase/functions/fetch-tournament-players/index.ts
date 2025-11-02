import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TournamentSeason {
  id: string;
  name: string;
  urn: string;
  year: number;
  start_date?: string;
  end_date?: string;
}

interface Competitor {
  id: string;
  name: string;
  country_code?: string;
  country?: string;
  ranking?: number;
  seed?: number;
  type?: 'player' | 'team';
}

interface SeasonCompetitors {
  competitors: Competitor[];
  season: {
    id: string;
    name: string;
    year: number;
  };
}

interface PlayerSchedule {
  player_id: string;
  player_name: string;
  tournament_id: string;
  tournament_name: string;
  season_urn: string;
  entry_type: 'main_draw' | 'qualifying' | 'alternate' | 'wildcard';
  seed_number?: number;
  country?: string;
  ranking?: number;
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
    
    // const adminEmails = ['rui@fk.com', 'admin@fk.com'];
    // if (!adminEmails.includes(user.email || '')) {
    //   return new Response(
    //     JSON.stringify({ error: 'Admin access required' }),
    //     { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    //   );
    // }

    const apiKey = Deno.env.get('SPORTRADAR_API_KEY');
    if (!apiKey) {
      throw new Error('SPORTRADAR_API_KEY not found');
    }

    // Get tournament ID and year from request body
    const body = await req.json().catch(() => ({}));
    const tournamentId = body.tournament_id;
    const requestedYear = body.year || new Date().getFullYear(); // Default to current year
    
    if (!tournamentId) {
      return new Response(
        JSON.stringify({ error: 'tournament_id is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching entry list for tournament: ${tournamentId}, year: ${requestedYear}`);

    try {
      // Import cache utility
      let saveToCache: (endpoint: string, data: any) => Promise<void>;
      try {
        const cacheModule = await import('../_shared/sportradar-cache.ts');
        saveToCache = cacheModule.saveToCache;
      } catch {
        saveToCache = async () => {};
      }

      // Step 1: Get tournament seasons
      console.log(`Step 1: Getting seasons for tournament ${tournamentId}`);
      const seasonsEndpoint = `/competitions/${tournamentId}/seasons.json`;
      const seasonsResponse = await fetch(
        `https://api.sportradar.com/tennis/trial/v3/en${seasonsEndpoint}?api_key=${apiKey}`
      );

      if (!seasonsResponse.ok) {
        const errorText = await seasonsResponse.text();
        console.error('Seasons API error details:', errorText);
        throw new Error(`Failed to fetch seasons: ${seasonsResponse.status} ${seasonsResponse.statusText} - ${errorText}`);
      }

      const seasonsData = await seasonsResponse.json();
      
      // Save successful response to cache
      if (seasonsResponse.ok && seasonsData) {
        await saveToCache(seasonsEndpoint, seasonsData);
      }
      console.log('Seasons response:', JSON.stringify(seasonsData, null, 2));

      if (!seasonsData.seasons || !Array.isArray(seasonsData.seasons) || seasonsData.seasons.length === 0) {
        throw new Error('No seasons found for this tournament');
      }

      // Find the season for the requested year
      const targetSeason = seasonsData.seasons.find((season: any) => season.year === requestedYear);
      
      if (!targetSeason) {
        const availableYears = seasonsData.seasons.map((s: any) => s.year).join(', ');
        throw new Error(`No season found for year ${requestedYear}. Available years: ${availableYears}`);
      }

      console.log(`Step 2: Using season ${targetSeason.id} (${targetSeason.name}) for year ${requestedYear}`);

      // Store season info in database
      const { error: seasonError } = await supabaseAdmin
        .from("tournament_seasons")
        .upsert(
          {
            id: targetSeason.id,
            tournament_id: tournamentId,
            season_urn: targetSeason.id,
            season_name: targetSeason.name,
            year: targetSeason.year,
            start_date: targetSeason.start_date,
            end_date: targetSeason.end_date,
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: "season_urn" }
        );

      if (seasonError) {
        console.error('Error storing season:', seasonError);
      }

      // Step 2: Get competitors (entry list) for this season
      console.log(`Step 3: Getting competitors for season ${targetSeason.id}`);
      
      // Add rate limiting delay
      console.log('Adding rate limiting delay...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const competitorsResponse = await fetch(
        `https://api.sportradar.com/tennis/trial/v3/en/seasons/${targetSeason.id}/competitors.json?api_key=${apiKey}`
      );

      if (!competitorsResponse.ok) {
        if (competitorsResponse.status === 429) {
          throw new Error(`Rate limit exceeded. Please wait a moment and try again. (Status: ${competitorsResponse.status})`);
        }
        const errorText = await competitorsResponse.text();
        console.error('Competitors API error details:', errorText);
        throw new Error(`Failed to fetch competitors: ${competitorsResponse.status} ${competitorsResponse.statusText} - ${errorText}`);
      }

      const competitorsData: SeasonCompetitors = await competitorsResponse.json();
      
      // Save successful response to cache
      if (competitorsResponse.ok && competitorsData) {
        await saveToCache(`/seasons/${targetSeason.id}/competitors.json`, competitorsData);
      }
      
      console.log(`Found ${competitorsData.competitors?.length || 0} competitors`);

      if (!competitorsData.competitors || !Array.isArray(competitorsData.competitors)) {
        throw new Error('No competitors found in season data');
      }

      // Process competitors into player schedules
      const playerSchedules: PlayerSchedule[] = [];
      let successCount = 0;

      for (const competitor of competitorsData.competitors) {
        if (competitor.type === 'player' && competitor.id && competitor.name) {
          const playerSchedule: PlayerSchedule = {
            player_id: competitor.id,
            player_name: competitor.name,
            tournament_id: tournamentId,
            tournament_name: seasonsData.competition?.name || 'Unknown Tournament',
            season_urn: targetSeason.id,
            entry_type: 'main_draw', // Default to main draw
            seed_number: competitor.seed,
            country: competitor.country_code || competitor.country,
            ranking: competitor.ranking,
          };
          playerSchedules.push(playerSchedule);

          // Store player schedule in database
          const { error } = await supabaseAdmin
            .from("player_schedules")
            .upsert(
              {
                player_id: playerSchedule.player_id,
                tournament_id: playerSchedule.tournament_id,
                season_urn: playerSchedule.season_urn,
                status: 'confirmed',
                entry_type: playerSchedule.entry_type,
                seed: playerSchedule.seed_number,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "player_id,tournament_id" }
            );

          if (error) {
            console.error(`Error upserting player schedule ${playerSchedule.player_id}:`, error);
          } else {
            successCount++;
          }

          // Also update/insert player info if not exists
          const { error: playerError } = await supabaseAdmin
            .from("players")
            .upsert(
              {
                sportradar_competitor_id: playerSchedule.player_id,
                name: playerSchedule.player_name,
                country: playerSchedule.country,
                ranking: playerSchedule.ranking,
                updated_at: new Date().toISOString(),
              },
              { 
                onConflict: "sportradar_competitor_id",
                ignoreDuplicates: false 
              }
            );

          if (playerError) {
            console.error(`Error upserting player ${playerSchedule.player_id}:`, playerError);
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          tournament: {
            id: tournamentId,
            name: seasonsData.competition?.name || 'Unknown Tournament',
          },
          season: {
            id: targetSeason.id,
            name: targetSeason.name,
            year: targetSeason.year,
          },
          requested_year: requestedYear,
          players_found: playerSchedules.length,
          players_updated: successCount,
          players: playerSchedules.slice(0, 20), // Return first 20 as sample
          message: `Successfully fetched ${playerSchedules.length} players from entry list for ${seasonsData.competition?.name} ${requestedYear}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } catch (error) {
      console.error(`Error fetching entry list for tournament ${tournamentId}:`, error);
      throw error;
    }

  } catch (error) {
    console.error("Error fetching tournament entry list:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});