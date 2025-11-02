import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Calendar, TrendingUp, Plus, Save, X, DollarSign, Edit2 } from 'lucide-react';
import type { Database } from '../lib/database.types';
import PlayerScheduleModal from './PlayerScheduleModal';

type Player = Database['public']['Tables']['players']['Row'];
type Tournament = Database['public']['Tables']['tournaments']['Row'];

interface PriceHistoryEntry {
  week_start_date: string;
  price: number | string;
  ranking: number | null;
}

interface PlayerScheduleEntry {
  id?: string;
  tournament_id: string;
  tournament_name: string;
  status: string;
}

export default function PlayerManagement() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [schedules, setSchedules] = useState<PlayerScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ tournament_id: '', status: 'registered' });
  const [refreshingRankings, setRefreshingRankings] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerSchedule(selectedPlayer.id);
      fetchPriceHistory(selectedPlayer.id);
    }
  }, [selectedPlayer]);

  async function fetchPriceHistory(playerId: string) {
    try {
      const { data, error } = await supabase
        .from('player_price_history')
        .select('week_start_date, price, ranking')
        .eq('player_id', playerId)
        .order('week_start_date', { ascending: false })
        .limit(12); // Last 12 weeks

      if (error) {
        // Handle case where table doesn't exist yet (migration not run)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('player_price_history table not found. Please run migrations.');
          setPriceHistory([]);
          return;
        }
        throw error;
      }
      setPriceHistory((data || []) as PriceHistoryEntry[]);
    } catch (error) {
      console.error('Error fetching price history:', error);
      // Set empty array on any error to prevent UI breaking
      setPriceHistory([]);
    }
  }

  async function fetchData() {
    try {
      const [playersRes, tournamentsRes] = await Promise.all([
        supabase.from('players').select('*').order('ranking'),
        supabase.from('tournaments').select('*').order('start_date')
      ]);

      if (playersRes.error) throw playersRes.error;
      if (tournamentsRes.error) throw tournamentsRes.error;

      setPlayers(playersRes.data || []);
      setTournaments(tournamentsRes.data || []);

      if (playersRes.data && playersRes.data.length > 0 && !selectedPlayer) {
        setSelectedPlayer(playersRes.data[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPlayerSchedule(playerId: string) {
    try {
      const { data, error } = await supabase
        .from('player_schedules')
        .select(`
          id,
          tournament_id,
          status,
          tournament:tournaments(name)
        `)
        .eq('player_id', playerId);

      if (error) throw error;

      const formattedSchedules = ((data || []) as any[]).map((item: any) => ({
        id: item.id,
        tournament_id: item.tournament_id,
        tournament_name: item.tournament?.name || 'Unknown',
        status: item.status,
      }));

      setSchedules(formattedSchedules);
    } catch (error) {
      console.error('Error fetching player schedule:', error);
    }
  }

  async function addSchedule() {
    if (!selectedPlayer || !newSchedule.tournament_id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('player_schedules')
        .insert({
          player_id: selectedPlayer.id,
          tournament_id: newSchedule.tournament_id,
          status: newSchedule.status as any,
        } as any);

      if (error) throw error;

      await fetchPlayerSchedule(selectedPlayer.id);
      setAddingSchedule(false);
      setNewSchedule({ tournament_id: '', status: 'registered' });
    } catch (error) {
      console.error('Error adding schedule:', error);
      alert('Failed to add schedule');
    } finally {
      setSaving(false);
    }
  }

  async function removeSchedule(scheduleId: string) {
    if (!confirm('Are you sure you want to remove this schedule entry?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('player_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      if (selectedPlayer) {
        await fetchPlayerSchedule(selectedPlayer.id);
      }
    } catch (error) {
      console.error('Error removing schedule:', error);
      alert('Failed to remove schedule');
    } finally {
      setSaving(false);
    }
  }

  async function refreshRankings() {
    setRefreshingRankings(true);
    try {
      // Get the current user's session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('You must be logged in to refresh rankings');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-rankings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully updated ${result.count} player rankings from ATP sources!`);
        // Refresh the players list
        await fetchData();
      } else {
        const error = await response.json();
        alert(`Failed to refresh rankings: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error refreshing rankings:', error);
      alert('Failed to refresh rankings. Please try again.');
    } finally {
      setRefreshingRankings(false);
    }
  }

  async function updateScheduleStatus(scheduleId: string, newStatus: string) {
    setSaving(true);
    try {
      const query = (supabase.from('player_schedules').update({ status: newStatus as any } as any).eq('id', scheduleId) as any);
      const { error } = await query;

      if (error) throw error;

      if (selectedPlayer) {
        await fetchPlayerSchedule(selectedPlayer.id);
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Failed to update schedule');
    } finally {
      setSaving(false);
    }
  }

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <div className="mb-4 space-y-3">
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
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {filteredPlayers.length} players found
            </div>
            <button
              onClick={refreshRankings}
              disabled={refreshingRankings}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span>{refreshingRankings ? 'Updating...' : 'Refresh ATP Rankings'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredPlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => setSelectedPlayer(player)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedPlayer?.id === player.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="font-semibold">{player.name}</div>
              <div className="text-sm opacity-80">
                Rank #{player.ranking} • {player.country}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-emerald-400" />
              <h3 className="text-xl font-bold text-white">
                Schedule Updates - {selectedPlayer?.name}
              </h3>
            </div>
            <button
              onClick={() => setAddingSchedule(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add</span>
            </button>
          </div>

          {addingSchedule && (
            <div className="mb-4 p-4 bg-slate-900/50 border border-slate-600 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-semibold">Add Tournament</h4>
                <button
                  onClick={() => setAddingSchedule(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tournament
                  </label>
                  <select
                    value={newSchedule.tournament_id}
                    onChange={(e) => setNewSchedule({ ...newSchedule, tournament_id: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select tournament...</option>
                    {tournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id}>
                        {tournament.name} - {new Date(tournament.start_date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Status
                  </label>
                  <select
                    value={newSchedule.status}
                    onChange={(e) => setNewSchedule({ ...newSchedule, status: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="registered">Registered (Main Draw)</option>
                    <option value="qualifying">Qualifying</option>
                    <option value="alternate">Alternate</option>
                    <option value="withdrawn">Withdrawn</option>
                    <option value="eliminated">Eliminated</option>
                    <option value="champion">Champion</option>
                  </select>
                </div>
                <button
                  onClick={addSchedule}
                  disabled={saving || !newSchedule.tournament_id}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  <Save className="h-5 w-5" />
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {schedules.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No schedule entries</p>
              </div>
            ) : (
              schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-2">{schedule.tournament_name}</h4>
                      <select
                        value={schedule.status}
                        onChange={(e) => schedule.id && updateScheduleStatus(schedule.id, e.target.value)}
                        disabled={saving}
                        className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="registered">Registered (Main Draw)</option>
                        <option value="qualifying">Qualifying</option>
                        <option value="alternate">Alternate</option>
                        <option value="withdrawn">Withdrawn</option>
                        <option value="eliminated">Eliminated</option>
                        <option value="champion">Champion</option>
                      </select>
                    </div>
                    <button
                      onClick={() => schedule.id && removeSchedule(schedule.id)}
                      disabled={saving}
                      className="ml-4 p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Price History Dashboard */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <DollarSign className="h-6 w-6 text-blue-400" />
            <h3 className="text-xl font-bold text-white">Price History Dashboard</h3>
          </div>
          <p className="text-slate-400 mb-4">
            Weekly price history for {selectedPlayer?.name || 'selected player'}
          </p>
          {priceHistory.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-slate-400 pb-2 border-b border-slate-700">
                <div>Week</div>
                <div>Price</div>
                <div>Ranking</div>
                <div>Change</div>
              </div>
              {priceHistory.map((entry, index) => {
                const prevEntry = priceHistory[index + 1];
                const change = prevEntry ? Number(entry.price) - Number(prevEntry.price) : 0;
                const weekStart = new Date(entry.week_start_date);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                
                return (
                  <div key={entry.week_start_date} className="grid grid-cols-4 gap-4 text-sm py-2 hover:bg-slate-900/50 rounded">
                    <div className="text-slate-300">
                      {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-white font-semibold">${Number(entry.price).toFixed(2)}</div>
                    <div className="text-slate-300">#{entry.ranking || '-'}</div>
                    <div className={change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-slate-400'}>
                      {change > 0 ? '+' : ''}{change.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 bg-slate-900/50 rounded-lg text-center">
              <p className="text-slate-500">
                No price history available yet. Price history is recorded weekly when rankings are updated.
              </p>
            </div>
          )}
        </div>

        {/* Player Schedule View/Edit */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-emerald-400" />
              <h3 className="text-xl font-bold text-white">Player Schedule</h3>
            </div>
            {selectedPlayer && (
              <button
                onClick={() => setShowScheduleModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                <span>View Full Schedule</span>
              </button>
            )}
          </div>
          
          {selectedPlayer && showScheduleModal && (
            <PlayerScheduleModal 
              player={selectedPlayer} 
              onClose={() => setShowScheduleModal(false)} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
