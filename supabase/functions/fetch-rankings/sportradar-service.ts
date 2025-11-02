interface SportradarConfig {
  apiKey: string;
  accessLevel: 'trial' | 'production';
  language: string;
}

interface PlayerData {
  ranking: number;
  name: string;
  country: string;
  points: number;
  sportradar_competitor_id: string;
  movement?: number;
  competitions_played?: number;
}

interface TournamentData {
  id: string;
  name: string;
  category: string;
  surface: string;
  location: string;
  start_date: string;
  end_date: string;
  prize_money: number;
  status: string;
}

export class SportradarService {
  private config: SportradarConfig;

  constructor(apiKey: string, accessLevel: 'trial' | 'production' = 'trial', language: string = 'en') {
    this.config = {
      apiKey,
      accessLevel,
      language
    };
  }

  private getBaseUrl(): string {
    return `https://api.sportradar.com/tennis/${this.config.accessLevel}/v3/${this.config.language}`;
  }

  private async makeRequest(endpoint: string, useCache: boolean = true): Promise<any> {
    // Import cache utility dynamically to avoid issues if file doesn't exist
    let saveToCache: (endpoint: string, data: any) => Promise<void>;
    try {
      const cacheModule = await import('../_shared/sportradar-cache.ts');
      saveToCache = cacheModule.saveToCache;
    } catch {
      // Cache utility not available, skip caching
      saveToCache = async () => {};
    }

    const url = `${this.getBaseUrl()}${endpoint}?api_key=${this.config.apiKey}`;
    
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

    const data = await response.json();
    
    // Save successful response to cache
    if (useCache && response.ok && data) {
      await saveToCache(endpoint, data);
    }

    return data;
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

  async getWTARankings(): Promise<PlayerData[]> {
    try {
      const data = await this.makeRequest('/rankings.json');
      
      // The API returns an object with a 'rankings' property containing the array
      const rankings = data.rankings || data;
      
      if (rankings && Array.isArray(rankings)) {
        const players: PlayerData[] = [];
        
        // Find WTA rankings (name: "WTA")
        const wtaGroup = rankings.find(group => group.name === 'WTA');
        
        if (wtaGroup && wtaGroup.competitor_rankings) {
          for (const player of wtaGroup.competitor_rankings) {
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
      console.error('Error fetching WTA rankings from Sportradar:', error);
      return [];
    }
  }

  async getTournaments(): Promise<TournamentData[]> {
    try {
      const data = await this.makeRequest('/tournaments.json');
      
      if (data.tournaments && data.tournaments.length > 0) {
        return data.tournaments.map((tournament: any) => ({
          id: tournament.id,
          name: tournament.name,
          category: this.mapCategory(tournament.category),
          surface: tournament.surface?.toLowerCase() || 'hard',
          location: `${tournament.city}, ${tournament.country}`,
          start_date: tournament.start_date,
          end_date: tournament.end_date,
          prize_money: tournament.prize_money || 0,
          status: this.mapStatus(tournament.status),
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching tournaments from Sportradar:', error);
      return [];
    }
  }

  async getPlayerProfile(playerId: string): Promise<any> {
    try {
      return await this.makeRequest(`/players/${playerId}/profile.json`);
    } catch (error) {
      console.error(`Error fetching player profile for ${playerId}:`, error);
      return null;
    }
  }

  async getTournamentSchedule(tournamentId: string): Promise<any> {
    try {
      return await this.makeRequest(`/tournaments/${tournamentId}/schedule.json`);
    } catch (error) {
      console.error(`Error fetching tournament schedule for ${tournamentId}:`, error);
      return null;
    }
  }

  private mapCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'grand_slam': 'grand_slam',
      'atp_1000': 'masters_1000',
      'atp_500': '500',
      'atp_250': '250',
      'wta_1000': 'masters_1000',
      'wta_500': '500',
      'wta_250': '250',
      'challenger': 'challenger',
      'itf': 'challenger',
    };
    
    return categoryMap[category?.toLowerCase()] || 'other';
  }

  private mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'scheduled': 'upcoming',
      'in_progress': 'ongoing',
      'completed': 'completed',
      'cancelled': 'completed',
    };
    
    return statusMap[status?.toLowerCase()] || 'upcoming';
  }
}

export function createSportradarService(): SportradarService | null {
  const apiKey = Deno.env.get('SPORTRADAR_API_KEY');
  if (!apiKey) {
    console.log('Sportradar API key not found');
    return null;
  }

  return new SportradarService(apiKey);
}
