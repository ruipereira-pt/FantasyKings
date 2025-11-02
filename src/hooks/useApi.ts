import { useState, useCallback } from 'react';
import { api, ApiResponse } from '../services/api';

// Generic hook for API calls with loading and error states
export function useApiCall<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    apiCall: () => Promise<ApiResponse<T>>
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall();
      
      if (response.success) {
        return response.data;
      } else {
        setError(response.error);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error, clearError: () => setError(null) };
}

// Specific hooks for common operations
export function usePlayers() {
  const { execute, loading, error, clearError } = useApiCall();
  const [players, setPlayers] = useState<any[]>([]);

  const fetchPlayers = useCallback(async () => {
    const data = await execute(() => api.players.getAllPlayers());
    if (data) {
      setPlayers(data);
    }
    return data;
  }, [execute]);

  const refreshRankings = useCallback(async () => {
    const result = await execute(() => api.external.refreshRankings());
    if (result !== null) {
      // Refresh players after successful ranking update
      await fetchPlayers();
    }
    return result;
  }, [execute, fetchPlayers]);

  const uploadPlayers = useCallback(async (playersData: any[]) => {
    const result = await execute(() => api.players.bulkUpsertPlayers(playersData));
    if (result) {
      // Refresh players after successful upload
      await fetchPlayers();
    }
    return result;
  }, [execute, fetchPlayers]);

  return {
    players,
    loading,
    error,
    clearError,
    fetchPlayers,
    refreshRankings,
    uploadPlayers
  };
}

export function useCompetitions() {
  const { execute, loading, error, clearError } = useApiCall();
  const [competitions, setCompetitions] = useState<any[]>([]);

  const fetchCompetitions = useCallback(async () => {
    const data = await execute(() => api.competitions.getAllCompetitions());
    if (data) {
      setCompetitions(data);
    }
    return data;
  }, [execute]);

  const updateCompetition = useCallback(async (id: string, updates: any) => {
    const result = await execute(() => api.competitions.updateCompetition(id, updates));
    if (result) {
      // Refresh competitions after successful update
      await fetchCompetitions();
    }
    return result;
  }, [execute, fetchCompetitions]);

  const getCompetitionTournaments = useCallback(async (competitionId: string) => {
    return execute(() => api.competitions.getCompetitionTournaments(competitionId));
  }, [execute]);

  const associateTournament = useCallback(async (competitionId: string, tournamentId: string) => {
    const result = await execute(() => api.competitions.associateTournament(competitionId, tournamentId));
    if (result !== null) {
      // Refresh tournaments for the competition
      await getCompetitionTournaments(competitionId);
    }
    return result;
  }, [execute, getCompetitionTournaments]);

  const disassociateTournament = useCallback(async (competitionId: string, tournamentId: string) => {
    const result = await execute(() => api.competitions.disassociateTournament(competitionId, tournamentId));
    if (result !== null) {
      // Refresh tournaments for the competition
      await getCompetitionTournaments(competitionId);
    }
    return result;
  }, [execute, getCompetitionTournaments]);

  return {
    competitions,
    loading,
    error,
    clearError,
    fetchCompetitions,
    updateCompetition,
    getCompetitionTournaments,
    associateTournament,
    disassociateTournament
  };
}

export function useTournaments() {
  const { execute, loading, error, clearError } = useApiCall();
  const [tournaments, setTournaments] = useState<any[]>([]);

  const fetchTournaments = useCallback(async () => {
    const data = await execute(() => api.tournaments.getAllTournaments());
    if (data) {
      setTournaments(data || []);
    }
    return data;
  }, [execute]);

  const refreshTournaments = useCallback(async () => {
    const result = await execute(() => api.external.refreshTournaments());
    if (result !== null) {
      // Refresh tournaments after successful update
      await fetchTournaments();
    }
    return result;
  }, [execute, fetchTournaments]);

  return {
    tournaments,
    loading,
    error,
    clearError,
    fetchTournaments,
    refreshTournaments
  };
}

export function useUserTeams() {
  const { execute, loading, error, clearError } = useApiCall();

  const createTeam = useCallback(async (teamData: any) => {
    return execute(() => api.userTeams.createTeam(teamData));
  }, [execute]);

  const addPlayersToTeam = useCallback(async (teamId: string, playerIds: string[]) => {
    return execute(() => api.teamPlayers.addPlayersToTeam(teamId, playerIds));
  }, [execute]);

  const getUserTeams = useCallback(async (userId: string) => {
    return execute(() => api.userTeams.getUserTeams(userId));
  }, [execute]);

  return {
    loading,
    error,
    clearError,
    createTeam,
    addPlayersToTeam,
    getUserTeams
  };
}

export function usePlayerSchedules() {
  const { execute, loading, error, clearError } = useApiCall();
  const [schedules, setSchedules] = useState<any[]>([]);

  const fetchPlayerSchedule = useCallback(async (playerId: string) => {
    const data = await execute(() => api.playerSchedules.getPlayerSchedule(playerId));
    if (data) {
      setSchedules(data || []);
    }
    return data;
  }, [execute]);

  const createPlayerSchedule = useCallback(async (scheduleData: any) => {
    const result = await execute(() => api.playerSchedules.createPlayerSchedule(scheduleData));
    if (result) {
      // Refresh schedules after successful creation
      if (scheduleData.player_id) {
        await fetchPlayerSchedule(scheduleData.player_id);
      }
    }
    return result;
  }, [execute, fetchPlayerSchedule]);

  const updatePlayerSchedule = useCallback(async (id: string, updates: any) => {
    const result = await execute(() => api.playerSchedules.updatePlayerSchedule(id, updates));
    if (result) {
      // Refresh schedules after successful update
      if (updates.player_id) {
        await fetchPlayerSchedule(updates.player_id);
      }
    }
    return result;
  }, [execute, fetchPlayerSchedule]);

  const deletePlayerSchedule = useCallback(async (id: string, playerId: string) => {
    const result = await execute(() => api.playerSchedules.deletePlayerSchedule(id));
    if (result !== null) {
      // Refresh schedules after successful deletion
      await fetchPlayerSchedule(playerId);
    }
    return result;
  }, [execute, fetchPlayerSchedule]);

  return {
    schedules,
    loading,
    error,
    clearError,
    fetchPlayerSchedule,
    createPlayerSchedule,
    updatePlayerSchedule,
    deletePlayerSchedule
  };
}
