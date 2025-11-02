import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Plus, Trash2, Trophy, Coins } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Player = Database['public']['Tables']['players']['Row'];
type Competition = Database['public']['Tables']['competitions']['Row'];

interface TeamBuilderProps {
  competition: Competition;
  onClose: () => void;
  existingTeam?: {
    id: string;
    team_name: string;
    team_players: Array<{ player_id: string }>;
  };
  readOnly?: boolean;
  playerPoints?: Array<{
    player_id: string;
    player_name: string;
    points: number;
  }>;
}

export default function TeamBuilder({ competition, onClose, existingTeam, readOnly = false, playerPoints = [] }: TeamBuilderProps) {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [playerStatuses, setPlayerStatuses] = useState<Record<string, string>>({});
  const [showingAllPlayers, setShowingAllPlayers] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, [competition]);

  useEffect(() => {
    if (existingTeam) {
      setTeamName(existingTeam.team_name);
      // Load existing players
      loadExistingTeam();
    }
  }, [existingTeam?.id]);

  const loadExistingTeam = async () => {
    if (!existingTeam) return;
    
    try {
      const { data: teamPlayers, error } = await (supabase
        .from('team_players')
        .select('player_id, players(*)')
        .eq('user_team_id', existingTeam.id) as any);

      if (error) throw error;

      const playerIds = ((teamPlayers as any) || []).map((tp: any) => tp.player_id).filter(Boolean) || [];
      
      // Fetch full player data
      const { data: fullPlayers } = await supabase
        .from('players')
        .select('*')
        .in('id', playerIds);

      setSelectedPlayers(fullPlayers || []);
    } catch (error) {
      console.error('Error loading existing team:', error);
    }
  };

  async function fetchPlayers() {
    try {
      let playersQuery = supabase
        .from('players')
        .select('*')
        .order('live_ranking', { ascending: true, nullsFirst: false });

      // For per_competition type, filter by tournament participation status
      if (competition.type === 'per_competition') {
        let tournamentId = competition.tournament_id;
        
        // If no direct tournament_id, fetch from competition_tournaments
        if (!tournamentId) {
          console.log('Fetching tournaments for competition:', competition.id);
          const { data: competitionTournaments, error: ctError } = await supabase
            .from('competition_tournaments')
            .select('tournament_id')
            .eq('competition_id', competition.id)
            .limit(1)
            .maybeSingle();
          
          if (ctError) {
            console.error('Error fetching competition tournaments:', ctError);
          } else if (competitionTournaments) {
            tournamentId = competitionTournaments.tournament_id;
            console.log('Found tournament for competition:', tournamentId);
          }
        }
        
        if (tournamentId) {
          console.log('Fetching players for tournament:', tournamentId);
          
          // Get players in main draw or qualifying (exclude withdrawn/eliminated)
          const { data: eligiblePlayers, error: regError } = await (supabase
            .from('player_schedules')
            .select(`
              player_id,
              status,
              players!inner(*)
            `)
            .eq('tournament_id', tournamentId)
            .in('status', ['confirmed', 'qualifying']) as any);

          if (regError) {
            console.error('Error fetching player schedules:', regError);
            throw regError;
          }

          console.log('Eligible players found:', (eligiblePlayers as any)?.length || 0);
          
          // Log the status distribution for debugging
          const statusCounts: Record<string, number> = {};
          ((eligiblePlayers as any) || []).forEach((ep: any) => {
            statusCounts[ep.status] = (statusCounts[ep.status] || 0) + 1;
          });
          console.log('Status distribution:', statusCounts);

          const playerIds = ((eligiblePlayers as any) || []).map((rp: any) => rp.player_id).filter(Boolean) || [];
          const statusMap: Record<string, string> = {};
          
          // Store player statuses for display - only confirmed and qualifying
          ((eligiblePlayers as any) || []).forEach((ep: any) => {
            if (ep.player_id && (ep.status === 'confirmed' || ep.status === 'qualifying')) {
              statusMap[ep.player_id] = ep.status;
            }
          });
          
          setPlayerStatuses(statusMap);
          
          if (playerIds.length > 0) {
            console.log('Filtering players by tournament participation');
            playersQuery = playersQuery.in('id', playerIds);
            setShowingAllPlayers(false);
          } else {
            console.log('No player schedules found for tournament, showing all players as fallback');
            // If no player schedules exist, show all players (fallback)
            // This handles the case where player schedules haven't been created yet
            setShowingAllPlayers(true);
          }
        } else {
          console.log('No tournament associated with competition, showing all players');
          setShowingAllPlayers(true);
        }
      } else if (competition.type === 'season' || competition.type === 'road_to_major' || competition.type === 'per_gameweek') {
        // For other competition types, get all players (they can pick from all available players)
        // No additional filtering needed
        console.log('Fetching all players for competition type:', competition.type);
      }

      const { data, error } = await playersQuery;

      if (error) throw error;
      
      // Note: For tournament competitions, players are already filtered by status above
      // Only players with status 'confirmed' or 'qualifying' are included
      // Eliminated, withdrawn, and other non-playing players are automatically excluded
      console.log(`Loaded ${(data || []).length} players for team building`);
      
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalSpent = selectedPlayers.reduce((sum, p) => sum + (p.price || 0), 0);
  const remaining = competition.budget - totalSpent;

  const togglePlayer = (player: Player) => {
    if (selectedPlayers.find((p) => p.id === player.id)) {
      setSelectedPlayers(selectedPlayers.filter((p) => p.id !== player.id));
    } else {
      const newTotal = totalSpent + (player.price || 0);
      if (newTotal <= competition.budget && selectedPlayers.length < competition.max_players) {
        setSelectedPlayers([...selectedPlayers, player]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !teamName || selectedPlayers.length !== competition.max_players) return;

    setSaving(true);
    try {
      if (existingTeam) {
        // Update existing team
        const { error: teamError } = await supabase
          .from('user_teams')
          .update({ team_name: teamName })
          .eq('id', existingTeam.id);

        if (teamError) throw teamError;

        // Remove old players
        const { error: deleteError } = await supabase
          .from('team_players')
          .delete()
          .eq('user_team_id', existingTeam.id);

        if (deleteError) throw deleteError;

        // Add new players
        const teamPlayers = selectedPlayers.map((player) => ({
          user_team_id: existingTeam.id,
          player_id: player.id,
        }));

        // @ts-expect-error - Supabase type inference issue
        const { error: playersError } = await supabase
          .from('team_players')
          .insert(teamPlayers as any);

        if (playersError) throw playersError;

        alert('Team updated successfully!');
      } else {
        // Create new team
        const { data: team, error: teamError } = await (supabase
          .from('user_teams')
          .insert({
            user_id: user.id,
            competition_id: competition.id,
            team_name: teamName,
          } as any)
          .select()
          .single() as any);

        if (teamError) throw teamError;

        const teamPlayers = selectedPlayers.map((player) => ({
          user_team_id: (team as any).id,
          player_id: player.id,
        }));

        const { error: playersError } = await (supabase
          .from('team_players')
          .insert(teamPlayers as any) as any);

        if (playersError) throw playersError;

        alert('Team created successfully!');
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving team:', error);
      alert(`Failed to ${existingTeam ? 'update' : 'create'} team. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(search.toLowerCase())
  );

  // Simple read-only view
  if (readOnly && existingTeam) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-2xl w-full my-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">View Team</h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Team Info */}
            <div className="mb-6 space-y-3">
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-1">{teamName}</h3>
                <p className="text-sm text-slate-400">{competition.name}</p>
                {readOnly && playerPoints.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Total Tournament Points</span>
                      <span className="text-xl font-bold text-emerald-400">
                        {playerPoints.reduce((sum, pp) => sum + pp.points, 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Players */}
            {selectedPlayers.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Selected Players ({selectedPlayers.length}/{competition.max_players})</h3>
                <div className="space-y-2">
                  {selectedPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 text-white font-bold">
                          {player.live_ranking || player.ranking}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{player.name}</div>
                          <div className="text-sm text-slate-400">
                            {player.country} • {player.points?.toLocaleString()} pts
                            {readOnly && (() => {
                              const playerPointsData = playerPoints.find(pp => pp.player_id === player.id);
                              const tournamentPoints = playerPointsData?.points || 0;
                              if (tournamentPoints > 0) {
                                return (
                                  <span className="ml-2 text-emerald-400 font-semibold">
                                    • Tournament: {tournamentPoints} pts
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {readOnly && (() => {
                          const playerPointsData = playerPoints.find(pp => pp.player_id === player.id);
                          const tournamentPoints = playerPointsData?.points || 0;
                          if (tournamentPoints > 0) {
                            return (
                              <div className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500/20 rounded text-emerald-400 text-sm font-semibold">
                                <Trophy className="h-4 w-4" />
                                <span>{tournamentPoints}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <div className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500/20 rounded text-emerald-400 text-sm font-semibold">
                          <Coins className="h-4 w-4" />
                          <span>{player.price}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team Stats */}
            <div className="mt-6 pt-6 border-t border-slate-700 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Total Spent: <span className="font-semibold text-white">{totalSpent}</span> coins
              </div>
              <div className="text-sm text-slate-400">
                Remaining: <span className="font-semibold text-emerald-400">{remaining}</span> coins
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Build Your Team</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="space-y-3">
            <p className="text-slate-300">{competition.name}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-slate-400">
                  Players: {selectedPlayers.length}/{competition.max_players}
                </div>
                <div className="flex items-center space-x-2">
                  <Coins className="h-4 w-4 text-emerald-400" />
                  <span className={`text-sm font-semibold ${
                    remaining < 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {remaining} / {competition.budget} coins
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Spent: {totalSpent} coins
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              disabled={readOnly}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your team name"
            />
          </div>

          {showingAllPlayers && competition.type === 'per_competition' && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-center space-x-2 text-amber-400">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-sm font-medium">Showing all players</span>
              </div>
              <p className="text-xs text-amber-300 mt-1">
                Player schedules haven't been created for this tournament yet. You can still build your team, but consider fetching player schedules for more accurate tournament participation data.
              </p>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Search Players
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={readOnly}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Search by player name"
            />
          </div>

          {selectedPlayers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Selected Players</h3>
              <div className="grid gap-2">
                {selectedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-sm">
                        {player.live_ranking || player.ranking}
                      </div>
                      <div>
                        <div className="font-medium text-white">{player.name}</div>
                        <div className="text-xs text-slate-400">
                          {player.country} • {player.points?.toLocaleString()} pts
                          {competition.type === 'per_competition' && playerStatuses[player.id] && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                              playerStatuses[player.id] === 'confirmed' 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-green-500/20 text-green-400'
                            }`}>
                              {playerStatuses[player.id] === 'confirmed' ? 'Main Draw' : 'Qualifying'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {readOnly && (() => {
                          const playerPointsData = playerPoints.find(pp => pp.player_id === player.id);
                          const tournamentPoints = playerPointsData?.points || 0;
                          return (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-emerald-500/20 rounded text-emerald-400 text-xs font-semibold">
                              <Trophy className="h-3 w-3" />
                              <span>{tournamentPoints} pts</span>
                            </div>
                          );
                        })()}
                        <div className="flex items-center space-x-1 px-2 py-1 bg-emerald-500/20 rounded text-emerald-400 text-xs font-semibold">
                          <Coins className="h-3 w-3" />
                          <span>{player.price}</span>
                        </div>
                      </div>
                    </div>
                    {!readOnly && (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => togglePlayer(player)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300">Available Players</h3>
              {competition.type === 'per_competition' && (
                <div className="text-xs text-slate-500">
                  Only players in main draw or qualifying (excludes withdrawn/eliminated)
                </div>
              )}
            </div>
            {competition.type === 'per_competition' && (
              <div className="flex items-center space-x-4 mb-3 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-slate-400">Main Draw</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-slate-400">Qualifying</span>
                </div>
              </div>
            )}
            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading players...</div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                {competition.type === 'per_competition' ? (
                  <div className="space-y-4">
                    <p>No players in main draw or qualifying for this tournament yet.</p>
                    <p className="text-sm">Player schedules may not have been created for this tournament.</p>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-player-schedules`, {
                            headers: {
                              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                            },
                          });
                          if (response.ok) {
                            alert('Player schedules are being fetched. Please refresh the page in a moment.');
                            window.location.reload();
                          } else {
                            alert('Failed to fetch player schedules. Please try again.');
                          }
                        } catch (error) {
                          console.error('Error fetching player schedules:', error);
                          alert('Error fetching player schedules. Please try again.');
                        }
                      }}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      Fetch Player Schedules
                    </button>
                  </div>
                ) : (
                  'No players available.'
                )}
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredPlayers.map((player) => {
                  const isSelected = selectedPlayers.find((p) => p.id === player.id);
                  const wouldExceedBudget = !isSelected && (totalSpent + (player.price || 0)) > competition.budget;
                  const canSelect = selectedPlayers.length < competition.max_players && !wouldExceedBudget;

                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => togglePlayer(player)}
                      disabled={readOnly || (!canSelect && !isSelected)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-emerald-500/20 border border-emerald-500/50'
                          : canSelect
                          ? 'bg-slate-900 border border-slate-700 hover:border-emerald-500/50'
                          : 'bg-slate-900/50 border border-slate-700/50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 text-slate-300 font-bold text-sm">
                          {player.live_ranking || player.ranking}
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-white">{player.name}</div>
                          <div className="text-xs text-slate-400">
                            {player.country} • {player.points?.toLocaleString()} pts
                            {competition.type === 'per_competition' && playerStatuses[player.id] && (
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                                playerStatuses[player.id] === 'confirmed' 
                                  ? 'bg-blue-500/20 text-blue-400' 
                                  : 'bg-green-500/20 text-green-400'
                              }`}>
                                {playerStatuses[player.id] === 'confirmed' ? 'Main Draw' : 'Qualifying'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1 px-2 py-1 bg-slate-700/50 rounded text-slate-300 text-sm font-semibold">
                          <Coins className="h-4 w-4" />
                          <span>{player.price}</span>
                        </div>
                        {isSelected ? (
                          <Trophy className="h-5 w-5 text-emerald-400" />
                        ) : canSelect ? (
                          <Plus className="h-5 w-5 text-slate-400" />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {!readOnly && (
            <button
              type="submit"
              disabled={
                saving ||
                !teamName ||
                selectedPlayers.length !== competition.max_players ||
                remaining < 0 ||
                !user
              }
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30"
            >
              {saving
                ? 'Saving Team...'
                : !user
                ? 'Sign in to save team'
                : selectedPlayers.length !== competition.max_players
                ? `Select ${competition.max_players - selectedPlayers.length} more player(s)`
                : 'Save Team'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
