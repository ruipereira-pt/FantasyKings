import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search } from 'lucide-react';
import type { Database } from '../lib/database.types';

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

interface CompetitionTournamentPlayersProps {
  selectedTournament: Tournament | null;
  competitionId: string | null;
}

export default function CompetitionTournamentPlayers({ selectedTournament }: CompetitionTournamentPlayersProps) {
  const [players, setPlayers] = useState<PlayerSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eliminatedRound, setEliminatedRound] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedTournament) {
      fetchTournamentPlayers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTournament]);

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
        .order('players(ranking)', { ascending: true });

      if (error) throw error;

      const schedules = (data || []) as unknown as PlayerSchedule[];
      setPlayers(schedules);
      
      // Initialize eliminated_round state
      const roundMap: Record<string, string> = {};
      schedules.forEach(s => {
        if (s.eliminated_round) {
          roundMap[s.id] = s.eliminated_round;
        }
      });
      setEliminatedRound(roundMap);
    } catch (error) {
      console.error('Error fetching tournament players:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updatePlayerStatus(scheduleId: string, newStatus: string) {
    setSaving(true);
    try {
      const updates: any = { status: newStatus as any };
      
      // If marking as eliminated, ensure eliminated_round is set
      if (newStatus === 'eliminated' && eliminatedRound[scheduleId]) {
        updates.eliminated_round = eliminatedRound[scheduleId];
      } else if (newStatus !== 'eliminated') {
        updates.eliminated_round = null;
      }

      // @ts-expect-error - Supabase type inference issue
      const query = supabase.from('player_schedules').update(updates as any).eq('id', scheduleId);
      const { error } = await query;

      if (error) throw error;

      await fetchTournamentPlayers();
    } catch (error: any) {
      console.error('Error updating player status:', error);
      alert(`Failed to update player status: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  }

  async function updateEliminatedRound(scheduleId: string, round: string) {
    setEliminatedRound(prev => ({ ...prev, [scheduleId]: round }));
    
    setSaving(true);
    try {
      // @ts-expect-error - Supabase type inference issue
      const query = supabase.from('player_schedules').update({ 
        eliminated_round: round,
        status: 'eliminated' as any
      } as any).eq('id', scheduleId);
      const { error } = await query;

      if (error) throw error;

      await fetchTournamentPlayers();
    } catch (error: any) {
      console.error('Error updating eliminated round:', error);
      alert(`Failed to update eliminated round: ${error.message || error}`);
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

  if (!selectedTournament) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <p className="text-slate-400 text-center">Select a tournament to manage players</p>
      </div>
    );
  }

  const isOngoing = selectedTournament.status === 'ongoing';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tournament Info */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-white truncate">{selectedTournament.name}</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {new Date(selectedTournament.start_date).toLocaleDateString()} - {new Date(selectedTournament.end_date).toLocaleDateString()}
            </p>
            <p className="text-xs sm:text-sm text-slate-400 truncate">{selectedTournament.location}</p>
            <span className={`inline-block mt-2 px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
              isOngoing ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'
            }`}>
              {selectedTournament.status}
            </span>
          </div>
          <div className="text-left sm:text-right flex-shrink-0">
            <div className="text-xs sm:text-sm text-slate-400">Total Players</div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400">{players.length}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Players ({filteredPlayers.length})</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No players found</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredPlayers.map((schedule) => (
              <div
                key={schedule.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm flex-shrink-0">
                    {schedule.players.ranking || '-'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm sm:text-base truncate">
                      {schedule.players.name}
                      {schedule.seed_number && (
                        <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-bold">
                          #{schedule.seed_number}
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-400 truncate">
                      {schedule.players.country} • {schedule.entry_type}
                      {schedule.status === 'eliminated' && schedule.eliminated_round && (
                        <span className="ml-1 sm:ml-2 text-red-400">Eliminated in {schedule.eliminated_round.toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getStatusColor(schedule.status)}`}>
                    <span className="hidden sm:inline">{schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}</span>
                    <span className="sm:hidden">{schedule.status.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-2">
                  {isOngoing && schedule.status !== 'champion' && schedule.status !== 'withdrawn' && (
                    <select
                      value={eliminatedRound[schedule.id] || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          updateEliminatedRound(schedule.id, e.target.value);
                        }
                      }}
                      disabled={saving || schedule.status === ('withdrawn' as any)}
                      className="px-2 sm:px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                    >
                      <option value="">Select round...</option>
                      <option value="r128">Round of 128</option>
                      <option value="r64">Round of 64</option>
                      <option value="r32">Round of 32</option>
                      <option value="r16">Round of 16</option>
                      <option value="qf">Quarterfinal</option>
                      <option value="sf">Semifinal</option>
                      <option value="f">Final</option>
                    </select>
                  )}
                  <select
                    value={schedule.status}
                    onChange={(e) => updatePlayerStatus(schedule.id, e.target.value)}
                    disabled={saving}
                    className="px-2 sm:px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="qualifying">Qualifying</option>
                    <option value="alternate">Alternate</option>
                    <option value="withdrawn">Withdrawn</option>
                    <option value="eliminated">Eliminated</option>
                    <option value="champion">Champion</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

