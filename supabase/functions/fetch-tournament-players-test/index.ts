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

    // TEMPORARY: Skip admin authentication for testing
    console.log('TEST MODE: Skipping admin authentication');

    const apiKey = Deno.env.get('SPORTRADAR_API_KEY');
    if (!apiKey) {
      throw new Error('SPORTRADAR_API_KEY not found');
    }

    // Get tournament ID from request body
    const body = await req.json().catch(() => ({}));
    const tournamentId = body.tournament_id;
    
    if (!tournamentId) {
      return new Response(
        JSON.stringify({ error: 'tournament_id is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching entry list for tournament: ${tournamentId}`);

    try {
      // Step 1: Get tournament seasons
      console.log(`Step 1: Getting seasons for tournament ${tournamentId}`);
      const seasonsResponse = await fetch(
        `https://api.sportradar.com/tennis/trial/v3/en/competitions/${tournamentId}/seasons.json?api_key=${apiKey}`
      );

      if (!seasonsResponse.ok) {
        throw new Error(`Failed to fetch seasons: ${seasonsResponse.status} ${seasonsResponse.statusText}`);
      }

      const seasonsData = await seasonsResponse.json();
      console.log('Seasons response:', JSON.stringify(seasonsData, null, 2));

      if (!seasonsData.seasons || !Array.isArray(seasonsData.seasons) || seasonsData.seasons.length === 0) {
        throw new Error('No seasons found for this tournament');
      }

      // Get the most recent/current season
      const currentSeason = seasonsData.seasons
        .sort((a: any, b: any) => (b.year || 0) - (a.year || 0))[0];

      console.log(`Step 2: Using season ${currentSeason.id} (${currentSeason.name})`);

      // Store season info in database
      const { error: seasonError } = await supabaseAdmin
        .from("tournament_seasons")
        .upsert(
          {
            id: currentSeason.id,
            tournament_id: tournamentId,
            season_urn: currentSeason.id,
            season_name: currentSeason.name,
            year: currentSeason.year,
            start_date: currentSeason.start_date,
            end_date: currentSeason.end_date,
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: "season_urn" }
        );

      if (seasonError) {
        console.error('Error storing season:', seasonError);
      }

      // Step 2: Get competitors (entry list) for this season
      console.log(`Step 3: Getting competitors for season ${currentSeason.id}`);
      const competitorsResponse = await fetch(
        `https://api.sportradar.com/tennis/trial/v3/en/seasons/${currentSeason.id}/competitors.json?api_key=${apiKey}`
      );

      if (!competitorsResponse.ok) {
        throw new Error(`Failed to fetch competitors: ${competitorsResponse.status} ${competitorsResponse.statusText}`);
      }

      const competitorsData: SeasonCompetitors = await competitorsResponse.json();
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
            season_urn: currentSeason.id,
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
            id: currentSeason.id,
            name: currentSeason.name,
            year: currentSeason.year,
          },
          players_found: playerSchedules.length,
          players_updated: successCount,
          players: playerSchedules.slice(0, 20), // Return first 20 as sample
          message: `Successfully fetched ${playerSchedules.length} players from entry list for ${seasonsData.competition?.name}`,
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
