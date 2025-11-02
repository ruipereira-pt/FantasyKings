import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

// Type definitions
type Player = Database['public']['Tables']['players']['Row'];
type Tournament = Database['public']['Tables']['tournaments']['Row'];
type Competition = Database['public']['Tables']['competitions']['Row'];
type UserTeam = Database['public']['Tables']['user_teams']['Row'];
type TeamPlayer = Database['public']['Tables']['team_players']['Row'];
type PlayerSchedule = Database['public']['Tables']['player_schedules']['Row'];
type CompetitionTournament = Database['public']['Tables']['competition_tournaments']['Row'];

// API Response wrapper
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// Base API class with common error handling
class BaseApiService {
  protected async handleRequest<T>(
    request: () => Promise<{ data: T | null; error: any }>
  ): Promise<ApiResponse<T>> {
    try {
      const { data, error } = await request();
      
      if (error) {
        console.error('API Error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return {
          data: null,
          error: error.message || 'An error occurred',
          success: false
        };
      }

      return {
        data,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        success: false
      };
    }
  }
}

// Players API
export class PlayersApi extends BaseApiService {
  async getAllPlayers(): Promise<ApiResponse<Player[]>> {
    return this.handleRequest(async () =>
      await supabase
        .from('players')
        .select('*')
        .order('live_ranking', { ascending: true, nullsFirst: false })
    );
  }

  async getPlayerById(id: string): Promise<ApiResponse<Player>> {
    return this.handleRequest(async () =>
      await supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .single()
    );
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<ApiResponse<Player>> {
    return this.handleRequest(async () => {
      const query = (supabase.from('players').update(updates as any).eq('id', id).select().single() as any);
      return await query;
    });
  }

  async createPlayer(player: Omit<Player, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Player>> {
    return this.handleRequest(async () =>
      await (supabase
        .from('players')
        .insert(player as any)
        .select()
        .single() as any)
    );
  }

  async bulkUpsertPlayers(players: Omit<Player, 'id' | 'created_at' | 'updated_at'>[]): Promise<ApiResponse<Player[]>> {
    return this.handleRequest(async () => {
      const results: Player[] = [];
      
      for (const player of players) {
        const { data: existing } = await supabase
          .from('players')
          .select('id')
          .eq('name', player.name)
          .maybeSingle();

        if (existing) {
          // @ts-expect-error - Supabase type inference issue
          const query = supabase.from('players').update({
            ranking: player.ranking,
            live_ranking: player.live_ranking,
            points: player.points,
            country: player.country,
          }).eq('id', (existing as any).id).select().single();
          const { data, error } = await query;
          
          if (error) throw error;
          if (data) results.push(data);
        } else {
          const { data, error } = await (supabase
            .from('players')
            .insert(player as any)
            .select()
            .single() as any);
          
          if (error) throw error;
          if (data) results.push(data);
        }
      }
      
      return { data: results, error: null };
    });
  }
}

// Tournaments API
export class TournamentsApi extends BaseApiService {
  async getAllTournaments(): Promise<ApiResponse<Tournament[]>> {
    return this.handleRequest(async () => {
      // First, update tournament statuses based on dates
      await supabase.rpc('update_tournament_status_on_dates');
      
      // Then fetch all tournaments
      return supabase
        .from('tournaments')
        .select('*')
        .order('start_date');
    });
  }

  async getTournamentById(id: string): Promise<ApiResponse<Tournament>> {
    return this.handleRequest(async () => {
      // First, update tournament statuses based on dates
      await supabase.rpc('update_tournament_status_on_dates');
      
      // Then fetch the specific tournament
      return supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();
    });
  }

  async createTournament(tournament: Omit<Tournament, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Tournament>> {
    return this.handleRequest(async () =>
      await (supabase
        .from('tournaments')
        .insert(tournament as any)
        .select()
        .single() as any)
    );
  }

  async updateTournament(id: string, updates: Partial<Tournament>): Promise<ApiResponse<Tournament>> {
    return this.handleRequest(async () => {
      // @ts-expect-error - Supabase type inference issue
      const query = supabase.from('tournaments').update(updates).eq('id', id).select().single();
      return await query;
    });
  }
}

// Competitions API
export class CompetitionsApi extends BaseApiService {
  async getAllCompetitions(): Promise<ApiResponse<Competition[]>> {
    return this.handleRequest(async () => {
      // First, update competition statuses based on deadline
      // This ensures competitions with passed deadlines are marked as 'active'
      await supabase.rpc('update_competition_status_on_deadline');
      
      // Then fetch all competitions
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('start_date', { ascending: false });
      
      
      return { data, error };
    });
  }

  async getCompetitionById(id: string): Promise<ApiResponse<Competition>> {
    return this.handleRequest(async () => {
      // First, update competition statuses based on deadline
      await supabase.rpc('update_competition_status_on_deadline');
      
      // Then fetch the specific competition
      return supabase
        .from('competitions')
        .select('*')
        .eq('id', id)
        .single();
    });
  }

  async createCompetition(competition: Omit<Competition, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Competition>> {
    return this.handleRequest(async () =>
      await (supabase
        .from('competitions')
        .insert(competition as any)
        .select()
        .single() as any)
    );
  }

  async updateCompetition(id: string, updates: Partial<Competition>): Promise<ApiResponse<Competition>> {
    return this.handleRequest(async () => {
      // @ts-expect-error - Supabase type inference issue
      const query = supabase.from('competitions').update(updates).eq('id', id).select().single();
      return await query;
    });
  }

  async getCompetitionTournaments(competitionId: string): Promise<ApiResponse<Tournament[]>> {
    return this.handleRequest(async () => {
      const { data, error } = await supabase
        .from('competition_tournaments')
        .select('tournament_id, tournaments(*)')
        .eq('competition_id', competitionId);

      if (error) throw error;
      
      const tournaments = (data as any)?.map((ct: any) => ct.tournaments).filter(Boolean) as Tournament[] || [];
      return { data: tournaments, error: null };
    });
  }

  async associateTournament(competitionId: string, tournamentId: string): Promise<ApiResponse<CompetitionTournament>> {
    return this.handleRequest(async () =>
      await (supabase
        .from('competition_tournaments')
        .insert({
          competition_id: competitionId,
          tournament_id: tournamentId
        } as any)
        .select()
        .single() as any)
    );
  }

  async disassociateTournament(competitionId: string, tournamentId: string): Promise<ApiResponse<void>> {
    return this.handleRequest(async () =>
      await supabase
        .from('competition_tournaments')
        .delete()
        .eq('competition_id', competitionId)
        .eq('tournament_id', tournamentId)
    );
  }
}

// User Teams API
export class UserTeamsApi extends BaseApiService {
  async createTeam(team: Omit<UserTeam, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<UserTeam>> {
    return this.handleRequest(async () =>
      await (supabase
        .from('user_teams')
        .insert(team as any)
        .select()
        .single() as any)
    );
  }

  async getTeamById(id: string): Promise<ApiResponse<UserTeam>> {
    return this.handleRequest(async () =>
      await supabase
        .from('user_teams')
        .select('*')
        .eq('id', id)
        .single()
    );
  }

  async getUserTeams(userId: string): Promise<ApiResponse<UserTeam[]>> {
    return this.handleRequest(async () =>
      await supabase
        .from('user_teams')
        .select('*')
        .eq('user_id', userId)
    );
  }

  async updateTeam(id: string, updates: Partial<UserTeam>): Promise<ApiResponse<UserTeam>> {
    return this.handleRequest(async () => {
      // @ts-expect-error - Supabase type inference issue
      const query = supabase.from('user_teams').update(updates).eq('id', id).select().single();
      return await query;
    });
  }
}

// Team Players API
export class TeamPlayersApi extends BaseApiService {
  async addPlayersToTeam(teamId: string, playerIds: string[]): Promise<ApiResponse<TeamPlayer[]>> {
    const teamPlayers = playerIds.map(playerId => ({
      user_team_id: teamId,
      player_id: playerId
    }));

    return this.handleRequest(async () =>
      await (supabase
        .from('team_players')
        .insert(teamPlayers as any)
        .select() as any)
    );
  }

  async getTeamPlayers(teamId: string): Promise<ApiResponse<TeamPlayer[]>> {
    return this.handleRequest(async () =>
      await supabase
        .from('team_players')
        .select('*')
        .eq('user_team_id', teamId)
    );
  }

  async removePlayerFromTeam(teamId: string, playerId: string): Promise<ApiResponse<void>> {
    return this.handleRequest(async () =>
      await supabase
        .from('team_players')
        .delete()
        .eq('user_team_id', teamId)
        .eq('player_id', playerId)
    );
  }
}

// Player Schedules API
export class PlayerSchedulesApi extends BaseApiService {
  async getPlayerSchedule(playerId: string): Promise<ApiResponse<PlayerSchedule[]>> {
    return this.handleRequest(async () =>
      await supabase
        .from('player_schedules')
        .select(`
          *,
          tournaments (
            name,
            start_date,
            end_date,
            category
          )
        `)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
    );
  }

  async createPlayerSchedule(schedule: Omit<PlayerSchedule, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<PlayerSchedule>> {
    return this.handleRequest(async () =>
      await (supabase
        .from('player_schedules')
        .insert(schedule as any)
        .select()
        .single() as any) as any
    );
  }

  async updatePlayerSchedule(id: string, updates: Partial<PlayerSchedule>): Promise<ApiResponse<PlayerSchedule>> {
    return this.handleRequest(async () => {
      // @ts-expect-error - Supabase type inference issue with Database types
      const query = supabase.from('player_schedules').update(updates).eq('id', id).select().single();
      return await query;
    });
  }

  async deletePlayerSchedule(id: string): Promise<ApiResponse<void>> {
    return this.handleRequest(async () =>
      await supabase
        .from('player_schedules')
        .delete()
        .eq('id', id)
    );
  }
}

// External API calls (Supabase Functions)
export class ExternalApi {
  async refreshRankings(): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-rankings`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to refresh rankings');
      }

      return {
        data: null,
        error: null,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to refresh rankings',
        success: false
      };
    }
  }

  async refreshTournaments(): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-tournament-schedules`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to refresh tournaments');
      }

      return {
        data: null,
        error: null,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to refresh tournaments',
        success: false
      };
    }
  }

  async fetchPlayerSchedules(): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-player-schedules`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch player schedules');
      }

      return {
        data: null,
        error: null,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch player schedules',
        success: false
      };
    }
  }
}

// Export API instances
export const playersApi = new PlayersApi();
export const tournamentsApi = new TournamentsApi();
export const competitionsApi = new CompetitionsApi();
export const userTeamsApi = new UserTeamsApi();
export const teamPlayersApi = new TeamPlayersApi();
export const playerSchedulesApi = new PlayerSchedulesApi();
export const externalApi = new ExternalApi();

// Export all APIs as a single object for convenience
export const api = {
  players: playersApi,
  tournaments: tournamentsApi,
  competitions: competitionsApi,
  userTeams: userTeamsApi,
  teamPlayers: teamPlayersApi,
  playerSchedules: playerSchedulesApi,
  external: externalApi,
};
