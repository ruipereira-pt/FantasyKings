import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PlayerSchedule {
  player_id: string;
  player_name: string;
  tournament_id: string;
  tournament_name: string;
  status: 'main_draw' | 'qualifying' | 'alternate';
  round?: string;
  seed?: number;
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

    const adminEmails = ['rui@fk.com', 'admin@fk.com'];
    if (!adminEmails.includes(user.email || '')) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    console.log(`Fetching player schedules for tournament: ${tournamentId}`);

    const playerSchedules: PlayerSchedule[] = [];
    let tournamentName = 'Unknown Tournament';

    try {
      // Use the daily schedule endpoint to find players for this tournament
      // This is more reliable than the specific tournament endpoints
      const today = new Date();
      const dates = [];
      
      // Check next 7 days for tournament matches
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      const tournamentPlayers = new Set<string>();
      
      for (const date of dates) {
        try {
          console.log(`Checking schedule for ${date}...`);
          
          const response = await fetch(
            `https://api.sportradar.com/tennis/trial/v3/en/schedules/${date}/summaries.json?api_key=${apiKey}`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.summaries && Array.isArray(data.summaries)) {
              for (const summary of data.summaries) {
                if (summary.sport_event && summary.sport_event.sport_event_context) {
                  const context = summary.sport_event.sport_event_context;
                  const event = summary.sport_event;
                  
                  // Check if this match belongs to our tournament
                  if (context.tournament?.id === tournamentId || 
                      context.tournament?.name?.toLowerCase().includes(tournamentId.toLowerCase())) {
                    
                    tournamentName = context.tournament?.name || tournamentName;
                    
                    // Extract players from this match
                    const competitors = event.competitors || [];
                    for (const competitor of competitors) {
                      if (competitor.id && competitor.name) {
                        tournamentPlayers.add(JSON.stringify({
                          id: competitor.id,
                          name: competitor.name,
                          country: competitor.country_code,
                          ranking: competitor.ranking,
                        }));
                      }
                    }
                  }
                }
              }
            }
          } else {
            console.log(`No data for ${date} (${response.status})`);
          }
          
          // Rate limiting - wait between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Error checking ${date}:`, error);
        }
      }

      // Convert Set to PlayerSchedule array
      for (const playerStr of tournamentPlayers) {
        const player = JSON.parse(playerStr);
        const playerSchedule: PlayerSchedule = {
          player_id: player.id,
          player_name: player.name,
          tournament_id: tournamentId,
          tournament_name: tournamentName,
          status: 'main_draw', // Default to main draw
          country: player.country,
          ranking: player.ranking,
        };
        playerSchedules.push(playerSchedule);
      }

      // Store player schedules in database
      let successCount = 0;
      for (const schedule of playerSchedules) {
        const { error } = await supabaseAdmin
          .from("player_schedules")
          .upsert(
            {
              player_id: schedule.player_id,
              tournament_id: schedule.tournament_id,
              status: schedule.status,
              round: schedule.round,
              seed: schedule.seed,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "player_id,tournament_id" }
          );

        if (error) {
          console.error(`Error upserting player schedule ${schedule.player_id}:`, error);
        } else {
          successCount++;
        }

        // Also update/insert player info if not exists
        const { error: playerError } = await supabaseAdmin
          .from("players")
          .upsert(
            {
              sportradar_competitor_id: schedule.player_id,
              name: schedule.player_name,
              country: schedule.country,
              ranking: schedule.ranking,
              updated_at: new Date().toISOString(),
            },
            { 
              onConflict: "sportradar_competitor_id",
              ignoreDuplicates: false 
            }
          );

        if (playerError) {
          console.error(`Error upserting player ${schedule.player_id}:`, playerError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          tournament: {
            id: tournamentId,
            name: tournamentName,
          },
          players_found: playerSchedules.length,
          players_updated: successCount,
          players: playerSchedules.slice(0, 20), // Return first 20 as sample
          message: `Successfully fetched ${playerSchedules.length} players for ${tournamentName}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } catch (error) {
      console.error(`Error fetching players for tournament ${tournamentId}:`, error);
      throw error;
    }

  } catch (error) {
    console.error("Error fetching tournament players:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
