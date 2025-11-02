import { useEffect, useState } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { RefreshCw, Calendar, MapPin, Trophy, ArrowRight } from 'lucide-react';
import type { Database } from '../lib/database.types';
import TeamBuilder from './TeamBuilder';
import TournamentPlayersModal from './TournamentPlayersModal';
import { useAuth } from '../contexts/AuthContext';

type Competition = Database['public']['Tables']['competitions']['Row'];
type Tournament = Database['public']['Tables']['tournaments']['Row'];

interface CompetitionInfo {
  id: string;
  name: string;
  status: string;
  type: string;
  max_players: number;
  max_changes: number;
  budget: number;
  start_date: string;
  end_date: string;
  tournament_id: string | null;
}

const categoryLabels: Record<string, string> = {
  grand_slam: 'Grand Slam',
  masters_1000: 'Masters 1000',
  '500': '500',
  '250': '250',
  finals: 'Finals',
  challenger: 'Challenger',
  other: 'Other',
};

const categoryColors: Record<string, string> = {
  grand_slam: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  masters_1000: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  '500': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  '250': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  finals: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  challenger: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  other: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

const surfaceIcons: Record<string, string> = {
  hard: '🎾',
  clay: '🧱',
  grass: '🌿',
  carpet: '🎨',
};

export default function Schedule() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');
  const [competitionsMap, setCompetitionsMap] = useState<Record<string, CompetitionInfo>>({});
  const [selectedCompetition, setSelectedCompetition] = useState<CompetitionInfo | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    fetchTournaments();
    fetchCompetitions();
  }, []);

  async function fetchTournaments() {
    try {
      // Update tournament statuses based on dates before fetching
      await supabase.rpc('update_tournament_status_on_dates');
      
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCompetitions() {
    try {
      // Update competition statuses based on deadline before fetching
      await supabase.rpc('update_competition_status_on_deadline');
      
      const { data, error } = await (supabase
        .from('competitions')
        .select('id, name, status, type, max_players, max_changes, budget, start_date, end_date, tournament_id')
        .eq('type', 'per_competition')
        .not('tournament_id', 'is', null) as any);

      if (error) throw error;

      const map: Record<string, CompetitionInfo> = {};
      (data as any)?.forEach((comp: any) => {
        if (comp.tournament_id) {
          map[comp.tournament_id] = {
            id: comp.id,
            name: comp.name,
            status: comp.status,
            type: comp.type,
            max_players: comp.max_players,
            max_changes: comp.max_changes,
            budget: comp.budget,
            start_date: comp.start_date,
            end_date: comp.end_date,
            tournament_id: comp.tournament_id,
          };
        }
      });
      setCompetitionsMap(map);
    } catch (error) {
      console.error('Error fetching competitions:', error);
    }
  }

  async function refreshSchedule() {
    setRefreshing(true);
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/fetch-tournament-schedules`,
        {
          headers: {
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to refresh schedule');
      }

      await fetchTournaments();
    } catch (error) {
      console.error('Error refreshing schedule:', error);
      alert('Failed to refresh schedule. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }

  const filteredTournaments = tournaments.filter(
    (t) => filter === 'all' || t.status === filter
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-emerald-400" />
            <span>Tournament Schedule</span>
          </h2>
          <p className="text-slate-400 mt-1">ATP and Challenger tour schedules</p>
        </div>
        <button
          onClick={refreshSchedule}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2">
        {(['all', 'upcoming', 'ongoing', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              filter === status
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {filteredTournaments.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-12 text-center">
          <Calendar className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Tournaments Found</h3>
          <p className="text-slate-400 mb-6">
            Click the refresh button to fetch the latest tournament schedule
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTournaments.map((tournament) => (
            <div
              key={tournament.id}
              onClick={() => setSelectedTournament(tournament)}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">
                    {tournament.name}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-slate-300 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>{tournament.location || 'TBD'}</span>
                  </div>
                </div>
                <Trophy className={`h-6 w-6 ${
                  tournament.category === 'grand_slam' ? 'text-rose-400' :
                  tournament.category === 'atp_1000' ? 'text-amber-400' :
                  'text-emerald-400'
                }`} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Surface:</span>
                  <span className="text-white flex items-center space-x-1">
                    <span>{surfaceIcons[tournament.surface || 'hard']}</span>
                    <span>{tournament.surface?.toUpperCase() || 'HARD'}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Dates:</span>
                  <span className="text-white">
                    {new Date(tournament.start_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' - '}
                    {new Date(tournament.end_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      categoryColors[tournament.category]
                    }`}
                  >
                    {categoryLabels[tournament.category]}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      tournament.status === 'ongoing'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : tournament.status === 'upcoming'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-slate-600/20 text-slate-400'
                    }`}
                  >
                    {tournament.status.toUpperCase()}
                  </span>
                </div>

                {competitionsMap[tournament.id] && tournament.status === 'upcoming' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering tournament modal
                      if (!user) {
                        alert('Please sign in to join a competition');
                        return;
                      }
                      setSelectedCompetition(competitionsMap[tournament.id]);
                    }}
                    className="w-full mt-3 py-2 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 flex items-center justify-center space-x-2"
                  >
                    <span>Join Competition</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCompetition && (
        <TeamBuilder
          competition={{
            id: selectedCompetition.id,
            name: selectedCompetition.name,
            type: selectedCompetition.type as 'season' | 'road_to_major' | 'per_competition' | 'per_gameweek',
            max_players: selectedCompetition.max_players,
            max_changes: selectedCompetition.max_changes,
            budget: selectedCompetition.budget,
            start_date: selectedCompetition.start_date,
            end_date: selectedCompetition.end_date,
            status: selectedCompetition.status as 'upcoming' | 'active' | 'completed',
            tournament_id: selectedCompetition.tournament_id,
            major_target: null,
            gameweek_number: null,
            join_deadline: null,
            number_of_players: null,
            first_round: null,
            points_per_round: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Competition}
          onClose={() => setSelectedCompetition(null)}
        />
      )}

      {selectedTournament && (
        <TournamentPlayersModal
          tournament={selectedTournament}
          onClose={() => setSelectedTournament(null)}
        />
      )}
    </div>
  );
}
