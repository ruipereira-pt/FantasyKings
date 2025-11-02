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
    let saveToCache: (endpoint: string, data: any) => Promise<void>;
    try {
      const cacheModule = await import('../_shared/sportradar-cache.ts');
      saveToCache = cacheModule.saveToCache;
    } catch {
      saveToCache = async () => {};
    }

    // Get last fetched competition ID from sync state
    const { data: syncState } = await supabaseAdmin
      .from('sportradar_sync_state')
      .select('last_competition_id')
      .limit(1)
      .single();

    const lastCompetitionId = syncState?.last_competition_id || null;
    console.log(`Last fetched competition ID: ${lastCompetitionId || 'none'}`);

    // Step 1: GET Competitions (we'll filter in code for type="singles", gender="men")
    console.log('Step 1: Fetching competitions...');
    const competitionsEndpoint = '/competitions.json';
    const competitionsResponse = await fetch(
      `https://api.sportradar.com/tennis/trial/v3/en${competitionsEndpoint}?api_key=${apiKey}`
    );

    if (!competitionsResponse.ok) {
      if (competitionsResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again later.',
            status: competitionsResponse.status
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Failed to fetch competitions: ${competitionsResponse.status}`);
    }

    const competitionsData = await competitionsResponse.json();
    
    // Save raw response
    await saveToCache(competitionsEndpoint, competitionsData);
    console.log(`Found ${competitionsData.competitions?.length || 0} competitions`);

    if (!competitionsData.competitions || !Array.isArray(competitionsData.competitions)) {
      throw new Error('No competitions found in API response');
    }

    // Filter competitions by type="singles" and gender="men"
    const filteredCompetitions = competitionsData.competitions.filter((comp: Competition) => {
      const isSingles = !comp.name?.toLowerCase().includes('doubles');
      const isMen = comp.gender?.toLowerCase() === 'men' || comp.gender?.toLowerCase() === 'male';
      return isSingles && isMen;
    });

    console.log(`Filtered to ${filteredCompetitions.length} singles men's competitions`);

    // Filter to only process competitions after the last one (if exists)
    let competitionsToProcess = filteredCompetitions;
    if (lastCompetitionId) {
      const lastIndex = filteredCompetitions.findIndex((c: Competition) => c.id === lastCompetitionId);
      if (lastIndex >= 0) {
        competitionsToProcess = filteredCompetitions.slice(lastIndex + 1);
        console.log(`Processing ${competitionsToProcess.length} new competitions (skipped ${lastIndex + 1} already processed)`);
      }
    }

    let processedCount = 0;
    let tournamentsCreated = 0;
    let playersUpdated = 0;
    let lastProcessedId: string | null = null;

    // Step 2: For each competition, GET Competition Seasons (year=2025, 2026)
    for (const competition of competitionsToProcess) {
      try {
        console.log(`Processing competition: ${competition.name} (${competition.id})`);
        
        // Add rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // GET Competition Seasons
        const seasonsEndpoint = `/competitions/${competition.id}/seasons.json`;
        const seasonsResponse = await fetch(
          `https://api.sportradar.com/tennis/trial/v3/en${seasonsEndpoint}?api_key=${apiKey}&locale=en`
        );

        if (!seasonsResponse.ok) {
          if (seasonsResponse.status === 429) {
            console.log(`Rate limited, waiting longer...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
            continue;
          }
          console.log(`Skipping ${competition.name}: Failed to fetch seasons (${seasonsResponse.status})`);
          continue;
        }

        const seasonsData = await seasonsResponse.json();
        await saveToCache(seasonsEndpoint, seasonsData);

        if (!seasonsData.seasons || !Array.isArray(seasonsData.seasons)) {
          console.log(`No seasons found for ${competition.name}`);
          continue;
        }

        // Filter seasons for years 2025 and 2026
        const targetSeasons = seasonsData.seasons.filter((s: Season) => 
          s.year === 2025 || s.year === 2026
        );

        if (targetSeasons.length === 0) {
          console.log(`No seasons for 2025/2026 found for ${competition.name}`);
          continue;
        }

        // Step 3: For each season, GET Season Info
        for (const season of targetSeasons) {
          try {
            console.log(`  Processing season: ${season.name} (${season.id}, ${season.year})`);
            
            await new Promise(resolve => setTimeout(resolve, 2000));

            const seasonInfoEndpoint = `/seasons/${season.id}/info.json`;
            const seasonInfoResponse = await fetch(
              `https://api.sportradar.com/tennis/trial/v3/en${seasonInfoEndpoint}?api_key=${apiKey}`
            );

            if (!seasonInfoResponse.ok) {
              if (seasonInfoResponse.status === 429) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                continue;
              }
              console.log(`    Skipping season ${season.id}: Failed to fetch info (${seasonInfoResponse.status})`);
              continue;
            }

            const seasonInfo: SeasonInfo = await seasonInfoResponse.json();
            await saveToCache(seasonInfoEndpoint, seasonInfo);

            // Extract venue from complex
            const venue = seasonInfo.complex 
              ? `${seasonInfo.complex.name}${seasonInfo.complex.city ? `, ${seasonInfo.complex.city.name}` : ''}`
              : null;

            // Store/update tournament record
            const tournamentData = {
              name: seasonInfo.name || competition.name,
              category: mapCategoryFromCompetition(competition),
              surface: seasonInfo.surface?.toLowerCase() || null,
              location: venue,
              start_date: seasonInfo.start_date,
              end_date: seasonInfo.end_date,
              prize_money: seasonInfo.prize_money || null,
              sportradar_competition_id: competition.id,
              sportradar_season_id: season.id,
              year: season.year,
              status: new Date(seasonInfo.end_date) < new Date() ? 'completed' : 
                     new Date(seasonInfo.start_date) <= new Date() ? 'ongoing' : 'upcoming',
            };

            const { data: tournament, error: tournamentError } = await supabaseAdmin
              .from('tournaments')
              .upsert(tournamentData, {
                onConflict: 'sportradar_season_id',
                ignoreDuplicates: false
              })
              .select()
              .single();

            if (tournamentError) {
              console.error(`Error upserting tournament:`, tournamentError);
              continue;
            }

            if (tournament) {
              tournamentsCreated++;
              console.log(`    ✓ Tournament created/updated: ${tournament.name}`);
            }

            // Step 4: Update player schedules from stages (qualification and main draw)
            if (seasonInfo.stages && Array.isArray(seasonInfo.stages)) {
              for (const stage of seasonInfo.stages) {
                const stageType = stage.type?.toLowerCase() || '';
                const isQualification = stageType.includes('qualification') || stageType.includes('qualifying');
                const isMainDraw = stageType.includes('main') || stageType.includes('singles');
                
                if (!isQualification && !isMainDraw) continue;

                const status = isQualification ? 'qualifying' : 'confirmed';
                
                if (stage.competitors && Array.isArray(stage.competitors)) {
                  for (const competitorEntry of stage.competitors) {
                    const competitor = competitorEntry.competitor;
                    if (!competitor || !competitor.id || !competitor.name) continue;

                    try {
                      // Find or create player
                      const { data: existingPlayer } = await supabaseAdmin
                        .from('players')
                        .select('id')
                        .eq('sportradar_competitor_id', competitor.id)
                        .maybeSingle();

                      let playerId: string;
                      
                      if (existingPlayer) {
                        playerId = existingPlayer.id;
                      } else {
                        // Create player if doesn't exist
                        const { data: newPlayer, error: playerError } = await supabaseAdmin
                          .from('players')
                          .insert({
                            name: competitor.name,
                            country: competitor.country_code || null,
                            sportradar_competitor_id: competitor.id,
                            ranking: null,
                            live_ranking: null,
                            points: 0,
                            price: 2, // Default price
                          })
                          .select()
                          .single();

                        if (playerError) {
                          console.error(`Error creating player ${competitor.name}:`, playerError);
                          continue;
                        }
                        playerId = newPlayer.id;
                      }

                      // Upsert player schedule
                      const { error: scheduleError } = await supabaseAdmin
                        .from('player_schedules')
                        .upsert({
                          player_id: playerId,
                          tournament_id: tournament.id,
                          status: status as any,
                          entry_type: isQualification ? 'qualifying' : 'main_draw',
                        }, {
                          onConflict: 'player_id,tournament_id'
                        });

                      if (!scheduleError) {
                        playersUpdated++;
                      }
                    } catch (error) {
                      console.error(`Error processing competitor ${competitor.name}:`, error);
                    }
                  }
                }
              }
            }

            lastProcessedId = competition.id;
          } catch (error) {
            console.error(`Error processing season ${season.id}:`, error);
          }
        }

        processedCount++;
      } catch (error) {
        console.error(`Error processing competition ${competition.id}:`, error);
      }
    }

    // Update sync state
    if (lastProcessedId) {
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

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        tournaments_created: tournamentsCreated,
        players_updated: playersUpdated,
        last_competition_id: lastProcessedId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
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

