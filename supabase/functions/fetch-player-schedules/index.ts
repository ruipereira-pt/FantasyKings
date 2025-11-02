/**
 * Fetches player schedules for a specific tournament
 * 
 * Called by:
 *   - api.ts
 *   - TeamBuilder.tsx
 * 
 * Method: POST
 * Authentication: Required
 * 
 * Environment Variables Required:
 *   - SPORTRADAR_API_KEY (for SportsRadar API calls)
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PlayerSchedule {
  player_id: string;
  tournament_name: string;
  status: string;
  start_date?: string;
  end_date?: string;
}

function normalizePlayerName(name: string): string {
  return name.toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

async function fetchPlayerSchedule(playerName: string): Promise<PlayerSchedule[] | null> {
  try {
    const normalizedName = normalizePlayerName(playerName);
    const url = `https://www.dartsrankings.com/tennis/schedules/${normalizedName}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch schedule for ${playerName}: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    const schedules: PlayerSchedule[] = [];
    
    const greenLineRegex = /<tr[^>]*class="[^"]*(?:bg-green|confirmed|registered)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
    let match;
    
    while ((match = greenLineRegex.exec(html)) !== null) {
      const rowHtml = match[1];
      
      const tournamentMatch = rowHtml.match(/>([^<]+(?:Masters|Open|Cup|Championship|ATP|Challenger)[^<]*)</i);
      const statusMatch = rowHtml.match(/status[^>]*>([^<]+)</i) || 
                         rowHtml.match(/confirmed|alternate|main draw/i);
      
      if (tournamentMatch) {
        const tournamentName = tournamentMatch[1].trim();
        const status = statusMatch ? statusMatch[1].trim() : 'confirmed';
        
        schedules.push({
          player_id: '',
          tournament_name: tournamentName,
          status: status.toLowerCase(),
        });
      }
    }
    
    return schedules.length > 0 ? schedules : null;
  } catch (error) {
    console.error(`Error fetching schedule for ${playerName}:`, error);
    return null;
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name')
      .order('ranking');

    if (playersError) {
      throw playersError;
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const player of players || []) {
      console.log(`Fetching schedule for ${player.name}...`);
      const schedules = await fetchPlayerSchedule(player.name);
      
      if (schedules && schedules.length > 0) {
        for (const schedule of schedules) {
          schedule.player_id = player.id;
          
          const { data: tournament } = await supabase
            .from('tournaments')
            .select('id')
            .ilike('name', `%${schedule.tournament_name}%`)
            .maybeSingle();

          if (tournament) {
            const { error: insertError } = await supabase
              .from('player_schedules')
              .upsert({
                player_id: player.id,
                tournament_id: tournament.id,
                status: schedule.status,
              }, {
                onConflict: 'player_id,tournament_id',
              });

            if (insertError) {
              console.error(`Error inserting schedule for ${player.name}:`, insertError);
              failCount++;
            } else {
              successCount++;
            }
          }
        }
        
        results.push({
          player: player.name,
          schedules: schedules.map(s => ({
            tournament: s.tournament_name,
            status: s.status,
          })),
        });
      } else {
        failCount++;
        results.push({
          player: player.name,
          schedules: [],
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${players?.length || 0} players. Success: ${successCount}, Failed: ${failCount}`,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});