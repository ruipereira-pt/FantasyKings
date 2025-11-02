import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Search, Trophy } from 'lucide-react';
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

interface TournamentPlayersModalProps {
  tournament: Tournament;
  onClose: () => void;
}

export default function TournamentPlayersModal({ tournament, onClose }: TournamentPlayersModalProps) {
  const [players, setPlayers] = useState<PlayerSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchTournamentPlayers();
  }, [tournament.id]);

  async function fetchTournamentPlayers() {
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
            ranking,
            live_ranking
          )
        `)
        .eq('tournament_id', tournament.id)
        .order('players(ranking)', { ascending: true });

      if (error) throw error;

      setPlayers((data || []) as unknown as PlayerSchedule[]);
    } catch (error) {
      console.error('Error fetching tournament players:', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Trophy className="h-6 w-6 text-emerald-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">{tournament.name}</h2>
              <p className="text-slate-400 text-sm mt-1">
                {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()} • {tournament.location}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

          {/* Players List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">No players found for this tournament</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-slate-400 mb-4">
                Showing {filteredPlayers.length} of {players.length} players
              </div>
              {filteredPlayers.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-700 text-slate-300 font-bold text-sm">
                      {schedule.players.ranking || schedule.players.live_ranking || '-'}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">
                        {schedule.players.name}
                        {schedule.seed_number && (
                          <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-bold">
                            #{schedule.seed_number}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400">
                        {schedule.players.country} • {schedule.entry_type || 'Main Draw'}
                        {schedule.status === 'eliminated' && schedule.eliminated_round && (
                          <span className="ml-2 text-red-400">Eliminated in {schedule.eliminated_round.toUpperCase()}</span>
                        )}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(schedule.status)}`}>
                      {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

