import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Award, TrendingUp, Coins } from 'lucide-react';
import type { Database } from '../lib/database.types';
import PlayerScheduleModal from './PlayerScheduleModal';

type Player = Database['public']['Tables']['players']['Row'];

export default function Rankings() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('live_ranking', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  }

  async function refreshRankings() {
    setRefreshing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-rankings`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to refresh rankings');
      }

      await fetchPlayers();
    } catch (error) {
      console.error('Error refreshing rankings:', error);
      alert('Failed to refresh rankings. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
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
          <h2 className="text-3xl font-bold text-white flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-emerald-400" />
            <span>Live Rankings</span>
          </h2>
          <p className="text-slate-400 mt-1">Real-time player rankings</p>
        </div>
        <button
          onClick={refreshRankings}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {players.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-12 text-center">
          <Award className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Rankings Data</h3>
          <p className="text-slate-400 mb-6">
            Click the refresh button to fetch the latest rankings
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-700">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {players.map((player, index) => (
                  <tr
                    key={player.id}
                    className="hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {index < 3 ? (
                          <Award className={`h-5 w-5 mr-2 ${
                            index === 0 ? 'text-yellow-400' :
                            index === 1 ? 'text-slate-300' :
                            'text-amber-600'
                          }`} />
                        ) : null}
                        <span className="text-lg font-semibold text-white">
                          {player.live_ranking || player.ranking || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base font-medium text-white">
                        {player.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-300">
                        {player.country || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-base font-semibold text-emerald-400">
                        {player.points?.toLocaleString() || '0'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Coins className="h-4 w-4 text-amber-400" />
                        <span className="text-base font-semibold text-amber-400">
                          {player.price || 0}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedPlayer && (
        <PlayerScheduleModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
