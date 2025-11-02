import { useEffect, useState } from 'react';
import { X, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Player = Database['public']['Tables']['players']['Row'];
type Tournament = Database['public']['Tables']['tournaments']['Row'];

interface PlayerSchedule {
  tournament: Tournament;
  status: string;
}

interface PlayerScheduleModalProps {
  player: Player;
  onClose: () => void;
}

export default function PlayerScheduleModal({ player, onClose }: PlayerScheduleModalProps) {
  const [schedules, setSchedules] = useState<PlayerSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayerSchedule();
  }, [player.id]);

  async function fetchPlayerSchedule() {
    try {
      const { data, error } = await (supabase
        .from('player_schedules')
        .select(`
          status,
          tournament:tournaments (*)
        `)
        .eq('player_id', player.id)
        .order('tournament(start_date)', { ascending: true }) as any);

      if (error) throw error;

      const formattedSchedules = ((data as any) || [])
        .filter((item: any) => item.tournament)
        .map((item: any) => ({
          tournament: item.tournament as Tournament,
          status: item.status,
        }));

      setSchedules(formattedSchedules);
    } catch (error) {
      console.error('Error fetching player schedule:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusIcon(status: string) {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'alternate':
        return <Clock className="h-5 w-5 text-yellow-400" />;
      case 'withdrawn':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-400" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'text-green-400';
      case 'alternate':
        return 'text-yellow-400';
      case 'withdrawn':
        return 'text-red-400';
      default:
        return 'text-green-400';
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-slate-800 border-0 sm:border border-slate-700 rounded-none sm:rounded-xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[80vh] overflow-hidden flex flex-col">
        <div className="bg-slate-900/50 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{player.name}</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 truncate">
              Rank #{player.live_ranking || player.ranking} • {player.country}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Tournament Schedule</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No tournament schedule available</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {schedules.map((schedule, index) => (
                <div
                  key={index}
                  className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 sm:p-4 hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(schedule.status)}
                        <h4 className="text-white font-semibold text-sm sm:text-base truncate">
                          {schedule.tournament.name}
                        </h4>
                      </div>
                      <div className="space-y-1 text-xs sm:text-sm">
                        <p className="text-slate-400">
                          {formatDate(schedule.tournament.start_date)} - {formatDate(schedule.tournament.end_date)}
                        </p>
                        <p className="text-slate-400 truncate">
                          {schedule.tournament.location}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                          <span className={`font-medium capitalize text-xs sm:text-sm ${getStatusColor(schedule.status)}`}>
                            {schedule.status}
                          </span>
                          <span className="text-slate-500 hidden sm:inline">•</span>
                          <span className="text-slate-400 text-xs sm:text-sm">
                            {schedule.tournament.surface}
                          </span>
                          <span className="text-slate-500 hidden sm:inline">•</span>
                          <span className="text-slate-400 capitalize text-xs sm:text-sm">
                            {schedule.tournament.category}
                          </span>
                        </div>
                      </div>
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
