import { useState, useEffect } from 'react';
import { Trophy, Award, Medal, Users, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import TeamBuilder from './TeamBuilder';
import type { Database } from '../lib/database.types';

type Competition = Database['public']['Tables']['competitions']['Row'];
type UserTeam = Database['public']['Tables']['user_teams']['Row'];

interface TeamWithDetails extends UserTeam {
  user_email: string;
  player_count: number;
  total_points: number;
  player_points: Array<{
    player_id: string;
    player_name: string;
    points: number;
  }>;
}

interface CompetitionWithTeams {
  competition: Competition;
  teams: TeamWithDetails[];
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [competitionsWithTeams, setCompetitionsWithTeams] = useState<CompetitionWithTeams[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [viewingTeam, setViewingTeam] = useState<any>(null);
  const [viewingCompetition, setViewingCompetition] = useState<any>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // Update competition statuses based on deadline before fetching
      await supabase.rpc('update_competition_status_on_deadline');
      
      // Fetch all competitions with tournament info
      const { data: competitions, error: compError } = await supabase
        .from('competitions')
        .select(`
          *,
          competition_tournaments (
            tournaments (
              name,
              category,
              location
            )
          )
        `)
        .order('start_date', { ascending: false });

      if (compError) throw compError;

      // For each competition, fetch teams and calculate points
      const competitionsData: CompetitionWithTeams[] = [];

      for (const comp of competitions || []) {
        // Get all tournament IDs associated with this competition
        const { data: competitionTournaments, error: ctError } = await (supabase
          .from('competition_tournaments')
          .select('tournament_id')
          .eq('competition_id', (comp as any).id) as any);

        if (ctError) {
          console.error('Error fetching competition tournaments:', (comp as any).id, ctError);
          continue;
        }

        // Get tournament IDs (also include direct tournament_id if exists for backward compatibility)
        const tournamentIds: string[] = [
          ...((competitionTournaments as any)?.map((ct: any) => ct.tournament_id) || []),
          ...((comp as any).tournament_id ? [(comp as any).tournament_id] : [])
        ].filter(Boolean);

        const { data: teams, error: teamsError } = await (supabase
          .from('user_teams')
          .select('*')
          .eq('competition_id', (comp as any).id)
          .order('created_at', { ascending: true }) as any);

        if (teamsError) {
          console.error('Error fetching teams for competition:', (comp as any).id, teamsError);
          continue;
        }

        // Get player counts and calculate points for each team
        const teamsWithDetails: TeamWithDetails[] = await Promise.all(
          ((teams as any) || []).map(async (team: any) => {
            // Get player count
            const { count } = await (supabase
              .from('team_players')
              .select('*', { count: 'exact', head: true })
              .eq('user_team_id', team.id)
              .is('removed_at', null) as any);

            // Get all players in this team
            const { data: teamPlayers, error: tpError } = await (supabase
              .from('team_players')
              .select('player_id, players(id, name)')
              .eq('user_team_id', (team as any).id)
              .is('removed_at', null) as any);

            if (tpError) {
              console.error('Error fetching team players:', tpError);
              return {
                ...team,
                user_email: `User ${team.user_id.substring(0, 8)}`,
                player_count: count || 0,
                total_points: 0,
                player_points: [],
              };
            }

            // Get player IDs
            const playerIds = ((teamPlayers as any) || [])
              .map((tp: any) => tp.player_id)
              .filter(Boolean) as string[];

            // Calculate points: sum fantasy_points from player_performances
            // where player_id is in team and tournament_id is in competition tournaments
            let totalPoints = 0;
            const playerPointsMap: Record<string, number> = {};

            if (playerIds.length > 0 && tournamentIds.length > 0) {
              const { data: performances, error: perfError } = await (supabase
                .from('player_performances')
                .select('player_id, fantasy_points, players(name)')
                .in('player_id', playerIds)
                .in('tournament_id', tournamentIds) as any);

              if (!perfError && performances) {
                // Sum points per player across all tournaments
                (performances as any[]).forEach((perf: any) => {
                  const pid = perf.player_id;
                  const points = perf.fantasy_points || 0;
                  if (!playerPointsMap[pid]) {
                    playerPointsMap[pid] = 0;
                  }
                  playerPointsMap[pid] += points;
                  totalPoints += points;
                });
              }
            }

            // Build player points array
            const playerPoints = ((teamPlayers as any) || [])
              .filter((tp: any) => tp.player_id && tp.players)
              .map((tp: any) => ({
                player_id: tp.player_id as string,
                player_name: (tp.players as any)?.name || 'Unknown',
                points: playerPointsMap[tp.player_id as string] || 0,
              }));

            return {
              ...team,
              user_email: `User ${team.user_id.substring(0, 8)}`,
              player_count: count || 0,
              total_points: totalPoints,
              player_points: playerPoints,
            };
          })
        );

        // Sort teams by total_points descending
        teamsWithDetails.sort((a, b) => b.total_points - a.total_points);

        if (teamsWithDetails.length > 0) {
          competitionsData.push({
            competition: comp,
            teams: teamsWithDetails,
          });
        }
      }

      setCompetitionsWithTeams(competitionsData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTournamentName = (comp: any): string => {
    if (comp.competition_tournaments && comp.competition_tournaments.length > 0) {
      const tournament = comp.competition_tournaments[0].tournaments;
      if (tournament) {
        return Array.isArray(tournament) ? tournament[0].name : tournament.name;
      }
    }
    return comp.name;
  };

  const handleViewTeam = (team: any, competition: any) => {
    setViewingTeam(team);
    setViewingCompetition(competition);
  };

  const openCompetitions = competitionsWithTeams.filter(
    ({ competition }) => (competition.status === 'active' || competition.status === 'upcoming' || competition.status === 'completed')
  );
  const selectedComp = competitionsWithTeams.find(c => c.competition.id === selectedCompetition);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (openCompetitions.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2 sm:space-x-3">
            <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400" />
            <span>Leaderboard</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-1">Top managers in active competitions</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-12 text-center">
          <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <p className="text-xl text-slate-400">No active competitions with teams</p>
          <p className="text-slate-500 mt-2">Teams will appear here once users create them for active competitions</p>
        </div>
      </div>
    );
  }

  // If a specific competition is selected, show full leaderboard for that competition
  if (selectedComp) {
    const { competition, teams } = selectedComp;
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2 sm:space-x-3">
              <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400" />
              <span>Full Leaderboard</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-1 truncate">{getTournamentName(competition)}</p>
          </div>
          <button
            onClick={() => setSelectedCompetition(null)}
            className="px-3 sm:px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm sm:text-base whitespace-nowrap"
          >
            Back to Overview
          </button>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-700">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2 truncate">
              {getTournamentName(competition)}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-400">
              <span>{new Date(competition.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(competition.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span className="hidden sm:inline">•</span>
              <span>{competition.max_players} players</span>
              <span className="hidden sm:inline">•</span>
              <span>{teams.length} teams</span>
            </div>
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-700">
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Team Name
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Players
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Total Points
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {teams.map((team, index) => (
                  <tr 
                    key={team.id} 
                    className={`hover:bg-slate-700/30 transition-colors ${
                      user?.email === team.user_email ? 'bg-emerald-500/5' : ''
                    }`}
                  >
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {index < 3 && (
                          <Award
                            className={`h-5 w-5 mr-2 ${
                              index === 0
                                ? 'text-yellow-400'
                                : index === 1
                                ? 'text-slate-300'
                                : 'text-amber-600'
                            }`}
                          />
                        )}
                        <span className="text-base lg:text-lg font-semibold text-white">{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                      <div className="text-sm lg:text-base font-medium text-white truncate max-w-xs">{team.team_name}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                      <span className="text-xs lg:text-sm text-slate-300 truncate max-w-xs block">{team.user_email}</span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-center">
                      <span className="text-xs lg:text-sm text-slate-300">{team.player_count}/{competition.max_players}</span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-center">
                      <span className="text-base lg:text-lg font-bold text-emerald-400">{team.total_points}</span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                      <span className="text-xs text-slate-400">
                        {new Date(team.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewTeam(team, competition)}
                        className="px-2 sm:px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-xs sm:text-sm flex items-center space-x-1"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-700/50">
            {teams.map((team, index) => (
              <div
                key={team.id}
                className={`p-4 hover:bg-slate-700/30 transition-colors ${
                  user?.email === team.user_email ? 'bg-emerald-500/5' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {index < 3 && (
                      <Award
                        className={`h-5 w-5 ${
                          index === 0
                            ? 'text-yellow-400'
                            : index === 1
                            ? 'text-slate-300'
                            : 'text-amber-600'
                        }`}
                      />
                    )}
                    <span className="text-xl font-bold text-white">#{index + 1}</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400">{team.total_points} pts</span>
                </div>
                <div className="font-semibold text-white mb-1">{team.team_name}</div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="truncate mr-2">{team.user_email}</span>
                  <span>{team.player_count}/{competition.max_players} players</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {new Date(team.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <button
                    onClick={() => handleViewTeam(team, competition)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-xs flex items-center space-x-1"
                  >
                    <Eye className="h-3 w-3" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main view: show top 3 cards for each open competition
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white flex items-center space-x-3">
          <Trophy className="h-8 w-8 text-emerald-400" />
          <span>Leaderboard</span>
        </h2>
        <p className="text-slate-400 mt-1">Top managers in active competitions</p>
      </div>

      {openCompetitions.map(({ competition, teams }) => (
        <div key={competition.id} className="space-y-4">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {getTournamentName(competition)}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-slate-400">
                  <span>{new Date(competition.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(competition.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>•</span>
                  <span>{competition.max_players} players</span>
                  <span>•</span>
                  <span>{teams.length} teams registered</span>
                </div>
              </div>
              {teams.length > 3 && (
                <button
                  onClick={() => setSelectedCompetition(competition.id)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-semibold"
                >
                  View Full Leaderboard
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {teams.slice(0, 3).map((team, index) => (
              <div
                key={team.id}
                className={`bg-gradient-to-br ${
                  index === 0
                    ? 'from-yellow-500/20 to-amber-500/20 border-yellow-500/50'
                    : index === 1
                    ? 'from-slate-300/20 to-slate-400/20 border-slate-400/50'
                    : 'from-amber-600/20 to-orange-600/20 border-amber-600/50'
                } backdrop-blur-sm border rounded-xl p-6 relative overflow-hidden ${
                  user?.email === team.user_email ? 'ring-2 ring-emerald-400' : ''
                }`}
              >
                <div className="absolute top-0 right-0 p-4">
                  {index === 0 ? (
                    <Trophy className="h-12 w-12 text-yellow-400 opacity-20" />
                  ) : index === 1 ? (
                    <Medal className="h-12 w-12 text-slate-300 opacity-20" />
                  ) : (
                    <Award className="h-12 w-12 text-amber-600 opacity-20" />
                  )}
                </div>
                <div className="relative">
                  <div className="flex items-center space-x-3 mb-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold ${
                        index === 0
                          ? 'bg-yellow-400 text-slate-900'
                          : index === 1
                          ? 'bg-slate-300 text-slate-900'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">{team.team_name}</div>
                      <div className="text-sm text-slate-400">{team.user_email}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">Players</span>
                    <span className="text-white font-semibold">{team.player_count}/{competition.max_players}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Total Points</span>
                    <span className="text-lg font-bold text-emerald-400">{team.total_points}</span>
                  </div>
                  {user?.email === team.user_email && (
                    <div className="mt-2 text-xs text-emerald-400 font-medium">Your Team</div>
                  )}
                  <button
                    onClick={() => handleViewTeam(team, competition)}
                    className="mt-3 w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm flex items-center justify-center space-x-1"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Team</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {competitionsWithTeams.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-3">
            <Trophy className="h-6 w-6 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Leaderboard Info</h3>
          </div>
          <p className="text-slate-300">
            Teams are sorted by total points (highest first). Points are calculated from player performances in tournaments associated with each competition. Your team is highlighted in green.
          </p>
        </div>
      )}

      {/* Team Viewer Modal */}
      {viewingTeam && viewingCompetition && (
        <TeamBuilder
          competition={viewingCompetition}
          existingTeam={{
            id: viewingTeam.id,
            team_name: viewingTeam.team_name,
            team_players: [],
          }}
          onClose={() => {
            setViewingTeam(null);
            setViewingCompetition(null);
          }}
          readOnly={true}
          playerPoints={viewingTeam.player_points || []}
        />
      )}
    </div>
  );
}
