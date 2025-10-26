import { Trophy, Award, Medal } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  teamName: string;
  manager: string;
  points: number;
  players: number;
}

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, teamName: 'Grand Slam Legends', manager: 'TennisKing', points: 2450, players: 10 },
  { rank: 2, teamName: 'Court Masters', manager: 'AcePlayer', points: 2380, players: 10 },
  { rank: 3, teamName: 'Baseline Warriors', manager: 'TopSpin99', points: 2310, players: 10 },
  { rank: 4, teamName: 'Net Crushers', manager: 'ServeKing', points: 2250, players: 10 },
  { rank: 5, teamName: 'Clay Court Kings', manager: 'RafaFan', points: 2190, players: 10 },
];

export default function Leaderboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white flex items-center space-x-3">
          <Trophy className="h-8 w-8 text-emerald-400" />
          <span>Leaderboard</span>
        </h2>
        <p className="text-slate-400 mt-1">Top fantasy managers this season</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {mockLeaderboard.slice(0, 3).map((entry, index) => (
          <div
            key={entry.rank}
            className={`bg-gradient-to-br ${
              index === 0
                ? 'from-yellow-500/20 to-amber-500/20 border-yellow-500/50'
                : index === 1
                ? 'from-slate-300/20 to-slate-400/20 border-slate-400/50'
                : 'from-amber-600/20 to-orange-600/20 border-amber-600/50'
            } backdrop-blur-sm border rounded-xl p-6 relative overflow-hidden`}
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
                  {entry.rank}
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{entry.teamName}</div>
                  <div className="text-sm text-slate-400">{entry.manager}</div>
                </div>
              </div>
              <div className="text-3xl font-bold text-white">{entry.points.toLocaleString()}</div>
              <div className="text-sm text-slate-400">points</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-700">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Players
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {mockLeaderboard.map((entry) => (
                <tr key={entry.rank} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {entry.rank <= 3 && (
                        <Award
                          className={`h-5 w-5 mr-2 ${
                            entry.rank === 1
                              ? 'text-yellow-400'
                              : entry.rank === 2
                              ? 'text-slate-300'
                              : 'text-amber-600'
                          }`}
                        />
                      )}
                      <span className="text-lg font-semibold text-white">{entry.rank}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-base font-medium text-white">{entry.teamName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-300">{entry.manager}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm text-slate-300">{entry.players}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-base font-semibold text-emerald-400">
                      {entry.points.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-3">
          <Trophy className="h-6 w-6 text-emerald-400" />
          <h3 className="text-lg font-bold text-white">Your Team</h3>
        </div>
        <p className="text-slate-300 mb-4">
          Create your fantasy team to compete on the leaderboard and track your progress throughout
          the season.
        </p>
        <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50">
          Create Your Team
        </button>
      </div>
    </div>
  );
}
