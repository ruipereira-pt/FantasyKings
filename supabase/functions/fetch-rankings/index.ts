/**
 * Fetches ATP rankings from ATP Official API or Web Scraper and updates the players table
 * 
 * Called by:
 *   - initializeData.ts
 *   - api.ts (refreshRankings)
 *   - PlayerManagement.tsx
 * 
 * Method: POST
 * Authentication: Required (admin only)
 * 
 * Environment Variables Required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { load } from "npm:cheerio@1.0.0";
import { players as fallbackPlayerData } from "./players-data.ts";

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
}

function calculatePrice(ranking: number, points: number = 0): number {
  // Price based on points with normalized logarithmic distribution
  // Maximum price: 15 coins, Minimum: 1 coin
  // Formula: P = P_min + (P_max - P_min) × (log(p + 1) - log(p_min + 1)) / (log(p_max + 1) - log(p_min + 1))
  // This creates a larger gap between top players while ensuring fair distribution
  
  const P_min = 1; // Minimum price (coins)
  const P_max = 15; // Maximum price (coins)
  const p_min = 100; // Minimum meaningful points for scaling
  const p_max = 12050; // Maximum points (approximate for #1 player)
  
  if (!points || points <= 0) {
    // Fallback to ranking-based if no points available
    if (!ranking || ranking <= 0) {
      return P_min;
    }
    const basePrice = P_max;
    const maxRank = 200;
    const calculated = Math.round(
      basePrice * ((Math.log(maxRank + 1) - Math.log(ranking + 1)) / Math.log(maxRank + 1))
    );
    return Math.max(P_min, calculated);
  }
  
  // Normalized logarithmic formula for points-based calculation
  // This ensures larger gaps between top players
  const logP = Math.log(points + 1);
  const logPMin = Math.log(p_min + 1);
  const logPMax = Math.log(p_max + 1);
  
  // Normalize: (log(p_i + 1) - log(p_min + 1)) / (log(p_max + 1) - log(p_min + 1))
  const normalized = (logP - logPMin) / (logPMax - logPMin);
  
  // Scale to price range: P_min + (P_max - P_min) × normalized
  const calculated = P_min + (P_max - P_min) * normalized;
  
  return Math.max(P_min, Math.min(P_max, Math.round(calculated)));
}

/**
 * Create a simple search key for matching: lowercase name + country
 */
function createMatchKey(name: string, country: string): string {
  return `${name.toLowerCase().trim()}|${country.toUpperCase().trim()}`;
}

/**
 * Extract last name from player name (handles "First Last", "F. Last", "First Middle Last", etc.)
 */
function extractLastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  // Last name is typically the last part, but handle "de", "van", "von" prefixes
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    const secondLast = parts.length > 2 ? parts[parts.length - 2] : '';
    // If second-to-last is a prefix, include it
    if (['de', 'van', 'von', 'del', 'da', 'di'].includes(secondLast.toLowerCase())) {
      return `${secondLast} ${lastPart}`.toLowerCase();
    }
    return lastPart.toLowerCase();
  }
  return name.toLowerCase();
}


async function fetchATPRankings(): Promise<PlayerData[]> {
  try {
    // Try ATP official API first
    console.log('Fetching from ATP official API...');
    const apiData = await fetchATPOfficialAPI();
    if (apiData.length > 0) {
      console.log(`✓ Successfully fetched ${apiData.length} players from ATP Official API`);
      return apiData;
    }
    
    // Fallback to web scraper only if API fails
    console.log('ATP API returned no data, trying web scraper...');
    return await fetchATPRankingsFromWeb();
    
  } catch (error) {
    console.error('Error fetching from ATP API:', error);
    console.log('Falling back to web scraper...');
    return await fetchATPRankingsFromWeb();
  }
}

async function fetchATPOfficialAPI(): Promise<PlayerData[]> {
  try {
    const response = await fetch('https://www.atptour.com/-/api/rankings/rankingsData', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; FantasyTennis/1.0)',
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.rankings && Array.isArray(data.rankings) && data.rankings.length > 0) {
        console.log(`ATP API returned ${data.rankings.length} players`);
        
        // Map the data
        const players: PlayerData[] = data.rankings.map((player: any) => {
          // Clean name
          const name = (player.playerName || player.name || '').trim();
          
          // Ensure country code is uppercase and valid
          let countryCode = (player.countryCode || player.country || 'UNK').toUpperCase().trim();
          if (countryCode.length !== 3) {
            countryCode = 'UNK';
          }
          
          return {
            ranking: parseInt(player.rank || player.ranking || '0', 10),
            name: name,
            country: countryCode,
            points: parseInt(player.points || '0', 10),
          };
        }).filter((p: PlayerData) => p.ranking > 0 && p.name.length > 0);
        
        return players;
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching from ATP Official API:', error);
    return [];
  }
}

async function scrapeRankingsPage(startRank: number = 1, endRank: number = 100): Promise<PlayerData[]> {
  const url = `https://www.atptour.com/en/rankings/singles?rankRange=${startRank}-${endRank}`;
  
  console.log(`Scraping rankings ${startRank}-${endRank}...`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limited. Please wait before trying again.');
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
const rankings: PlayerData[] = [];
    const rankingsByRank = new Map<number, PlayerData>(); // Deduplicate by rank

    const rows = $('.mega-table tbody tr, .rankings-table tbody tr, table.rankings tbody tr').toArray();

    if (rows.length === 0) {
      console.warn(`No rows found for range ${startRank}-${endRank}. Page structure may have changed.`);
      return [];
    }

    for (const row of rows) {
      try {
        const cells = $(row).find('td').toArray();
        
        if (cells.length < 4) continue;

        // Extract rank
        const rankText = $(cells[0]).text().trim();
        const rank = parseInt(rankText.replace(/[^\d]/g, ''), 10);
        if (!rank || rank < 1) continue;

        // Extract player name
        const nameLink = $(cells[1] || cells[2]).find('a').first();
        let name = nameLink.text().trim() || $(cells[1] || cells[2]).text().trim();
        if (!name) continue;
        name = name.trim();

        // Extract country - try multiple methods
        let country = 'UNK';
        
        // Method 1: Look for avatar element with flag (ATP site uses avatar tags)
        const avatarElement = $(cells[1] || cells[2]).find('avatar, [class*="avatar"], [class*="Avatar"]').first();
        if (avatarElement.length > 0) {
          // Check for flag image inside avatar
          const flagImg = avatarElement.find('img').first();
          if (flagImg.length > 0) {
            // Try alt text, title, or src URL for country code
            const altText = flagImg.attr('alt') || flagImg.attr('title') || '';
            const srcUrl = flagImg.attr('src') || '';
            
            // Extract 3-letter country code from alt/title (e.g., "ESP", "USA")
            const altMatch = altText.match(/\b([A-Z]{3})\b/);
            if (altMatch) {
              country = altMatch[1];
            } else {
              // Try extracting from src URL (e.g., "/flags/esp.png" or "flag-esp")
              const urlMatch = srcUrl.match(/([a-z]{3})/i);
              if (urlMatch) {
                country = urlMatch[1].toUpperCase();
              }
            }
          }
          
          // 
          // Check for SVG use element with href (e.g., href="/assets/atptour/assets/flags.svg#flag-ita")
          if (country === 'UNK') {
            const svgUse = avatarElement.find('use').first();
            if (svgUse.length > 0) {
              const href = svgUse.attr('href') || svgUse.attr('xlink:href') || '';
              const svgMatch = href.match(/#flag-([a-z]{3})/i);
              if (svgMatch) {
                country = svgMatch[1].toUpperCase();
              }
            }
          }
          
          // Also check for SVG href anywhere in the avatar element
          if (country === 'UNK') {
            const svgHref = avatarElement.find('[href*="#flag-"], [xlink\:href*="#flag-"]').first();
            if (svgHref.length > 0) {
              const href = svgHref.attr('href') || svgHref.attr('xlink:href') || '';
              const svgMatch = href.match(/#flag-([a-z]{3})/i);
              if (svgMatch) {
                country = svgMatch[1].toUpperCase();
              }
            }
          }
          
          // Also check data attributes on avatar
          if (country === 'UNK') {
            country = avatarElement.attr('data-country') || 
                     avatarElement.attr('data-country-code') ||
                     avatarElement.attr('title')?.substring(0, 3).toUpperCase() || 
                     'UNK';
          }
        }
        
        // Method 1.5: Check for SVG href with #flag-XXX pattern (ATP site format)
        if (country === 'UNK') {
          const svgUse = $(cells[1] || cells[2]).find('use[href*="#flag-"], use[xlink\:href*="#flag-"]').first();
          if (svgUse.length > 0) {
            const href = svgUse.attr('href') || svgUse.attr('xlink:href') || '';
            const svgMatch = href.match(/#flag-([a-z]{3})/i);
            if (svgMatch) {
              country = svgMatch[1].toUpperCase();
            }
          }
        }
        
        // Also check any element with href containing #flag-
        if (country === 'UNK') {
          const hrefElement = $(cells[1] || cells[2]).find('[href*="#flag-"], [xlink\:href*="#flag-"]').first();
          if (hrefElement.length > 0) {
            const href = hrefElement.attr('href') || hrefElement.attr('xlink:href') || '';
            const svgMatch = href.match(/#flag-([a-z]{3})/i);
            if (svgMatch) {
              country = svgMatch[1].toUpperCase();
            }
          }
        }
        

        // Method 2: Look for country code in data attributes
        if (country === 'UNK') {
          const countryElement = $(cells[1] || cells[2]).find('[data-country], [data-country-code], .player-flag-code, .country-code').first();
          if (countryElement.length > 0) {
            country = countryElement.attr('data-country') || 
                     countryElement.attr('data-country-code') ||
                     countryElement.text().trim() || 
                     countryElement.attr('title')?.substring(0, 3).toUpperCase() || 
                     'UNK';
          }
        }
        
        // Method 3: Look for flag image alt text or title (anywhere in cell)
        if (country === 'UNK') {
          const flagImg = $(cells[1] || cells[2]).find('img[alt*="flag"], img[title*="flag"], img[src*="flag"]').first();
          if (flagImg.length > 0) {
            const altText = flagImg.attr('alt') || flagImg.attr('title') || '';
            const srcUrl = flagImg.attr('src') || '';
            const countryMatch = altText.match(/\b([A-Z]{3})\b/);
            if (countryMatch) {
              country = countryMatch[1];
            } else {
              // Try extracting from src URL (e.g., "/flags/esp.png" or "flag-esp")
              const urlMatch = srcUrl.match(/([a-z]{3})/i);
              if (urlMatch) {
                country = urlMatch[1].toUpperCase();
              }
            }
          }
        }
        
        // Method 4: Extract from class names (some sites use country codes in classes)
        if (country === 'UNK') {
          const cellClasses = $(cells[1] || cells[2]).attr('class') || '';
          const classMatch = cellClasses.match(/\b([A-Z]{3})\b/);
          if (classMatch) {
            country = classMatch[1];
          }
        }
        // Ensure country is uppercase and 3 characters
        country = country.toUpperCase().trim();
        if (country.length !== 3) {
          country = 'UNK';
        }

        // Extract points
        const pointsText = $(cells[3] || cells[4]).text().trim().replace(/,/g, '');
        const points = parseInt(pointsText, 10) || 0;

        // Check if we already have a player with this rank
        // If yes, prefer the one with a longer name (full name over initial)
        const existing = rankingsByRank.get(rank);
        if (existing) {
          // Keep the one with longer name (full name is usually better)
          if (name.length > existing.name.length) {
            rankingsByRank.set(rank, {
              ranking: rank,
              name,
              country,
              points,
            });
          }
          // Otherwise keep existing (skip this duplicate)
        } else {
          rankingsByRank.set(rank, {
          ranking: rank,
          name,
          country,
          points,
        });
        }
      } catch (error) {
        console.warn(`Error parsing row: ${error}`);
        continue;
      }
    }

    // Convert map to array
    for (const player of rankingsByRank.values()) {
      rankings.push(player);
    }
    
    
    console.log(`  ✓ Found ${rankings.length} players in range ${startRank}-${endRank}`);
    return rankings;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Timeout scraping ${url}`);
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error scraping ${url}:`, errorMessage);
    }
    return [];
  }
}

async function scrapeAllRankings(maxRank: number = 500): Promise<PlayerData[]> {
    const pageResults: PlayerData[] = [];
    
    const ranges: Array<[number, number]> = [];
    
    for (let start = 1; start <= maxRank; start += 100) {
      const end = Math.min(start + 99, maxRank);
      ranges.push([start, end]);
    }
    for (const [start, end] of ranges) {
      const rankings = await scrapeRankingsPage(start, end);
      pageResults.push(...rankings);
      
      const currentIndex = ranges.findIndex(([s, e]) => s === start && e === end);
      if (currentIndex < ranges.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Deduplicate by rank when combining results from multiple pages
    const allRankingsByRank = new Map<number, PlayerData>();
    for (const player of pageResults) {
      const existing = allRankingsByRank.get(player.ranking);
      if (existing) {
        // Keep the one with longer name (full name over initial)
        if (player.name.length > existing.name.length) {
          allRankingsByRank.set(player.ranking, player);
        }
      } else {
        allRankingsByRank.set(player.ranking, player);
      }
    }
    
    // Convert back to array
    const allRankings = Array.from(allRankingsByRank.values());
  return allRankings.sort((a, b) => a.ranking - b.ranking);
}

async function fetchATPRankingsFromWeb(): Promise<PlayerData[]> {
  try {
    console.log('Scraping ATP rankings from website using Cheerio...');
    
    const players = await scrapeAllRankings(500);
    
    if (players.length === 0) {
      console.warn('No rankings scraped. The website structure may have changed.');
      console.log('Using fallback static data...');
      return fallbackPlayerData;
    }

    console.log(`Successfully scraped ${players.length} players from ATP website`);
    return players;

  } catch (error) {
    console.error('Error scraping ATP website:', error);
    console.log('Using fallback static data...');
    return fallbackPlayerData;
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

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    console.log(`Starting ATP rankings update by admin: ${user.email}...`);
    const players = await fetchATPRankings();
    console.log(`Fetched ${players.length} players from ATP sources`);

    // Deduplicate incoming players by name + country (keep best ranking)
    // Also check by last name + country to catch variations like "Alex de Minaur" vs "A. de Minaur"
    const uniquePlayers = new Map<string, PlayerData>();
    const uniqueByLastName = new Map<string, PlayerData>();
    
    for (const player of players) {
      const matchKey = createMatchKey(player.name, player.country);
      const lastName = extractLastName(player.name);
      const lastNameKey = `${lastName}|${player.country}`.toUpperCase();
      
      // Check exact match first
      if (uniquePlayers.has(matchKey)) {
        const existing = uniquePlayers.get(matchKey);
        if (existing && player.ranking < existing.ranking) {
          uniquePlayers.set(matchKey, player);
          uniqueByLastName.set(lastNameKey, player);
        }
        continue;
      }
      
      // Check fuzzy match by last name
      if (uniqueByLastName.has(lastNameKey)) {
        const existing = uniqueByLastName.get(lastNameKey);
        if (existing && player.ranking < existing.ranking) {
          // Replace the existing entry
          const oldMatchKey = createMatchKey(existing.name, existing.country);
          uniquePlayers.delete(oldMatchKey);
          uniquePlayers.set(matchKey, player);
          uniqueByLastName.set(lastNameKey, player);
          console.log(`Deduplicated: "${existing.name}" and "${player.name}" (same last name + country)`);
        }
        continue;
      }
      
      // New unique player
      uniquePlayers.set(matchKey, player);
      uniqueByLastName.set(lastNameKey, player);
    }
    
    const deduplicatedPlayers = Array.from(uniquePlayers.values());
    console.log(`Deduplicated ${players.length} players to ${deduplicatedPlayers.length} unique players`);

    // Fetch all existing players for matching
    const { data: allExistingPlayers, error: fetchError } = await supabaseAdmin
      .from("players")
      .select("id, name, country, ranking, price");
    
    if (fetchError) {
      console.error("Error fetching existing players:", fetchError);
      throw new Error("Failed to fetch existing players for matching.");
    }
    
    // Create lookup map: name+country -> player
    const existingPlayersMap = new Map<string, any>();

    // Also create a map by last name + country for fuzzy matching
    const existingPlayersByLastName = new Map<string, any>();
    
    // Process all existing players to build lookup maps
    for (const p of allExistingPlayers || []) {
      const matchKey = createMatchKey(p.name, p.country || 'UNK');
      // Keep first match found (should be unique anyway)
      if (!existingPlayersMap.has(matchKey)) {
        existingPlayersMap.set(matchKey, p);
      }
      
      const lastName = extractLastName(p.name);
      const lastNameKey = `${lastName}|${p.country || 'UNK'}`.toUpperCase();
      // Keep first match found
      if (!existingPlayersByLastName.has(lastNameKey)) {
        existingPlayersByLastName.set(lastNameKey, p);
      }
    }
    
    console.log(`Loaded ${(allExistingPlayers || []).length} existing players for matching`);

    let insertedCount = 0;
    let updatedCount = 0;
    const processedMatchKeys = new Set<string>();

    // Process each player using upsert (single method)
    for (const player of deduplicatedPlayers) {
      const matchKey = createMatchKey(player.name, player.country);
      processedMatchKeys.add(matchKey);
      
      // Try exact match first
      let existingPlayer = existingPlayersMap.get(matchKey);
      
      // If no exact match, try fuzzy match by last name + country
      if (!existingPlayer) {
        const lastName = extractLastName(player.name);
        const lastNameKey = `${lastName}|${player.country}`.toUpperCase();
        const fuzzyMatch = existingPlayersByLastName.get(lastNameKey);
        if (fuzzyMatch) {
          // Verify it's the same player (same country and similar ranking)
          const rankingDiff = Math.abs((fuzzyMatch.ranking || 999) - player.ranking);
          if (rankingDiff <= 5) { // Allow small ranking difference
            existingPlayer = fuzzyMatch;
            console.log(`Fuzzy matched "${player.name}" to existing player "${fuzzyMatch.name}" (last name + country)`);
          }
        }
      }
      const newPrice = calculatePrice(player.ranking, player.points);
      
      if (existingPlayer) {
        // Update existing player - trigger will save price history
        const { error } = await supabaseAdmin
          .from("players")
          .update({
            name: player.name,
            country: player.country,
            live_ranking: player.ranking,
            ranking: player.ranking,
            points: player.points,
            price: newPrice,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPlayer.id);

        if (error) {
          console.error(`Error updating player ${player.name}:`, error);
        } else {
          updatedCount++;
          console.log(`Updated player ${player.name} (ranking: ${player.ranking}, price: ${newPrice})`);
        }
      } else {
        // Insert new player
        const { error } = await supabaseAdmin
          .from("players")
          .insert({
            name: player.name,
            country: player.country,
            live_ranking: player.ranking,
            ranking: player.ranking,
            points: player.points,
            price: newPrice,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) {
          // Handle duplicate name error (23505)
          if (error.code === '23505' && error.message?.includes('idx_players_name_unique')) {
            console.log(`Player "${player.name}" already exists, checking for updates...`);
            
            // Fetch the existing player by name
            const { data: existingPlayerData, error: fetchError } = await supabaseAdmin
              .from("players")
              .select("id, name, country, ranking, live_ranking, points, price")
              .eq("name", player.name)
              .single();
            
            if (fetchError || !existingPlayerData) {
              console.error(`Error fetching existing player ${player.name}:`, fetchError);
            } else {
              // Check if there are differences that need updating
              const needsUpdate = 
                existingPlayerData.ranking !== player.ranking ||
                existingPlayerData.live_ranking !== player.ranking ||
                existingPlayerData.points !== player.points ||
                existingPlayerData.country !== player.country ||
                existingPlayerData.price !== newPrice;
              
              if (needsUpdate) {
                // Update the existing player
                const { error: updateError } = await supabaseAdmin
                  .from("players")
                  .update({
                    country: player.country,
                    live_ranking: player.ranking,
                    ranking: player.ranking,
                    points: player.points,
                    price: newPrice,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", existingPlayerData.id);
                
                if (updateError) {
                  console.error(`Error updating existing player ${player.name}:`, updateError);
                } else {
                  updatedCount++;
                  console.log(`Updated existing player ${player.name} (ranking: ${player.ranking}, price: ${newPrice})`);
                }
              } else {
                console.log(`Player ${player.name} already up to date, skipping.`);
              }
            }
          } else {
            console.error(`Error inserting player ${player.name}:`, error);
          }
        } else {
          insertedCount++;
          console.log(`Inserted new player ${player.name} (ranking: ${player.ranking}, price: ${newPrice})`);
        }
      }
    }

    // Set ranking to 500+ for players not in the new rankings
    const defaultRanking = 500;
    const defaultPrice = calculatePrice(defaultRanking, 0);
    
    if (allExistingPlayers) {
      for (const existingPlayer of allExistingPlayers) {
        const matchKey = createMatchKey(existingPlayer.name, existingPlayer.country || 'UNK');
        
        if (!processedMatchKeys.has(matchKey)) {
          // Player not in new rankings - set to default ranking
          if (existingPlayer.ranking && existingPlayer.ranking < defaultRanking) {
            const { error } = await supabaseAdmin
              .from("players")
              .update({
                ranking: defaultRanking,
                live_ranking: defaultRanking,
                points: 0,
                price: defaultPrice,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingPlayer.id);

            if (error) {
              console.error(`Error updating unranked player ${existingPlayer.name}:`, error);
            } else {
              console.log(`Set ranking to ${defaultRanking} for player ${existingPlayer.name} (not in new rankings)`);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        updated: updatedCount,
        totalProcessed: deduplicatedPlayers.length,
        message: `Successfully synced ${insertedCount} new and updated ${updatedCount} player rankings.`,
        sample: deduplicatedPlayers.slice(0, 10).map(p => ({ ...p, price: calculatePrice(p.ranking, p.points) }))
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    // Log detailed error server-side for debugging
    console.error("Error fetching rankings:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    
    // Return generic error message to client
    return new Response(
      JSON.stringify({ error: 'An internal server error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
