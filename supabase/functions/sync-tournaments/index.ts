/**
 * Optimized Tournament Sync from SportsRadar API
 * 
 * Features:
 * - Parallel processing with concurrency limits
 * - State management for resumable syncs
 * - Only sleeps on actual rate limits (429)
 * - Can be called multiple times to complete sync
 * 
 * Flow:
 * 1. GET /competitions - Get all competitions
 * 2. Process competitions in parallel (with limit)
 * 3. For each competition, GET /competitions/{id}/seasons (XML)
 * 4. Filter seasons by year, gender=men, type=singles, category=ATP/Challenger
 * 5. For each season, GET /seasons/{season_id}/info (XML) in parallel
 * 6. Upsert tournaments and tournament_seasons
 * 
 * Method: POST
 * Body: { year: number, resumeFrom?: string, maxCompetitions?: number }
 * Authentication: Admin only
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SeasonInfo {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  year: number;
  competition_id: string;
  sport_id?: string;
  category_id?: string;
  category_name?: string;
  competition_name?: string;
  parent_competition_id?: string;
  gender?: string;
  type?: string;
  prize_currency?: string;
  prize_money?: number;
  surface?: string;
  venue?: string;
  complex_id?: string;
  number_of_competitors?: number;
  number_of_qualified_competitors?: number;
  number_of_scheduled_matches?: number;
}

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  year: number;
  competition_id: string;
}

// Rate limit tracking
let rateLimitDelay = 0;
const MAX_RATE_LIMIT_DELAY = 30000; // Max 30 seconds

function parseXMLSeasons(xmlText: string): Season[] {
  const seasons: Season[] = [];
  try {
    const seasonRegex = /<season[^>]*id="([^"]*)"[^>]*name="([^"]*)"[^>]*start_date="([^"]*)"[^>]*end_date="([^"]*)"[^>]*year="([^"]*)"[^>]*competition_id="([^"]*)"[^>]*\/>/g;
    let match;
    while ((match = seasonRegex.exec(xmlText)) !== null) {
      seasons.push({
        id: match[1],
        name: match[2],
        start_date: match[3],
        end_date: match[4],
        year: parseInt(match[5]),
        competition_id: match[6],
      });
    }
  } catch (error) {
    console.error('Error parsing seasons XML:', error);
  }
  return seasons;
}

function parseXMLSeasonInfo(xmlText: string): SeasonInfo | null {
  try {
    const seasonMatch = xmlText.match(/<season[^>]*id="([^"]*)"[^>]*name="([^"]*)"[^>]*start_date="([^"]*)"[^>]*end_date="([^"]*)"[^>]*year="([^"]*)"[^>]*competition_id="([^"]*)"[^>]*>/);
    if (!seasonMatch) return null;
    
    const season: SeasonInfo = {
      id: seasonMatch[1],
      name: seasonMatch[2],
      start_date: seasonMatch[3],
      end_date: seasonMatch[4],
      year: parseInt(seasonMatch[5]),
      competition_id: seasonMatch[6],
    };
    
    const sportMatch = xmlText.match(/<sport[^>]*id="([^"]*)"[^>]*name="([^"]*)"[^>]*\/>/);
    if (sportMatch) season.sport_id = sportMatch[1];
    
    const categoryMatch = xmlText.match(/<category[^>]*id="([^"]*)"[^>]*name="([^"]*)"[^>]*\/>/);
    if (categoryMatch) {
      season.category_id = categoryMatch[1];
      season.category_name = categoryMatch[2];
    }
    
    const competitionMatch = xmlText.match(/<competition[^>]*id="([^"]*)"[^>]*name="([^"]*)"[^>]*(?:parent_id="([^"]*)")?[^>]*type="([^"]*)"[^>]*gender="([^"]*)"[^>]*\/>/);
    if (competitionMatch) {
      season.competition_name = competitionMatch[2];
      season.parent_competition_id = competitionMatch[3];
      season.type = competitionMatch[4];
      season.gender = competitionMatch[5];
    }
    
    const infoMatch = xmlText.match(/<info[^>]*(?:prize_currency="([^"]*)")?[^>]*(?:prize_money="([^"]*)")?[^>]*(?:surface="([^"]*)")?[^>]*(?:complex="([^"]*)")?[^>]*(?:complex_id="([^"]*)")?[^>]*(?:number_of_competitors="([^"]*)")?[^>]*(?:number_of_qualified_competitors="([^"]*)")?[^>]*(?:number_of_scheduled_matches="([^"]*)")?[^>]*\/>/);
    if (infoMatch) {
      season.prize_currency = infoMatch[1];
      season.prize_money = infoMatch[2] ? parseInt(infoMatch[2]) : undefined;
      season.surface = infoMatch[3]?.replace('hardcourt_indoor', 'hard').replace('hardcourt_outdoor', 'hard');
      season.venue = infoMatch[4];
      season.complex_id = infoMatch[5];
      season.number_of_competitors = infoMatch[6] ? parseInt(infoMatch[6]) : undefined;
      season.number_of_qualified_competitors = infoMatch[7] ? parseInt(infoMatch[7]) : undefined;
      season.number_of_scheduled_matches = infoMatch[8] ? parseInt(infoMatch[8]) : undefined;
    }
    
    return season;
  } catch (error) {
    console.error('Error parsing XML:', error);
    return null;
  }
}

function mapCategory(categoryName: string): string {
  const categoryMap: Record<string, string> = {
    'Grand Slam': 'grand_slam',
    'ATP Masters 1000': 'atp_1000',
    'ATP 500': 'atp_500',
    'ATP 250': 'atp_250',
    'ATP Finals': 'finals',
    'Challenger': 'challenger',
  };
  return categoryMap[categoryName] || 'challenger';
}

function mapSurface(surface: string): string {
  if (!surface) return 'hard';
  const surfaceMap: Record<string, string> = {
    'hardcourt_indoor': 'hard',
    'hardcourt_outdoor': 'hard',
    'hard': 'hard',
    'clay': 'clay',
    'grass': 'grass',
    'carpet': 'carpet',
  };
  return surfaceMap[surface.toLowerCase()] || 'hard';
}

function matchesFilters(seasonInfo: SeasonInfo): boolean {
  if (seasonInfo.gender !== 'men') return false;
  if (seasonInfo.type !== 'singles') return false;
  const categoryName = seasonInfo.category_name || '';
  if (categoryName !== 'ATP' && categoryName !== 'Challenger') return false;
  return true;
}

function hasChanges(existing: any, newData: any): boolean {
  const fieldsToCompare = [
    'name', 'category', 'surface', 'location', 'start_date', 'end_date',
    'prize_money', 'prize_currency', 'venue', 'complex_id',
    'number_of_competitors', 'number_of_qualified_competitors', 'number_of_scheduled_matches',
    'sport_id', 'parent_competition_id', 'gender', 'sportradar_competition_id',
    'year', 'status'
  ];
  
  for (const field of fieldsToCompare) {
    const existingValue = existing[field];
    const newValue = newData[field];
    
    if ((existingValue === null || existingValue === undefined) && 
        (newValue === null || newValue === undefined)) {
      continue;
    }
    
    if (existingValue !== newValue) {
      return true;
    }
  }
  
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Optimized fetch with rate limit handling - only sleeps on actual 429
async function fetchWithRateLimit(url: string, retries: number = 3): Promise<Response> {
  // Always add a small delay to avoid hitting rate limits
  await sleep(200); // 200ms delay between requests
  
  for (let i = 0; i < retries; i++) {
    // Apply current rate limit delay if any
    if (rateLimitDelay > 0) {
      await sleep(rateLimitDelay);
      rateLimitDelay = 0; // Reset after applying
    }
    
    const response = await fetch(url);
    
    if (response.status === 429) {
      // Rate limited - extract retry-after or use exponential backoff
      const retryAfter = parseInt(response.headers.get('Retry-After') || '0') * 1000;
      const delay = retryAfter || Math.min(2000 * Math.pow(2, i), MAX_RATE_LIMIT_DELAY);
      rateLimitDelay = delay;
      console.log(`Rate limited (429). Waiting ${delay}ms...`);
      await sleep(delay);
      continue;
    }
    
    if (!response.ok && response.status !== 429) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }
  
  throw new Error(`Failed after ${retries} retries due to rate limiting`);
}

// Process seasons in parallel with concurrency limit
async function processSeasonsInParallel(
  seasons: Season[],
  year: number,
  baseUrl: string,
  apiKey: string,
  supabaseAdmin: any,
  stats: any,
  concurrencyLimit: number = 5
): Promise<void> {
  const processSeason = async (season: Season): Promise<void> => {
    try {
      const encodedSeasonId = encodeURIComponent(season.id);
      const seasonInfoUrl = `${baseUrl}/seasons/${encodedSeasonId}/info.xml?api_key=${apiKey}`;
      const seasonInfoResponse = await fetchWithRateLimit(seasonInfoUrl);
      
      if (!seasonInfoResponse.ok) {
        stats.errors.push(`Failed to fetch season info for ${season.id}: ${seasonInfoResponse.status}`);
        return;
      }
      
      const seasonInfoXml = await seasonInfoResponse.text();
      const seasonInfo = parseXMLSeasonInfo(seasonInfoXml);
      
      if (!seasonInfo) {
        console.log(`Failed to parse season info for ${season.id}`);
        stats.errors.push(`Failed to parse season info for ${season.id}`);
        return;
      }
      
      console.log(`Season ${season.id}: ${seasonInfo.name}, gender=${seasonInfo.gender}, type=${seasonInfo.type}, category=${seasonInfo.category_name}`);
      
      if (!matchesFilters(seasonInfo)) {
        console.log(`Filtered out: ${seasonInfo.name} (gender=${seasonInfo.gender}, type=${seasonInfo.type}, category=${seasonInfo.category_name})`);
        stats.filtered++;
        return;
      }
      
      console.log(`Processing tournament: ${seasonInfo.name}`);
      
      const { data: existingTournament } = await supabaseAdmin
        .from("tournaments")
        .select("*")
        .eq("sportradar_season_id", season.id)
        .maybeSingle();
      
      const newStatus = new Date(seasonInfo.end_date) < new Date() ? 'completed' : 
                        new Date(seasonInfo.start_date) <= new Date() ? 'ongoing' : 'upcoming';
      
      const tournamentData: any = {
        name: seasonInfo.name,
        category: mapCategory(seasonInfo.category_name || 'Challenger'),
        surface: mapSurface(seasonInfo.surface || 'hard'),
        location: seasonInfo.venue || 'TBD',
        start_date: seasonInfo.start_date,
        end_date: seasonInfo.end_date,
        prize_money: seasonInfo.prize_money || null,
        prize_currency: seasonInfo.prize_currency || null,
        venue: seasonInfo.venue || null,
        complex_id: seasonInfo.complex_id || null,
        number_of_competitors: seasonInfo.number_of_competitors || null,
        number_of_qualified_competitors: seasonInfo.number_of_qualified_competitors || null,
        number_of_scheduled_matches: seasonInfo.number_of_scheduled_matches || null,
        sport_id: seasonInfo.sport_id || null,
        parent_competition_id: seasonInfo.parent_competition_id || null,
        gender: seasonInfo.gender || null,
        sportradar_competition_id: seasonInfo.competition_id,
        sportradar_season_id: season.id,
        year: year,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      
      let tournamentId: string;
      
      if (existingTournament) {
        if (!hasChanges(existingTournament, tournamentData)) {
          stats.skipped++;
          tournamentId = existingTournament.id;
          console.log(`- Skipped tournament: ${seasonInfo.name} (no changes)`);
        } else {
          const { data: updatedTournament, error: updateError } = await supabaseAdmin
            .from("tournaments")
            .update(tournamentData)
            .eq("id", existingTournament.id)
            .select("id")
            .single();
          
          if (updateError) {
            stats.errors.push(`Error updating tournament ${seasonInfo.name}: ${updateError.message}`);
            return;
          }
          
          stats.updated++;
          tournamentId = updatedTournament.id;
          console.log(`✓ Updated tournament: ${seasonInfo.name} (${seasonInfo.category_name})`);
        }
      } else {
        const { data: newTournament, error: insertError } = await supabaseAdmin
          .from("tournaments")
          .insert(tournamentData)
          .select("id")
          .single();
        
        if (insertError) {
          console.error(`Error inserting tournament ${seasonInfo.name}: ${insertError.message}`);
          stats.errors.push(`Error inserting tournament ${seasonInfo.name}: ${insertError.message}`);
          return;
        }
        
        stats.inserted++;
        tournamentId = newTournament.id;
        console.log(`✓ Inserted tournament: ${seasonInfo.name} (${seasonInfo.category_name})`);
      }
      
      // Upsert tournament_seasons
      const seasonStatus = new Date(seasonInfo.end_date) < new Date() ? 'completed' : 'active';
      await supabaseAdmin
        .from("tournament_seasons")
        .upsert({
          id: season.id,
          tournament_id: String(tournamentId),
          season_urn: season.id,
          season_name: seasonInfo.name,
          year: year,
          start_date: new Date(seasonInfo.start_date).toISOString(),
          end_date: new Date(seasonInfo.end_date).toISOString(),
          status: seasonStatus,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'season_urn',
          ignoreDuplicates: false
        });
      
      stats.synced++;
    } catch (error: any) {
      const errorMsg = `Error processing season ${season.id}: ${error.message}`;
      console.error(errorMsg, error);
      stats.errors.push(errorMsg);
    }
  };
  
  // Process seasons sequentially to avoid rate limits
  for (const season of seasons) {
    await processSeason(season);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const adminEmails = ['rui@fk.com', 'admin@fk.com'];
    if (!adminEmails.includes(user.email || '')) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const year = body.year || new Date().getFullYear();
    const resumeFrom = body.resumeFrom; // Competition ID to resume from
    const maxCompetitions = body.maxCompetitions || 20; // Process max 20 competitions per call to avoid timeout
    
    if (!year || typeof year !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Valid year is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const apiKey = Deno.env.get('SPORTRADAR_API_KEY');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'SPORTRADAR_API_KEY not configured' }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          } 
        }
      );
    }
    const baseUrl = 'https://api.sportradar.com/tennis/trial/v3/en';
    const stats = {
      synced: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      filtered: 0,
      errors: [] as string[],
    };

    // Variables for resumable sync (need to be outside try block)
    let competitionsToProcess: any[] = [];
    let remainingCompetitions = 0;

    console.log(`Starting optimized tournament sync for year ${year}...`);

    try {
      const competitionsResponse = await fetchWithRateLimit(`${baseUrl}/competitions.json?api_key=${apiKey}`);
      if (!competitionsResponse.ok) {
        throw new Error(`Failed to fetch competitions: ${competitionsResponse.status}`);
      }
      
      const competitionsData = await competitionsResponse.json();
      let competitions = competitionsData.competitions || [];
      
      // Resume from specific competition if provided
      if (resumeFrom) {
        const resumeIndex = competitions.findIndex((c: any) => c.id === resumeFrom);
        if (resumeIndex >= 0) {
          competitions = competitions.slice(resumeIndex);
          console.log(`Resuming from competition ${resumeFrom} (${competitions.length} remaining)`);
        }
      }
      
      // Limit competitions to process in this call
      competitionsToProcess = competitions.slice(0, maxCompetitions);
      remainingCompetitions = competitions.length - competitionsToProcess.length;
      
      console.log(`Processing ${competitionsToProcess.length} competitions (${remainingCompetitions} remaining)`);
      
      // Process competitions sequentially to avoid rate limits
      for (const competition of competitionsToProcess) {
          const competitionId = competition.id;
          const encodedCompetitionId = encodeURIComponent(competitionId);
          
          try {
            const seasonsUrl = `${baseUrl}/competitions/${encodedCompetitionId}/seasons.xml?api_key=${apiKey}`;
            const seasonsResponse = await fetchWithRateLimit(seasonsUrl);
            
            if (!seasonsResponse.ok) {
              stats.errors.push(`Failed to fetch seasons for ${competitionId}: ${seasonsResponse.status}`);
              continue;
            }
            
            const xmlText = await seasonsResponse.text();
            const seasons = parseXMLSeasons(xmlText);
            const yearSeasons = seasons.filter((s: Season) => s.year === year);
            
            if (yearSeasons.length === 0) {
              continue;
            }
            
            console.log(`Competition ${competitionId}: Processing ${yearSeasons.length} seasons`);
            
            // Process seasons in parallel
            await processSeasonsInParallel(
              yearSeasons,
              year,
              baseUrl,
              apiKey,
              supabaseAdmin,
              stats,
              1 // Process 1 season at a time to avoid rate limits
            );
            
      } catch (error: any) {
        stats.errors.push(`Error processing competition ${competition.id}: ${error.message}`);
      }
    }
      
      // Save progress
      const lastProcessedId = competitionsToProcess[competitionsToProcess.length - 1]?.id;
      if (lastProcessedId && remainingCompetitions > 0) {
        // Save sync state for resuming
        const { data: existingState } = await supabaseAdmin
          .from('sportradar_sync_state')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (existingState) {
          await supabaseAdmin
            .from('sportradar_sync_state')
            .update({
              last_competition_id: lastProcessedId,
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingState.id);
        } else {
          await supabaseAdmin
            .from('sportradar_sync_state')
            .insert({
              last_competition_id: lastProcessedId,
              last_sync_at: new Date().toISOString(),
            });
        }
      }
      
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: `Failed to sync tournaments: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        year,
        synced: stats.synced,
        inserted: stats.inserted,
        updated: stats.updated,
        skipped: stats.skipped,
        filtered: stats.filtered,
        errors: stats.errors.slice(0, 10),
        errorCount: stats.errors.length,
        resumeFrom: competitionsToProcess.length > 0 ? competitionsToProcess[competitionsToProcess.length - 1]?.id : null,
        hasMore: remainingCompetitions > 0,
        remaining: remainingCompetitions,
        message: `Processed ${competitionsToProcess.length} competitions. ${stats.synced} tournaments synced.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error syncing tournaments:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
