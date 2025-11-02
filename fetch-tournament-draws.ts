import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MatchData {
  id: string;
  tournament_id: string;
  round: string;
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

interface TournamentDraw {
  tournament_id: string;
  tournament_name: string;
  surface: string;
  start_date: string;
  end_date: string;
  matches: MatchData[];
}

class SportradarDrawService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.sportradar.com/tennis/trial/v3/en';
  }

  async getTournamentSchedule(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tournaments.json?api_key=${this.apiKey}`);
      if (!response.ok) {
        throw new Error(`Tournament schedule API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching tournament schedule:', error);
      return [];
    }
  }

  async getTournamentDraw(tournamentId: string): Promise<TournamentDraw | null> {
    try {
      // Get tournament details first
      const tournamentResponse = await fetch(`${this.baseUrl}/tournaments/${tournamentId}/info.json?api_key=${this.apiKey}`);
      if (!tournamentResponse.ok) {
        console.error(`Tournament info API error: ${tournamentResponse.status}`);
        return null;
      }
      const tournamentInfo = await tournamentResponse.json();

      // Get tournament draw
      const drawResponse = await fetch(`${this.baseUrl}/tournaments/${tournamentId}/draw.json?api_key=${this.apiKey}`);
      if (!drawResponse.ok) {
        console.error(`Tournament draw API error: ${drawResponse.status}`);
        return null;
      }
      const drawData = await drawResponse.json();

      return this.parseDrawData(tournamentInfo, drawData);
    } catch (error) {
      console.error(`Error fetching draw for tournament ${tournamentId}:`, error);
      return null;
    }
  }

  private parseDrawData(tournamentInfo: any, drawData: any): TournamentDraw {
    const matches: MatchData[] = [];

    // Parse matches from draw data
    if (drawData.draw && drawData.draw.matches) {
      for (const match of drawData.draw.matches) {
        matches.push({
          id: match.id,
          tournament_id: tournamentInfo.tournament.id,
          round: match.round || 'Unknown',
          player1_id: match.competitors?.[0]?.id,
          player1_name: match.competitors?.[0]?.name,
          player2_id: match.competitors?.[1]?.id,
          player2_name: match.competitors?.[1]?.name,
          scheduled_date: match.scheduled,
          status: this.mapMatchStatus(match.status),
          winner_id: match.winner_id,
          score: match.score,
          surface: tournamentInfo.tournament.surface,
          best_of: match.best_of || 3,
        });
      }
    }

    return {
      tournament_id: tournamentInfo.tournament.id,
      tournament_name: tournamentInfo.tournament.name,
      surface: tournamentInfo.tournament.surface,
      start_date: tournamentInfo.tournament.start_date,
      end_date: tournamentInfo.tournament.end_date,
      matches: matches,
    };
  }

  private mapMatchStatus(status: string): 'scheduled' | 'in_progress' | 'completed' | 'cancelled' {
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

  async getUpcomingTournaments(): Promise<any[]> {
    try {
      const tournaments = await this.getTournamentSchedule();
      const now = new Date();
      
      return tournaments.filter(tournament => {
        const startDate = new Date(tournament.start_date);
        return startDate >= now && tournament.status === 'scheduled';
      });
    } catch (error) {
      console.error('Error fetching upcoming tournaments:', error);
      return [];
    }
  }
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

    const drawService = new SportradarDrawService(apiKey);
    
    // Get upcoming tournaments
    console.log('Fetching upcoming tournaments...');
    const upcomingTournaments = await drawService.getUpcomingTournaments();
    console.log(`Found ${upcomingTournaments.length} upcoming tournaments`);

    const results = [];
    
    // Fetch draws for each tournament (limit to first 5 to avoid rate limits)
    for (const tournament of upcomingTournaments.slice(0, 5)) {
      console.log(`Fetching draw for tournament: ${tournament.name}`);
      const draw = await drawService.getTournamentDraw(tournament.id);
      
      if (draw) {
        results.push(draw);
        
        // Store matches in database
        for (const match of draw.matches) {
          const { error } = await supabaseAdmin
            .from("tournament_matches")
            .upsert(
              {
                id: match.id,
                tournament_id: match.tournament_id,
                round: match.round,
                player1_id: match.player1_id,
                player1_name: match.player1_name,
                player2_id: match.player2_id,
                player2_name: match.player2_name,
                scheduled_date: match.scheduled_date,
                status: match.status,
                winner_id: match.winner_id,
                score: match.score,
                surface: match.surface,
                best_of: match.best_of,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "id" }
            );

          if (error) {
            console.error(`Error upserting match ${match.id}:`, error);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        tournaments_processed: results.length,
        total_matches: results.reduce((sum, draw) => sum + draw.matches.length, 0),
        message: `Successfully fetched draws for ${results.length} tournaments`,
        tournaments: results.map(draw => ({
          id: draw.tournament_id,
          name: draw.tournament_name,
          matches_count: draw.matches.length,
          surface: draw.surface,
          start_date: draw.start_date,
          end_date: draw.end_date,
        }))
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching tournament draws:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
