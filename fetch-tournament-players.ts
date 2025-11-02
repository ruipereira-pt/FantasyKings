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
      // First, get tournament info
      const tournamentResponse = await fetch(
        `https://api.sportradar.com/tennis/trial/v3/en/tournaments/${tournamentId}/info.json?api_key=${apiKey}`
      );
      
      if (tournamentResponse.ok) {
        const tournamentData = await tournamentResponse.json();
        tournamentName = tournamentData.tournament?.name || 'Unknown Tournament';
        console.log(`Tournament: ${tournamentName}`);
      }

      // Get tournament participants (main draw)
      const participantsResponse = await fetch(
        `https://api.sportradar.com/tennis/trial/v3/en/tournaments/${tournamentId}/participants.json?api_key=${apiKey}`
      );
      
      if (participantsResponse.ok) {
        const participantsData = await participantsResponse.json();
        console.log('Participants data structure:', Object.keys(participantsData));
        
        if (participantsData.participants) {
          for (const participant of participantsData.participants) {
            if (participant.competitor) {
              const playerSchedule: PlayerSchedule = {
                player_id: participant.competitor.id,
                player_name: participant.competitor.name,
                tournament_id: tournamentId,
                tournament_name: tournamentName,
                status: 'main_draw',
                round: participant.round?.name,
                seed: participant.seed,
                country: participant.competitor.country_code,
                ranking: participant.competitor.ranking,
              };
              playerSchedules.push(playerSchedule);
            }
          }
        }
      } else {
        console.log(`Participants API error: ${participantsResponse.status}`);
      }

      // Get qualifying participants
      const qualifyingResponse = await fetch(
        `https://api.sportradar.com/tennis/trial/v3/en/tournaments/${tournamentId}/qualifying.json?api_key=${apiKey}`
      );
      
      if (qualifyingResponse.ok) {
        const qualifyingData = await qualifyingResponse.json();
        console.log('Qualifying data structure:', Object.keys(qualifyingData));
        
        if (qualifyingData.qualifying && qualifyingData.qualifying.participants) {
          for (const participant of qualifyingData.qualifying.participants) {
            if (participant.competitor) {
              const playerSchedule: PlayerSchedule = {
                player_id: participant.competitor.id,
                player_name: participant.competitor.name,
                tournament_id: tournamentId,
                tournament_name: tournamentName,
                status: 'qualifying',
                round: participant.round?.name,
                seed: participant.seed,
                country: participant.competitor.country_code,
                ranking: participant.competitor.ranking,
              };
              playerSchedules.push(playerSchedule);
            }
          }
        }
      } else {
        console.log(`Qualifying API error: ${qualifyingResponse.status}`);
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
          main_draw_players: playerSchedules.filter(p => p.status === 'main_draw').length,
          qualifying_players: playerSchedules.filter(p => p.status === 'qualifying').length,
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
