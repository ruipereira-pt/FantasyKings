/**
 * Fetches competition and season data from SportsRadar API, creates tournaments, and updates player schedules. This is the main function for syncing tournament data from SportsRadar.
 * 
 * Called by:
 *   - CompetitionManagement.tsx (admin only)
 * 
 * Method: POST
 * Authentication: Required (admin only)
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
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Competition {
  id: string;
  name: string;
  category?: { id: string; name: string };
  level?: string;
  gender?: string;
}

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  year: number;
}

interface SeasonInfo {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  year: number;
  prize_currency?: string;
  prize_money?: number;
  surface?: string;
  complex?: { name: string; city?: { name: string } };
  stages?: Array<{
    type: string;
    name: string;
    competitors?: Array<{
      competitor?: {
        id: string;
        name: string;
        country_code?: string;
      };
    }>;
  }>;
}

Deno.serve(async (req: Request) => {
  // Timeout protection - Edge Functions have ~60s timeout
  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 50 * 1000; // 50 seconds (conservative)
  const MAX_COMPETITIONS = 1; // Process exactly 1 competition per invocation to avoid timeouts
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

    const apiKey = Deno.env.get('SPORTRADAR_API_KEY');
    if (!apiKey) {
      throw new Error('SPORTRADAR_API_KEY not found');
    }

    // Import cache utility
    let saveToCache: (endpoint: string, data: any, supabase?: any) => Promise<void>;
    try {
      const cacheModule = await import('../_shared/sportradar-cache.ts');
      saveToCache = cacheModule.saveToCache;
    } catch {
      saveToCache = async () => {};
    }

    

    // TEMPORARY FIX: Commented out orphaned code block that references undefined variables
    // TODO: Add proper loop structures to iterate over competitions/seasons/competitors
    /*
    //                       let playerId: string;
    //                       
    //                       if (existingPlayer) {
    //                         playerId = existingPlayer.id;
    //                       } else {
    //                         // Create player if doesn't exist
    //                         const { data: newPlayer, error: playerError } = await supabaseAdmin
    //                           .from('players')
    //                           .insert({
    //                             name: competitor.name,
    //                             country: competitor.country_code || null,
    //                             sportradar_competitor_id: competitor.id,
    //                             ranking: null,
    //                             live_ranking: null,
    //                             points: 0,
    //                             price: 2, // Default price
    //                           })
    //                           .select()
    //                           .single();
    // 
    //                         if (playerError) {
    //                           console.error(`Error creating player ${competitor.name}:`, playerError);
    //                           continue;
    //                         }
    //                         playerId = newPlayer.id;
    //                       }
    // 
    //                       // Upsert player schedule
    //                       const scheduleQuery = supabaseAdmin
    //                         .from('player_schedules')
    //                         .upsert(
    //                         {
    //                           player_id: playerId,
    //                           tournament_id: tournament.id,
    //                           status: status as any,
    //                           entry_type: isQualification ? 'qualifying' : 'main_draw',
    //                         },
    //                         {
    //                           onConflict: 'player_id,tournament_id'
    //                         }
    //                       );
    //                       const { error: scheduleError } = await scheduleQuery;
    // 
    //                       if (!scheduleError) {
    //                         playersUpdated++;
    //                       }
    //                     } catch (error) {
    //                       console.error(`Error processing competitor ${competitor.name}:`, error);
    //                     }
    //                   }
    */
                }
              }
            }

            // lastProcessedId will be set after all seasons are processed
          } catch (error) {
            console.error(`Error processing season ${season.id}:`, error);
          }
        }

        
        
        // Return after processing 1 competition - next invocation will process the next one
        lastProcessedId = competition.id;
        
        processedCount++;
        
        // Return immediately after processing 1 competition - next invocation will handle the next one
        return new Response(
          JSON.stringify({
            success: true,
            message: `Processed 1 competition successfully. Call again to process the next competition.`,
            processed: processedCount,
            tournaments_created: tournamentsCreated,
            players_updated: playersUpdated,
            has_more: true,
            partial: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
        
        
      } catch (error) {
        console.error(`Error processing competition ${competition.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        tournaments_created: tournamentsCreated,
        players_updated: playersUpdated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Log detailed error server-side for debugging
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    
    // Return generic error message to client
    return new Response(
      JSON.stringify({ error: 'An internal server error occurred' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function mapCategoryFromCompetition(competition: Competition): string {
  const level = competition.level?.toLowerCase() || '';
  const categoryName = competition.category?.name?.toLowerCase() || '';
  
  if (categoryName.includes('grand slam') || level.includes('grand_slam')) return 'grand_slam';
  if (categoryName.includes('atp 1000') || level.includes('atp_1000')) return 'atp_1000';
  if (categoryName.includes('atp 500') || level.includes('atp_500')) return 'atp_500';
  if (categoryName.includes('atp 250') || level.includes('atp_250')) return 'atp_250';
  if (categoryName.includes('challenger') || level.includes('challenger')) return 'challenger';
  if (categoryName.includes('finals') || level.includes('finals')) return 'finals';
  
  return 'atp_250'; // Default
}
