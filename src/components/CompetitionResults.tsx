import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Trophy, Save } from 'lucide-react';
import type { Database } from '../lib/database.types';

import { useCompetitions } from '../hooks/useApi';

type Competition = Database['public']['Tables']['competitions']['Row'];
type Tournament = Database['public']['Tables']['tournaments']['Row'];
type Player = Database['public']['Tables']['players']['Row'];

interface PlayerSchedule {
  id: string;
  player_id: string;
  tournament_id: string;
  status: 'confirmed' | 'qualifying' | 'alternate' | 'withdrawn' | 'eliminated' | 'champion';
  entry_type: string | null;
  seed_number?: number | null;
  eliminated_round?: string | null;
  players: Player;
}

interface CompetitionResultsProps {
  selectedCompetition?: Competition | null;
}

export default function CompetitionResults({ selectedCompetition: propSelectedCompetition }: CompetitionResultsProps) {
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(propSelectedCompetition || null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<PlayerSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [playerRounds, setPlayerRounds] = useState<Record<string, string>>({});
  const [pointsPerRound, setPointsPerRound] = useState<Record<string, number>>({});
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  
  const { fetchCompetitions } = useCompetitions();
  
  const fetchAllOngoingTournaments = async () => {
    setTournamentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'ongoing')
        .order('start_date', { ascending: true });

      if (error) throw error;
      
      setTournaments(data || []);
      if (data && data.length > 0 && !selectedTournament) {
        setSelectedTournament(data[0]);
      }
    } catch (error) {
      console.error('Error fetching ongoing tournaments:', error);
      setTournaments([]);
    } finally {
      setTournamentsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCompetitions();
    fetchAllOngoingTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCompetitions]);
  
  useEffect(() => {
    if (propSelectedCompetition !== undefined) {
      setSelectedCompetition(propSelectedCompetition);
    }
  }, [propSelectedCompetition]);

  useEffect(() => {
    if (selectedTournament) {
      // Find the competition associated with this tournament
      findCompetitionForTournament(selectedTournament.id);
    }
     
  }, [selectedTournament]);

  useEffect(() => {
    if (selectedTournament && selectedCompetition) {
      fetchTournamentPlayers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTournament, selectedCompetition]);

  useEffect(() => {
    if (players.length > 0) {
      loadExistingPerformances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length]);

  async function findCompetitionForTournament(tournamentId: string) {
    try {
      // Check competition_tournaments junction table
      const { data: ctData, error: ctError } = await supabase
        .from('competition_tournaments')
        .select('competition_id, competitions(*)')
        .eq('tournament_id', tournamentId)
        .limit(1)
        .maybeSingle();

      if (!ctError && ctData) {
        const comp = (ctData as { competition_id: string; competitions: Competition }).competitions as Competition;
        setSelectedCompetition(comp);
        // Load points_per_round configuration
        if (comp.points_per_round && typeof comp.points_per_round === 'object') {
          setPointsPerRound(comp.points_per_round as Record<string, number>);
        }
        return;
      }

      // Also check for direct tournament_id in competitions
      const { data: directCompetition, error: directError } = await supabase
        .from('competitions')
        .select('*')
        .eq('tournament_id', tournamentId)
        .limit(1)
        .maybeSingle();

      if (!directError && directCompetition) {
        const comp = directCompetition as Competition;
        setSelectedCompetition(comp);
        // Load points_per_round configuration
        if (comp.points_per_round && typeof comp.points_per_round === 'object') {
          setPointsPerRound(comp.points_per_round as Record<string, number>);
        }
      }
    } catch (error) {
      console.error('Error finding competition for tournament:', error);
    }
  }

  async function fetchTournamentPlayers() {
    if (!selectedTournament) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('player_schedules')
        .select(`
          id,
          player_id,
          tournament_id,
          status,
          entry_type,
          seed_number,
          eliminated_round,
          players!inner (
            id,
            name,
            country,
            ranking
          )
        `)
        .eq('tournament_id', selectedTournament.id)
        .in('status', ['confirmed', 'qualifying', 'champion', 'eliminated'])
        .order('players(ranking)', { ascending: true });

      if (error) throw error;

      const schedules = (data || []) as unknown as PlayerSchedule[];
      setPlayers(schedules);

      // Initialize rounds from eliminated_round or status
      const roundsMap: Record<string, string> = {};
      schedules.forEach(s => {
        if (s.status === 'champion') {
          roundsMap[s.id] = 'w';
        } else if (s.eliminated_round) {
          roundsMap[s.id] = s.eliminated_round;
        }
      });
      setPlayerRounds(roundsMap);
      
      // Then load existing performances to override with more complete data
      setTimeout(() => loadExistingPerformances(), 100);
    } catch (error) {
      console.error('Error fetching tournament players:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadExistingPerformances() {
    if (!selectedTournament || players.length === 0) return;

    try {
      const playerIds = players.map(p => p.player_id).filter((id): id is string => id !== null);
      const { data, error } = await supabase
        .from('player_performances')
        .select('player_id, round_reached, fantasy_points')
        .eq('tournament_id', selectedTournament.id)
        .in('player_id', playerIds) as { data: Array<{ player_id: string | null; round_reached: string | null; fantasy_points: number }> | null; error: any };

      if (error) throw error;

      // Map player performances to schedules
      const performanceMap: Record<string, string> = {};
      data?.forEach((perf: { player_id: string | null; round_reached: string | null; fantasy_points: number }) => {
        if (perf.round_reached) {
          // Find the schedule ID for this player
          const schedule = players.find(p => p.player_id === perf.player_id);
          if (schedule) {
            performanceMap[schedule.id] = perf.round_reached;
          }
        }
      });
      setPlayerRounds(prev => ({ ...prev, ...performanceMap }));
    } catch (error) {
      console.error('Error loading performances:', error);
    }
  }

  function calculatePoints(round: string): number {
    if (!round) return 0;
    if (round === 'w') {
      return pointsPerRound['w'] || 0;
    }
    return pointsPerRound[round] || 0;
  }

  async function updatePlayerResult(scheduleId: string, round: string) {
    setPlayerRounds(prev => ({ ...prev, [scheduleId]: round }));
    
    setSaving(true);
    try {
      const schedule = players.find(p => p.id === scheduleId);
      if (!schedule) return;

      const isChampion = round === 'w';
      const isEliminated = round && round !== 'w';

      // Update player_schedule
      const scheduleUpdates: any = {
        eliminated_round: isEliminated ? round : null,
        status: isChampion ? 'champion' : isEliminated ? 'eliminated' : schedule.status,
      };

      // @ts-expect-error - Supabase type inference issue
      const query1 = supabase.from('player_schedules').update(scheduleUpdates as any).eq('id', scheduleId);
      const { error: scheduleError } = await query1;

      if (scheduleError) throw scheduleError;

      // Calculate points for this round
      let points = 0;
      if (isChampion) {
        points = pointsPerRound['w'] || 0;
      } else if (round) {
        points = pointsPerRound[round] || 0;
      }

      // Update or create player_performance
      const performanceData = {
        player_id: schedule.player_id,
        tournament_id: schedule.tournament_id,
        round_reached: isChampion ? 'w' as const : (round as 'r128' | 'r64' | 'r32' | 'r16' | 'qf' | 'sf' | 'f' | null),
        fantasy_points: points,
        matches_won: 0, // Could be calculated based on round
        matches_lost: 0,
      };

      const { error: perfError } = await (supabase
        .from('player_performances')
        .upsert(performanceData as any, {
          onConflict: 'player_id,tournament_id',
        }) as any);

      if (perfError) throw perfError;

      await fetchTournamentPlayers();
      await loadExistingPerformances();
    } catch (error: any) {
      console.error('Error updating player result:', error);
      alert(`Failed to update player result: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  }

  async function bulkUpdateResults() {
    if (!selectedTournament || !selectedCompetition) return;
    if (Object.keys(playerRounds).length === 0) {
      alert('No results to update');
      return;
    }

    setSaving(true);
    try {
      // Prepare bulk updates for player_schedules
      const scheduleUpdates: Array<{ id: string; updates: any }> = [];
      const performanceUpdates: Array<any> = [];

      for (const [scheduleId, round] of Object.entries(playerRounds)) {
        if (!round) continue;
        
        const schedule = players.find(p => p.id === scheduleId);
        if (!schedule) continue;

        const isChampion = round === 'w';
        const isEliminated = round && round !== 'w';

        // Prepare player_schedules update
        const scheduleUpdate: any = {
          eliminated_round: isEliminated ? round : null,
          status: isChampion ? 'champion' : isEliminated ? 'eliminated' : schedule.status,
        };
        
        scheduleUpdates.push({
          id: scheduleId,
          updates: scheduleUpdate,
        });

        // Calculate points for this round
        let points = 0;
        if (isChampion) {
          points = pointsPerRound['w'] || 0;
        } else {
          points = pointsPerRound[round] || 0;
        }

        // Prepare player_performances upsert
        const performanceData = {
          player_id: schedule.player_id,
          tournament_id: schedule.tournament_id,
          round_reached: isChampion ? 'w' as const : (round as 'r128' | 'r64' | 'r32' | 'r16' | 'qf' | 'sf' | 'f' | null),
          fantasy_points: points,
          matches_won: 0,
          matches_lost: 0,
        };
        
        performanceUpdates.push(performanceData);
      }

      // Execute bulk updates in parallel using Promise.all
      const updatePromises = scheduleUpdates.map(({ id, updates }) => {
        // @ts-expect-error - Supabase type inference issue
        return supabase.from('player_schedules').update(updates as any).eq('id', id);
      });

      const updateResults = await Promise.all(updatePromises);
      
      // Check for errors in schedule updates
      const scheduleErrors = updateResults.filter(result => result.error);
      if (scheduleErrors.length > 0) {
        console.error('Some schedule updates failed:', scheduleErrors);
      }

      // Bulk upsert player_performances
      if (performanceUpdates.length > 0) {
        const { error: perfError } = await (supabase
          .from('player_performances')
          .upsert(performanceUpdates as any, {
            onConflict: 'player_id,tournament_id',
          }) as any);

        if (perfError) {
          console.error('Error bulk upserting performances:', perfError);
          throw perfError;
        }
      }

      const successCount = scheduleUpdates.length - scheduleErrors.length;
      const errorCount = scheduleErrors.length;

      if (errorCount === 0) {
        alert(`Successfully updated ${successCount} player results!`);
      } else {
        alert(`Results updated with some errors!\nSuccess: ${successCount}\nErrors: ${errorCount}`);
      }

      // Refresh data
      await fetchTournamentPlayers();
      await loadExistingPerformances();
    } catch (error: any) {
      console.error('Error bulk updating results:', error);
      alert(`Failed to update results: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  }

  const filteredPlayers = players.filter(player =>
    player.players.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roundOptions = ['r128', 'r64', 'r32', 'r16', 'qf', 'sf', 'f', 'w'];
  const roundLabels: Record<string, string> = {
    r128: 'Round of 128',
    r64: 'Round of 64',
    r32: 'Round of 32',
    r16: 'Round of 16',
    qf: 'Quarterfinal',
    sf: 'Semifinal',
    f: 'Final',
    w: 'Champion (Winner)',
  };

  // Show warning if competition is not active/completed, but still allow updates
  const showStatusWarning = selectedCompetition && selectedCompetition.status !== 'active' && selectedCompetition.status !== 'completed';

  return (
    <div className="space-y-6">
      {/* Tournament Results Header and Selection */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Trophy className="h-6 w-6 text-purple-400" />
          <span>Tournament Results</span>
        </h3>
        <p className="text-slate-400 mb-4">
          Select an ongoing tournament to update results. Mark players as eliminated and record which round they lost.
          Points will be calculated based on the competition's points per round configuration.
        </p>
        
        {/* Tournament Selection */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Select Tournament
          </label>
          <select
            value={selectedTournament?.id || ''}
            onChange={(e) => {
              const tournament = tournaments.find(t => t.id === e.target.value);
              setSelectedTournament(tournament || null);
            }}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">-- Select an ongoing tournament --</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name} - {new Date(tournament.start_date).toLocaleDateString()}
              </option>
            ))}
          </select>
          {tournaments.length === 0 && !tournamentsLoading && (
            <p className="text-sm text-amber-400 mt-2">
              No ongoing tournaments found. Only tournaments with status "ongoing" are shown here.
            </p>
          )}
          {tournamentsLoading && (
            <p className="text-sm text-slate-400 mt-2">
              Loading tournaments...
            </p>
          )}
        </div>
      </div>

      {showStatusWarning && (
        <div className="bg-amber-500/10 border border-amber-500/50 rounded-xl p-4">
          <p className="text-amber-400 text-sm">
            <strong>Note:</strong> Competition status is "{selectedCompetition?.status}". 
            Change the status to "active" in Competition Setup to enable full result updates, 
            but you can still update results below.
          </p>
        </div>
      )}

      {selectedTournament && selectedCompetition && (
        <>
          {/* Tournament Info */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedTournament.name}</h3>
                <p className="text-slate-400 mt-1">
                  {new Date(selectedTournament.start_date).toLocaleDateString()} - {new Date(selectedTournament.end_date).toLocaleDateString()}
                </p>
                <p className="text-slate-400">{selectedTournament.location}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400">Total Players</div>
                <div className="text-3xl font-bold text-emerald-400">{players.length}</div>
              </div>
            </div>
            
            {/* Points per Round Info */}
            {Object.keys(pointsPerRound).length > 0 && (
              <div className="mt-4 p-4 bg-slate-900/50 rounded-lg">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Points per Round:</h4>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {roundOptions.map(round => {
                    const points = pointsPerRound[round];
                    if (points === undefined) return null;
                    return (
                      <div key={round} className="text-slate-400">
                        <span className="text-white font-medium">{round.toUpperCase()}:</span> {points} pts
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Players Results */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Update Results</h3>
              <button
                onClick={bulkUpdateResults}
                disabled={saving || Object.keys(playerRounds).length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>Save All Results</span>
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No players found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlayers.map((schedule) => {
                  const currentRound = playerRounds[schedule.id] || '';
                  const points = currentRound ? calculatePoints(currentRound) : 0;
                  const isChampion = currentRound === 'w';
                  
                  const isCurrentlyChampion = currentRound === 'w' || schedule.status === 'champion';
                  
                  return (
                    <div
                      key={schedule.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                        isCurrentlyChampion 
                          ? 'bg-amber-500/10 border-2 border-amber-500/50' 
                          : 'bg-slate-900/50 border border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                          isCurrentlyChampion 
                            ? 'bg-amber-500/20 text-amber-400' 
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {schedule.players.ranking || '-'}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-white flex items-center space-x-2">
                            {isCurrentlyChampion && (
                              <Trophy className="h-4 w-4 text-amber-400" />
                            )}
                            <span>{schedule.players.name}</span>
                            {schedule.seed_number && (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-bold">
                                #{schedule.seed_number}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-400">
                            {schedule.players.country} • {schedule.entry_type || 'Main Draw'}
                            {schedule.status === 'eliminated' && schedule.eliminated_round && (
                              <span className="ml-2 text-red-400">(Eliminated in {schedule.eliminated_round.toUpperCase()})</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Round Lost / Reached</div>
                          <select
                            value={currentRound}
                            onChange={(e) => {
                              const round = e.target.value;
                              setPlayerRounds(prev => ({ ...prev, [schedule.id]: round }));
                            }}
                            disabled={saving || schedule.status === 'withdrawn'}
                            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 min-w-[150px]"
                          >
                            <option value="">Select round...</option>
                            {roundOptions.map(round => (
                              <option key={round} value={round}>
                                {roundLabels[round]} {pointsPerRound[round] !== undefined && `(${pointsPerRound[round]} pts)`}
                              </option>
                            ))}
                          </select>
                        </div>

                        {currentRound && (
                          <div className="text-right">
                            <div className="text-xs text-slate-400">Points</div>
                            <div className={`text-lg font-bold ${
                              isChampion ? 'text-amber-400' : points > 0 ? 'text-emerald-400' : 'text-slate-400'
                            }`}>
                              {points}
                            </div>
                          </div>
                        )}

                        {currentRound && (
                          <button
                            onClick={() => updatePlayerResult(schedule.id, currentRound)}
                            disabled={saving}
                            className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary */}
          {Object.keys(playerRounds).length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Results Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {roundOptions.map(round => {
                  const count = Object.values(playerRounds).filter(r => r === round).length;
                  if (count === 0) return null;
                  return (
                    <div key={round} className="p-3 bg-slate-900/50 rounded-lg">
                      <div className="text-sm text-slate-400">{roundLabels[round]}</div>
                      <div className="text-2xl font-bold text-white">{count}</div>
                      <div className="text-xs text-emerald-400">
                        {count * (pointsPerRound[round] || 0)} total pts
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

