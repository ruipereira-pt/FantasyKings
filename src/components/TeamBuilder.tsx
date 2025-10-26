import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Plus, Trash2, Trophy, Coins, TrendingDown } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Player = Database['public']['Tables']['players']['Row'];
type Competition = Database['public']['Tables']['competitions']['Row'];

interface TeamBuilderProps {
  competition: Competition;
  onClose: () => void;
}

export default function TeamBuilder({ competition, onClose }: TeamBuilderProps) {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('live_ranking', { ascending: true, nullsFirst: false })
        .limit(100);

      if (error) throw error;
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
      const { data: team, error: teamError } = await supabase
        .from('user_teams')
        .insert({
          user_id: user.id,
          competition_id: competition.id,
          team_name: teamName,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      const teamPlayers = selectedPlayers.map((player) => ({
        user_team_id: team.id,
        player_id: player.id,
      }));

      const { error: playersError } = await supabase
        .from('team_players')
        .insert(teamPlayers);

      if (playersError) throw playersError;

      alert('Team created successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating team:', error);
      alert('Failed to create team. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(search.toLowerCase())
  );

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
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Enter your team name"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Search Players
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
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
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 px-2 py-1 bg-emerald-500/20 rounded text-emerald-400 text-xs font-semibold">
                        <Coins className="h-3 w-3" />
                        <span>{player.price}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => togglePlayer(player)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Available Players</h3>
            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading players...</div>
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
                      disabled={!canSelect && !isSelected}
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
              ? 'Creating Team...'
              : !user
              ? 'Sign in to create team'
              : selectedPlayers.length !== competition.max_players
              ? `Select ${competition.max_players - selectedPlayers.length} more player(s)`
              : 'Create Team'}
          </button>
        </form>
      </div>
    </div>
  );
}
