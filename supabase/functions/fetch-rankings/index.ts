import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { players as fallbackPlayerData } from "./players-data.ts";
import { createSportradarService } from "./sportradar-service.ts";

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

function calculatePrice(ranking: number): number {
  const basePrice = 20;
  const maxRank = 200;
  const calculated = Math.round(
    basePrice * ((Math.log(maxRank + 1) - Math.log(ranking + 1)) / Math.log(maxRank + 1))
  );
  return Math.max(2, calculated);
}

async function fetchATPRankings(): Promise<PlayerData[]> {
  try {
    // Try Sportradar API first (most reliable)
    console.log('Fetching from Sportradar API...');
    const sportradarData = await fetchSportradarRankings();
    if (sportradarData.length > 0) {
      return sportradarData;
    }
    
    console.log('Sportradar API failed, trying ATP official API...');
    return await fetchATPOfficialAPI();
    
  } catch (error) {
    console.error('Error fetching from Sportradar API:', error);
    console.log('Falling back to ATP official API...');
    return await fetchATPOfficialAPI();
  }
}

async function fetchSportradarRankings(): Promise<PlayerData[]> {
  try {
    const sportradarService = createSportradarService();
    if (!sportradarService) {
      console.log('Sportradar service not available, skipping...');
      return [];
    }

    const rankings = await sportradarService.getATPRankings();
    if (rankings.length > 0) {
      console.log(`Successfully fetched ${rankings.length} players from Sportradar API`);
      return rankings;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching from Sportradar API:', error);
    return [];
  }
}

async function fetchATPOfficialAPI(): Promise<PlayerData[]> {
  try {
    // Try ATP official API as fallback
    console.log('Fetching from ATP official API...');
    
    const response = await fetch('https://www.atptour.com/-/api/rankings/rankingsData', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; FantasyTennis/1.0)',
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.rankings && data.rankings.length > 0) {
        console.log(`Successfully fetched ${data.rankings.length} players from ATP API`);
        return data.rankings.map((player: any) => ({
          ranking: player.rank,
          name: player.playerName,
          country: player.countryCode,
          points: player.points || 0,
        }));
      }
    }
    
    console.log('ATP API failed, trying web scraping...');
    return await fetchATPRankingsFromWeb();
    
  } catch (error) {
    console.error('Error fetching from ATP API:', error);
    console.log('Falling back to web scraping...');
    return await fetchATPRankingsFromWeb();
  }
}

async function fetchATPRankingsFromWeb(): Promise<PlayerData[]> {
  try {
    // Scrape ATP rankings page
    const response = await fetch('https://www.atptour.com/en/rankings/singles', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FantasyTennis/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const players: PlayerData[] = [];

    // Parse the HTML to extract rankings
    // This regex looks for the ranking data in the ATP page structure
    const rankingRegex = /<tr[^>]*class="[^"]*mega-table-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
    let match;

    while ((match = rankingRegex.exec(html)) !== null) {
      const rowHtml = match[1];
      
      // Extract ranking number
      const rankMatch = rowHtml.match(/<td[^>]*class="[^"]*rank[^"]*"[^>]*>(\d+)<\/td>/i);
      // Extract player name
      const nameMatch = rowHtml.match(/<td[^>]*class="[^"]*player-cell[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
      // Extract country
      const countryMatch = rowHtml.match(/<td[^>]*class="[^"]*country[^"]*"[^>]*>[\s\S]*?<span[^>]*>([A-Z]{3})<\/span>/i);
      // Extract points
      const pointsMatch = rowHtml.match(/<td[^>]*class="[^"]*points[^"]*"[^>]*>([\d,]+)<\/td>/i);

      if (rankMatch && nameMatch) {
        const ranking = parseInt(rankMatch[1]);
        const name = nameMatch[1].trim();
        const country = countryMatch ? countryMatch[1] : 'UNK';
        const points = pointsMatch ? parseInt(pointsMatch[1].replace(/,/g, '')) : 0;

        players.push({
          ranking,
          name,
          country,
          points,
        });
      }
    }

    console.log(`Successfully scraped ${players.length} players from ATP website`);
    return players.slice(0, 200); // Limit to top 200

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

    // Check if user is admin (you can customize this logic)
    const adminEmails = ['rui@fk.com', 'admin@fk.com']; // Add your admin emails here
    if (!adminEmails.includes(user.email || '')) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for database operations
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    console.log(`Starting ATP rankings update by admin: ${user.email}...`);
    const players = await fetchATPRankings();
    console.log(`Fetched ${players.length} players from ATP sources`);

    for (const player of players) {
      const price = calculatePrice(player.ranking);
      const { error } = await supabaseAdmin
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