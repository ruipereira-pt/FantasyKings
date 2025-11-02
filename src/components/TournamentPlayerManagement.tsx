import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Search } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Tournament = Database['public']['Tables']['tournaments']['Row'];
type Player = Database['public']['Tables']['players']['Row'];

interface PlayerSchedule {
  id: string;
  player_id: string;
  tournament_id: string;
  status: 'confirmed' | 'qualifying' | 'alternate' | 'withdrawn' | 'eliminated' | 'champion';
  entry_type: string;
  seed_number?: number;
  players: Player;
}

export default function TournamentPlayerManagement() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<PlayerSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchTournamentPlayers();
    }
  }, [selectedTournament]);

  async function fetchTournaments() {
    try {
      // Update tournament statuses based on dates before fetching
      await supabase.rpc('update_tournament_status_on_dates');
      
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;

      setTournaments(data || []);
      if (data && data.length > 0 && !selectedTournament) {
        setSelectedTournament(data[0]);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
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
          players!inner (
            id,
            name,
            country,
            ranking
          )
        `)
        .eq('tournament_id', selectedTournament.id)
        .order('players(ranking)', { ascending: true });

      if (error) throw error;

      setPlayers((data || []) as unknown as PlayerSchedule[]);
    } catch (error) {
      console.error('Error fetching tournament players:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updatePlayerStatus(scheduleId: string, newStatus: string) {
    setSaving(true);
    try {
      const query = (supabase.from('player_schedules').update({ status: newStatus as any } as any).eq('id', scheduleId) as any);
      const { error } = await (query as any);

      if (error) {
        console.error('Update error details:', error);
        throw error;
      }

      await fetchTournamentPlayers();
    } catch (error: any) {
      console.error('Error updating player status:', error);
      alert(`Failed to update player status: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  }

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.players.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || player.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'qualifying':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'alternate':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'withdrawn':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'eliminated':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      case 'champion':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  if (loading && !selectedTournament) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-emerald-400" />
            <span>Tournament Player Management</span>
          </h2>
          <p className="text-slate-400 mt-1">Manage player statuses for tournaments</p>
        </div>
      </div>

      {/* Tournament Selection */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
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
          <option value="">Select a tournament...</option>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name} - {new Date(tournament.start_date).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {selectedTournament && (
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
          </div>

          {/* Filters and Search */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="qualifying">Qualifying</option>
                  <option value="alternate">Alternate</option>
                  <option value="withdrawn">Withdrawn</option>
                  <option value="eliminated">Eliminated</option>
                  <option value="champion">Champion</option>
                </select>
              </div>
            </div>
          </div>

          {/* Players List */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Players ({filteredPlayers.length})</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No players found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPlayers.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-700 text-slate-300 font-bold text-sm">
                        {schedule.players.ranking || '-'}
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          {schedule.players.name}
                          {schedule.seed_number && (
                            <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-bold">
                              #{schedule.seed_number}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-400">
                          {schedule.players.country} • {schedule.entry_type}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(schedule.status)}`}>
                        {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                      </div>
                    </div>
                    <select
                      value={schedule.status}
                      onChange={(e) => updatePlayerStatus(schedule.id, e.target.value)}
                      disabled={saving}
                      className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="qualifying">Qualifying</option>
                      <option value="alternate">Alternate</option>
                      <option value="withdrawn">Withdrawn</option>
                      <option value="eliminated">Eliminated</option>
                      <option value="champion">Champion</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
