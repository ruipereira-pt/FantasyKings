import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PlayerData {
  ranking: number;
  name: string;
  country: string;
  points: number;
  sportradar_competitor_id: string;
}

function calculatePrice(ranking: number): number {
  const basePrice = 20;
  const maxRank = 200;
  const calculated = Math.round(
    basePrice * ((Math.log(maxRank + 1) - Math.log(ranking + 1)) / Math.log(maxRank + 1))
  );
  return Math.max(2, calculated);
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

    console.log('Starting ATP rankings initialization...');

    // Fetch from Sportradar API
    const apiKey = Deno.env.get('SPORTRADAR_API_KEY');
    if (!apiKey) {
      throw new Error('SPORTRADAR_API_KEY not found');
    }

    const response = await fetch(`https://api.sportradar.com/tennis/trial/v3/en/rankings.json?api_key=${apiKey}`);
    if (!response.ok) {
      throw new Error(`Sportradar API error: ${response.status}`);
    }

    const data = await response.json();
    const rankings = data.rankings || data;
    
    if (!Array.isArray(rankings)) {
      throw new Error('Invalid rankings data structure');
    }

    const atpGroup = rankings.find(group => group.name === 'ATP');
    if (!atpGroup || !atpGroup.competitor_rankings) {
      throw new Error('ATP rankings not found');
    }

    const players: PlayerData[] = [];
    for (const player of atpGroup.competitor_rankings) {
      if (player.competitor?.id) {
        players.push({
          ranking: player.rank,
          name: player.competitor.name,
          country: player.competitor.country_code || 'UNK',
          points: player.points || 0,
          sportradar_competitor_id: player.competitor.id,
        });
      }
    }

    console.log(`Fetched ${players.length} players from Sportradar`);

    // Insert players into database
    for (const player of players) {
      const price = calculatePrice(player.ranking);
      
      const { error } = await supabaseAdmin
        .from("players")
        .upsert(
          {
            name: player.name,
            country: player.country,
            live_ranking: player.ranking,
            ranking: player.ranking,
            points: player.points,
            price: price,
            sportradar_competitor_id: player.sportradar_competitor_id,
            updated_at: new Date().toISOString(),
          },
          { 
            onConflict: "sportradar_competitor_id",
            ignoreDuplicates: false 
          }
        );

      if (error) {
        console.error(`Error upserting player ${player.name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: players.length,
        message: `Successfully fetched and stored ${players.length} player rankings`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
