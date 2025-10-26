import { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, Lock, Coins, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TeamBuilder from './TeamBuilder';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Tournament = Database['public']['Tables']['tournaments']['Row'];

interface CompetitionType {
  id: string;
  name: string;
  description: string;
  type: 'season' | 'road_to_major' | 'per_competition' | 'per_gameweek';
  maxPlayers: number;
  maxChanges: number;
  icon: JSX.Element;
  color: string;
}

const competitionTypes: CompetitionType[] = [
  {
    id: 'season',
    name: 'Season Leaderboard',
    description: 'Your picks for the entire season - 8 players with only 2 changes all year',
    type: 'season',
    maxPlayers: 8,
    maxChanges: 2,
    icon: <Trophy className="h-8 w-8" />,
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'road-ao',
    name: 'Road to Australian Open',
    description: 'December to January tournaments - 8 players with 1 change allowed',
    type: 'road_to_major',
    maxPlayers: 8,
    maxChanges: 1,
    icon: <Calendar className="h-8 w-8" />,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'road-rg',
    name: 'Road to Roland Garros',
    description: 'January to May tournaments - 8 players with 1 change allowed',
    type: 'road_to_major',
    maxPlayers: 8,
    maxChanges: 1,
    icon: <Calendar className="h-8 w-8" />,
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'road-wimbledon',
    name: 'Road to Wimbledon',
    description: 'June tournaments - 8 players with 1 change allowed',
    type: 'road_to_major',
    maxPlayers: 8,
    maxChanges: 1,
    icon: <Calendar className="h-8 w-8" />,
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'road-uso',
    name: 'Road to US Open',
    description: 'July to August tournaments - 8 players with 1 change allowed',
    type: 'road_to_major',
    maxPlayers: 8,
    maxChanges: 1,
    icon: <Calendar className="h-8 w-8" />,
    color: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'road-finals',
    name: 'Road to Finals',
    description: 'August to November tournaments - 8 players with 1 change allowed',
    type: 'road_to_major',
    maxPlayers: 8,
    maxChanges: 1,
    icon: <Calendar className="h-8 w-8" />,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'per-gameweek',
    name: 'Weekly Fantasy',
    description: 'Pick 8 players each week across all ongoing tournaments - no changes',
    type: 'per_gameweek',
    maxPlayers: 8,
    maxChanges: 0,
    icon: <Users className="h-8 w-8" />,
    color: 'from-emerald-500 to-teal-500',
  },
];

interface PerCompetitionData {
  id: string;
  name: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  max_players: number;
  max_changes: number;
  tournament: {
    name: string;
    category: string;
    location: string;
  };
}

export default function Competitions() {
  const { user } = useAuth();
  const [selectedCompetition, setSelectedCompetition] = useState<CompetitionType | null>(null);
  const [perCompetitions, setPerCompetitions] = useState<PerCompetitionData[]>([]);
  const [selectedPerCompetition, setSelectedPerCompetition] = useState<PerCompetitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [competitionTournaments, setCompetitionTournaments] = useState<Record<string, Tournament[]>>({});
  const [dbCompetitionIds, setDbCompetitionIds] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPerCompetitions();
    fetchCompetitionTournaments();
  }, []);

  const fetchCompetitionTournaments = async () => {
    try {
      const { data: competitions, error: compError } = await supabase
        .from('competitions')
        .select('id, name, type')
        .in('type', ['season', 'road_to_major', 'per_gameweek']);

      if (compError) throw compError;

      const tournamentsMap: Record<string, Tournament[]> = {};
      const idMap: Record<string, string> = {};

      for (const comp of competitions || []) {
        const { data, error } = await supabase
          .from('competition_tournaments')
          .select('tournament_id, tournaments(*)')
          .eq('competition_id', comp.id);

        if (error) throw error;

        const tournaments = data?.map(ct => ct.tournaments).filter(Boolean) as Tournament[] || [];
        tournamentsMap[comp.id] = tournaments;

        // Map competition name to ID for matching with static types
        if (comp.name.toLowerCase().includes('season')) {
          idMap['season'] = comp.id;
        } else if (comp.name.toLowerCase().includes('australian')) {
          idMap['road-ao'] = comp.id;
        } else if (comp.name.toLowerCase().includes('roland') || comp.name.toLowerCase().includes('french')) {
          idMap['road-rg'] = comp.id;
        } else if (comp.name.toLowerCase().includes('wimbledon')) {
          idMap['road-wimbledon'] = comp.id;
        } else if (comp.name.toLowerCase().includes('us open')) {
          idMap['road-uso'] = comp.id;
        } else if (comp.name.toLowerCase().includes('finals')) {
          idMap['road-finals'] = comp.id;
        } else if (comp.type === 'per_gameweek') {
          idMap['per-gameweek'] = comp.id;
        }
      }

      setDbCompetitionIds(idMap);
      setCompetitionTournaments(tournamentsMap);
    } catch (error) {
      console.error('Error fetching competition tournaments:', error);
    }
  };

  const fetchPerCompetitions = async () => {
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select(`
          id,
          name,
          type,
          status,
          start_date,
          end_date,
          max_players,
          max_changes,
          tournaments:tournament_id (
            name,
            category,
            location
          )
        `)
        .eq('type', 'per_competition')
        .order('start_date', { ascending: true });

      if (error) throw error;

      const formatted = data?.map(item => ({
        ...item,
        tournament: Array.isArray(item.tournaments) ? item.tournaments[0] : item.tournaments
      })) || [];

      setPerCompetitions(formatted);
    } catch (error) {
      console.error('Error fetching competitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCompetition = (comp: CompetitionType) => {
    if (!user) {
      alert('Please sign in to join a competition');
      return;
    }
    setSelectedCompetition(comp);
  };

  const handleJoinPerCompetition = (comp: PerCompetitionData) => {
    if (!user) {
      alert('Please sign in to join a competition');
      return;
    }
    setSelectedPerCompetition(comp);
  };

  const mockCompetitionData = {
    id: '00000000-0000-0000-0000-000000000000',
    name: selectedCompetition?.name || '',
    type: selectedCompetition?.type || 'season',
    max_players: selectedCompetition?.maxPlayers || 10,
    max_changes: selectedCompetition?.maxChanges || 0,
    budget: selectedCompetition?.maxPlayers === 5 ? 50 : 100,
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    status: 'active' as const,
    tournament_id: null,
    major_target: null,
    gameweek_number: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'grand_slam':
        return 'from-amber-500 to-orange-500';
      case 'masters_1000':
        return 'from-emerald-500 to-teal-500';
      case 'finals':
        return 'from-purple-500 to-pink-500';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'grand_slam':
        return 'Grand Slam';
      case 'masters_1000':
        return 'Masters 1000';
      case '500':
        return '500';
      case '250':
        return '250';
      case 'finals':
        return 'Finals';
      default:
        return category;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white flex items-center space-x-3">
          <Trophy className="h-8 w-8 text-emerald-400" />
          <span>Competitions</span>
        </h2>
        <p className="text-slate-400 mt-1">Join upcoming tournaments and compete</p>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-white mb-4">Tournament Competitions</h3>
        {loading ? (
          <div className="text-center py-12">
            <div className="text-slate-400">Loading competitions...</div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {perCompetitions.map((comp) => (
              <div
                key={comp.id}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10"
              >
                <div className={`h-2 bg-gradient-to-r ${getCategoryColor(comp.tournament.category)}`}></div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r ${getCategoryColor(comp.tournament.category)}`}>
                      {getCategoryBadge(comp.tournament.category)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      comp.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                      comp.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' :
                      comp.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {comp.status.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1">{comp.tournament.name}</h3>
                  <p className="text-slate-400 text-xs mb-4">{comp.tournament.location}</p>

                  <div className="space-y-2 mb-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Dates</span>
                      <span className="text-white font-medium">
                        {new Date(comp.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(comp.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Team Size</span>
                      <span className="text-white font-medium">{comp.max_players} players</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Budget</span>
                      <span className="text-emerald-400 font-semibold">50 coins</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoinPerCompetition(comp)}
                    disabled={comp.status === 'completed' || comp.status === 'upcoming'}
                    className="w-full py-2 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {comp.status === 'active' || comp.status === 'open' ? 'Join Now' : comp.status === 'upcoming' ? 'Coming Soon' : 'Completed'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-2xl font-bold text-white mb-4">Other Competition Types</h3>
        <p className="text-slate-400 text-sm mb-4">Season long, road to majors, and weekly competitions</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {competitionTypes.map((comp) => {
          const dbId = dbCompetitionIds[comp.id];
          const tournaments = dbId ? competitionTournaments[dbId] || [] : [];

          return (
          <div
            key={comp.id}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10"
          >
            <div className={`h-2 bg-gradient-to-r ${comp.color}`}></div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${comp.color} text-white`}>
                  {comp.icon}
                </div>
                <div className="flex items-center space-x-2">
                  {tournaments.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTooltip(showTooltip === comp.id ? null : comp.id);
                        }}
                        className="flex items-center space-x-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium hover:bg-blue-500/30 transition-colors"
                      >
                        <Info className="h-3 w-3" />
                        <span>{tournaments.length} tournaments</span>
                      </button>

                      {showTooltip === comp.id && (
                        <div className="absolute right-0 z-50 mt-2 w-80 p-4 bg-slate-800 border border-slate-600 rounded-lg shadow-xl">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-white font-semibold text-sm">Included Tournaments</h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowTooltip(null);
                              }}
                              className="text-slate-400 hover:text-white"
                            >
                              ×
                            </button>
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {tournaments.map((tournament) => (
                              <div
                                key={tournament.id}
                                className="p-2 bg-slate-900/50 rounded border border-slate-700"
                              >
                                <div className="text-white text-xs font-medium">{tournament.name}</div>
                                <div className="text-xs text-slate-400 mt-1">
                                  {tournament.category} • {new Date(tournament.start_date).toLocaleDateString()}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
                            Points earned in these tournaments contribute to this competition.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <span className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded-full text-xs font-medium">
                    {comp.type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{comp.name}</h3>
              <p className="text-slate-400 text-sm mb-6">{comp.description}</p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Max Players</span>
                  </span>
                  <span className="text-white font-semibold">{comp.maxPlayers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center space-x-2">
                    <Coins className="h-4 w-4" />
                    <span>Budget</span>
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    {comp.maxPlayers === 5 ? 50 : 100} coins
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <span>Max Changes</span>
                  </span>
                  <span className="text-white font-semibold">
                    {comp.maxChanges === 0 ? 'None' : comp.maxChanges}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleJoinCompetition(comp)}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
              >
                Join Competition
              </button>
            </div>
          </div>
          );
        })}
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">How It Works</h3>
        <div className="space-y-3 text-slate-300">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
              1
            </div>
            <p>Choose a competition type based on your preferred fantasy format</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
              2
            </div>
            <p>Select your players from the ATP rankings within the player limits</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
              3
            </div>
            <p>Earn points based on player performance in tournaments</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
              4
            </div>
            <p>Climb the leaderboard and compete with other fantasy managers</p>
          </div>
        </div>
      </div>

      {selectedCompetition && (
        <TeamBuilder
          competition={mockCompetitionData}
          onClose={() => setSelectedCompetition(null)}
        />
      )}

      {selectedPerCompetition && (
        <TeamBuilder
          competition={{
            id: selectedPerCompetition.id,
            name: selectedPerCompetition.tournament.name,
            type: selectedPerCompetition.type as 'season' | 'road_to_major' | 'per_competition' | 'per_gameweek',
            max_players: selectedPerCompetition.max_players,
            max_changes: selectedPerCompetition.max_changes,
            budget: 50,
            start_date: selectedPerCompetition.start_date,
            end_date: selectedPerCompetition.end_date,
            status: selectedPerCompetition.status as 'upcoming' | 'active' | 'completed',
            tournament_id: selectedPerCompetition.id,
            major_target: null,
            gameweek_number: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}
          onClose={() => setSelectedPerCompetition(null)}
        />
      )}
    </div>
  );
}
