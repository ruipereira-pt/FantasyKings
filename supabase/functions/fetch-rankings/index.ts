import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { players as playerData } from "./players-data.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const players = playerData;

    for (const player of players) {
      const price = calculatePrice(player.ranking);
      const { error } = await supabase
        .from("players")
        .upsert(
          {
            name: player.name,
            country: player.country,
            live_ranking: player.ranking,
            ranking: player.ranking,
            points: player.points,
            price: price,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "name" }
        );

      if (error) {
        console.error(`Error upserting player ${player.name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: players.length,
        message: `Successfully fetched and stored ${players.length} player rankings with pricing`,
        sample: players.slice(0, 10).map(p => ({ ...p, price: calculatePrice(p.ranking) }))
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching rankings:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});