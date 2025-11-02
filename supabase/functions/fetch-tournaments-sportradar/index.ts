import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createSportradarService } from "../fetch-rankings/sportradar-service.ts";

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
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user is authenticated and is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const adminEmails = ['rui@fk.com', 'admin@fk.com'];
    if (!adminEmails.includes(user.email || '')) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for database operations
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    console.log(`Starting tournament update from Sportradar by admin: ${user.email}...`);

    const sportradarService = createSportradarService();
    if (!sportradarService) {
      return new Response(
        JSON.stringify({ error: 'Sportradar API key not configured' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tournaments = await sportradarService.getTournaments();
    console.log(`Fetched ${tournaments.length} tournaments from Sportradar`);

    let successCount = 0;
    let errorCount = 0;

    for (const tournament of tournaments) {
      try {
        const { error } = await supabaseAdmin
          .from("tournaments")
          .upsert(
            {
              id: tournament.id,
              name: tournament.name,
              category: tournament.category,
              surface: tournament.surface,
              location: tournament.location,
              start_date: tournament.start_date,
              end_date: tournament.end_date,
              prize_money: tournament.prize_money,
              status: tournament.status,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

        if (error) {
          console.error(`Error upserting tournament ${tournament.name}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing tournament ${tournament.name}:`, error);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: tournaments.length,
        successCount,
        errorCount,
        message: `Successfully updated ${successCount} tournaments from Sportradar`,
        sample: tournaments.slice(0, 5)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching tournaments from Sportradar:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
