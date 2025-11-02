import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MatchData {
  id: string;
  tournament_id?: string;
  tournament_name?: string;
  round?: string;
  player1_id?: string;
  player1_name?: string;
  player2_id?: string;
  player2_name?: string;
  scheduled_date?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  winner_id?: string;
  score?: string;
  surface?: string;
  best_of?: number;
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

    // Get date from request body or use today
    const body = await req.json().catch(() => ({}));
    const date = body.date || new Date().toISOString().split('T')[0];

    console.log(`Fetching daily schedule for: ${date}`);

    // Fetch daily schedule
    const response = await fetch(
      `https://api.sportradar.com/tennis/trial/v3/en/schedules/${date}/summaries.json?api_key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Daily schedule API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Schedule data structure:', Object.keys(data));

    const matches: MatchData[] = [];
    
    if (data.summaries && Array.isArray(data.summaries)) {
      for (const summary of data.summaries) {
        if (summary.sport_event && summary.sport_event.sport_event_context) {
          const context = summary.sport_event.sport_event_context;
          const event = summary.sport_event;
          
          // Extract player information
          const competitors = event.competitors || [];
          const player1 = competitors[0];
          const player2 = competitors[1];
          
          const match: MatchData = {
            id: event.id,
            tournament_id: context.tournament?.id,
            tournament_name: context.tournament?.name,
            round: context.round?.name,
            player1_id: player1?.id,
            player1_name: player1?.name,
            player2_id: player2?.id,
            player2_name: player2?.name,
            scheduled_date: event.scheduled,
            status: mapMatchStatus(summary.sport_event_status?.status),
            winner_id: summary.sport_event_status?.winner_id,
            score: summary.sport_event_status?.score,
            surface: context.tournament?.surface,
            best_of: 3, // Default for tennis
          };

          matches.push(match);

          // Store in database
          const { error } = await supabaseAdmin
            .from("tournament_matches")
            .upsert(match, { onConflict: "id" });

          if (error) {
            console.error(`Error upserting match ${match.id}:`, error);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: date,
        matches_count: matches.length,
        matches: matches.slice(0, 20), // Return first 20 matches as sample
        message: `Successfully fetched ${matches.length} matches for ${date}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching daily schedule:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function mapMatchStatus(status: string): 'scheduled' | 'in_progress' | 'completed' | 'cancelled' {
  switch (status?.toLowerCase()) {
    case 'scheduled':
    case 'not_started':
      return 'scheduled';
    case 'in_progress':
    case 'live':
      return 'in_progress';
    case 'completed':
    case 'finished':
      return 'completed';
    case 'cancelled':
    case 'postponed':
      return 'cancelled';
    default:
      return 'scheduled';
  }
}
