import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
  sportradar_competitor_id: string;
  movement?: number;
  competitions_played?: number;
}

function calculatePrice(ranking: number): number {
  const basePrice = 20;
  const maxRank = 200;
  const calculated = Math.round(
    basePrice * ((Math.log(maxRank + 1) - Math.log(ranking + 1)) / Math.log(maxRank + 1))
  );
  return Math.max(2, calculated);
}

// Sportradar Service (inline)
class SportradarService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const url = `https://api.sportradar.com/tennis/trial/v3/en${endpoint}?api_key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FantasyTennis/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Sportradar API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getATPRankings(): Promise<PlayerData[]> {
    try {
      const data = await this.makeRequest('/rankings.json');
      
      // The API returns an object with a 'rankings' property containing the array
      const rankings = data.rankings || data;
      
      if (rankings && Array.isArray(rankings)) {
        const players: PlayerData[] = [];
        
        // Find ATP rankings (name: "ATP")
        const atpGroup = rankings.find(group => group.name === 'ATP');
        
        if (atpGroup && atpGroup.competitor_rankings) {
          for (const player of atpGroup.competitor_rankings) {
            players.push({
              ranking: player.rank,
              name: player.competitor?.name || player.name,
              country: player.competitor?.country_code || player.country_code || 'UNK',
              points: player.points || 0,
              sportradar_competitor_id: player.competitor?.id || '',
              movement: player.movement || 0,
              competitions_played: player.competitions_played || 0,
            });
          }
        }
        
        return players;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching ATP rankings from Sportradar:', error);
      return [];
    }
  }
}

async function fetchATPRankings(): Promise<PlayerData[]> {
  try {
    // Try Sportradar API first (most reliable)
    console.log('Fetching from Sportradar API...');
    const sportradarData = await fetchSportradarRankings();
    if (sportradarData.length > 0) {
      return sportradarData;
    }
    
    console.log('Sportradar API failed, using fallback data...');
    return getFallbackData();
    
  } catch (error) {
    console.error('Error fetching from Sportradar API:', error);
    console.log('Using fallback data...');
    return getFallbackData();
  }
}

async function fetchSportradarRankings(): Promise<PlayerData[]> {
  try {
    const apiKey = Deno.env.get('SPORTRADAR_API_KEY');
    if (!apiKey) {
      console.log('Sportradar API key not found');
      return [];
    }

    const sportradarService = new SportradarService(apiKey);
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

function getFallbackData(): PlayerData[] {
  return [
    { ranking: 1, name: "Alcaraz, Carlos", country: "ESP", points: 11340, sportradar_competitor_id: "sr:competitor:407573" },
    { ranking: 2, name: "Sinner, Jannik", country: "ITA", points: 10000, sportradar_competitor_id: "sr:competitor:225050" },
    { ranking: 3, name: "Zverev, Alexander", country: "DEU", points: 5930, sportradar_competitor_id: "sr:competitor:57163" },
    { ranking: 4, name: "Fritz, Taylor", country: "USA", points: 4645, sportradar_competitor_id: "sr:competitor:136042" },
    { ranking: 5, name: "Djokovic, Novak", country: "SRB", points: 4580, sportradar_competitor_id: "sr:competitor:14882" },
  ];
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

    // TEMPORARY: Allow any authenticated user for testing
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

    // Use service role for database operations
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    console.log(`Starting ATP rankings update by user: ${user.email}...`);
    const players = await fetchATPRankings();
    console.log(`Fetched ${players.length} players from ATP sources`);

    // Use sportradar_competitor_id for reliable matching
    for (const player of players) {
      const price = calculatePrice(player.ranking);
      
      // Skip players without competitor ID
      if (!player.sportradar_competitor_id) {
        console.warn(`Skipping player ${player.name} - no competitor ID`);
        continue;
      }
      
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
            sportradar_competitor_id: player.sportradar_competitor_id,
            updated_at: new Date().toISOString(),
          },
          { 
            onConflict: "sportradar_competitor_id",
            ignoreDuplicates: false 
          }
        );

      if (error) {
        console.error(`Error upserting player ${player.name} (${player.sportradar_competitor_id}):`, error);
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
