import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { tournaments2025 } from "./tournaments-data.ts";

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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tournaments = tournaments2025.map(t => ({
      ...t,
      surface: t.surface as "hard" | "clay" | "grass",
      category: t.category === "atp_250" ? "atp_250" : t.category as "grand_slam" | "atp_1000" | "atp_500" | "atp_250" | "finals" | "challenger",
      status: t.status as "upcoming" | "ongoing" | "completed"
    }));

    for (const tournament of tournaments) {
      const { error } = await supabase
        .from("tournaments")
        .upsert(
          {
            ...tournament,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "name,start_date" }
        );

      if (error) {
        console.error(`Error upserting tournament ${tournament.name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: tournaments.length,
        message: `Successfully fetched and stored ${tournaments.length} tournaments from 2025 calendar`,
        tournaments: tournaments.slice(0, 5)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching tournament schedules:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});