import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const apiKey = Deno.env.get('SPORTRADAR_API_KEY');
    if (!apiKey) {
      throw new Error('SPORTRADAR_API_KEY not found');
    }

    // Get tournament ID from request body or use a default
    const body = await req.json().catch(() => ({}));
    const tournamentId = body.tournament_id || 'sr:tournament:1'; // Default to a major tournament

    console.log(`Fetching draw for tournament: ${tournamentId}`);

    // Get tournament info
    const tournamentResponse = await fetch(
      `https://api.sportradar.com/tennis/trial/v3/en/tournaments/${tournamentId}/info.json?api_key=${apiKey}`
    );
    
    if (!tournamentResponse.ok) {
      throw new Error(`Tournament info API error: ${tournamentResponse.status}`);
    }
    
    const tournamentInfo = await tournamentResponse.json();
    console.log('Tournament info:', tournamentInfo.tournament?.name);

    // Get tournament draw
    const drawResponse = await fetch(
      `https://api.sportradar.com/tennis/trial/v3/en/tournaments/${tournamentId}/draw.json?api_key=${apiKey}`
    );
    
    if (!drawResponse.ok) {
      throw new Error(`Tournament draw API error: ${drawResponse.status}`);
    }
    
    const drawData = await drawResponse.json();
    console.log('Draw data structure:', Object.keys(drawData));

    // Parse and store matches
    const matches = [];
    if (drawData.draw && drawData.draw.matches) {
      for (const match of drawData.draw.matches) {
        const matchData = {
          id: match.id,
          tournament_id: tournamentInfo.tournament.id,
          round: match.round || 'Unknown',
          player1_id: match.competitors?.[0]?.id,
          player1_name: match.competitors?.[0]?.name,
          player2_id: match.competitors?.[1]?.id,
          player2_name: match.competitors?.[1]?.name,
          scheduled_date: match.scheduled,
          status: match.status || 'scheduled',
          winner_id: match.winner_id,
          score: match.score,
          surface: tournamentInfo.tournament.surface,
          best_of: match.best_of || 3,
        };

        matches.push(matchData);

        // Store in database
        const { error } = await supabaseAdmin
          .from("tournament_matches")
          .upsert(matchData, { onConflict: "id" });

        if (error) {
          console.error(`Error upserting match ${match.id}:`, error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        tournament: {
          id: tournamentInfo.tournament.id,
          name: tournamentInfo.tournament.name,
          surface: tournamentInfo.tournament.surface,
          start_date: tournamentInfo.tournament.start_date,
          end_date: tournamentInfo.tournament.end_date,
        },
        matches_count: matches.length,
        matches: matches.slice(0, 10), // Return first 10 matches as sample
        message: `Successfully fetched ${matches.length} matches for ${tournamentInfo.tournament.name}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching tournament draw:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
