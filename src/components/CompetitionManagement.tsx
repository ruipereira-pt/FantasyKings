import { useEffect, useState } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import type { Database } from '../lib/database.types';
import TournamentAssociation from './TournamentAssociation';
import CompetitionTournamentPlayers from './CompetitionTournamentPlayers';
import CompetitionResults from './CompetitionResults';
import CompetitionSetup from './CompetitionSetup';
import { useCompetitions } from '../hooks/useApi';
import { supabase, supabaseUrl } from '../lib/supabase';

type Competition = Database['public']['Tables']['competitions']['Row'];
type Tournament = Database['public']['Tables']['tournaments']['Row'];

export default function CompetitionManagement() {
  const [selectedCompetitionSetup, setSelectedCompetitionSetup] = useState<Competition | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [associatedTournaments, setAssociatedTournaments] = useState<Record<string, Tournament[]>>({});
  const [fetchingTournamentsSchedule, setFetchingTournamentsSchedule] = useState(false);
  const [syncYear, setSyncYear] = useState<number>(new Date().getFullYear());
  const [isResuming, setIsResuming] = useState(false);
  const [resumeFrom, setResumeFrom] = useState<string | null>(null);

  // Use API hooks
  const {
    competitions,
    loading,
    getCompetitionTournaments
  } = useCompetitions();

  // Fetch associated tournaments for competitions
  useEffect(() => {
    const fetchAssociatedTournaments = async () => {
      if (competitions.length > 0) {
        const relevantComps = competitions.filter(c =>
          c.type === 'season' || c.type === 'road_to_major' || c.type === 'per_gameweek'
        );

        const tournamentsMap: Record<string, Tournament[]> = {};
        for (const comp of relevantComps) {
          const tournaments = await getCompetitionTournaments(comp.id);
          if (tournaments && Array.isArray(tournaments) && tournaments.length > 0) {
            tournamentsMap[comp.id] = tournaments;
          }
        }
        setAssociatedTournaments(tournamentsMap);
      }
    };

    fetchAssociatedTournaments();
  }, [competitions, getCompetitionTournaments]);

  async function fetchTournamentsSchedule() {
    if (!syncYear || syncYear < 2020 || syncYear > 2030) {
      alert('Please enter a valid year (2020-2030)');
      return;
    }

    setFetchingTournamentsSchedule(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('You must be logged in to fetch tournaments schedule');
        return;
      }

      const requestBody: any = { 
        year: syncYear,
        maxCompetitions: 20, // Process 20 competitions per call to avoid timeout
      };
      
      if (resumeFrom) {
        requestBody.resumeFrom = resumeFrom;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/sync-tournaments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        
        let message = `Synced tournaments for ${syncYear}!\n`;
        message += `Synced: ${result.synced}\n`;
        message += `Inserted: ${result.inserted}\n`;
        message += `Updated: ${result.updated}\n`;
        message += `Skipped: ${result.skipped || 0}\n`;
        message += `Filtered: ${result.filtered || 0}\n`;
        
        if (result.hasMore) {
          message += `\n⚠️ More competitions remaining: ${result.remaining}\n`;
          message += `Click "Resume Sync" to continue from where we left off.`;
          setResumeFrom(result.resumeFrom);
          setIsResuming(true);
        } else {
          setResumeFrom(null);
          setIsResuming(false);
        }
        
        if (result.errors && result.errors.length > 0) {
          message += `\n\nErrors: ${result.errors.length}`;
        }
        
        alert(message);
      } else {
        const error = await response.json();
        alert(`Failed to sync tournaments: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error syncing tournaments:', error);
      alert('Failed to sync tournaments. Please try again.');
    } finally {
      setFetchingTournamentsSchedule(false);
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
    <div className="space-y-4 sm:space-y-6">
      {/* Fetch Tournaments Schedule Section */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
          <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 flex-shrink-0" />
          <h3 className="text-lg sm:text-xl font-bold text-white">Fetch Tournaments Schedule from SportsRadar</h3>
        </div>
        <p className="text-sm sm:text-base text-slate-400 mb-3 sm:mb-4">
          Sync tournaments from SportsRadar API for a specific year. 
          This will fetch all competitions, filter seasons by year, and sync tournament details (idempotent - updates existing, inserts new).
        </p>
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Year to Sync
            </label>
            <input
              type="number"
              min="2020"
              max="2030"
              value={syncYear}
              onChange={(e) => setSyncYear(parseInt(e.target.value) || new Date().getFullYear())}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Enter year (e.g., 2025)"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={fetchTournamentsSchedule}
              disabled={fetchingTournamentsSchedule}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 sm:py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
            >
              <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${fetchingTournamentsSchedule ? 'animate-spin' : ''}`} />
              <span>{fetchingTournamentsSchedule ? 'Syncing...' : isResuming ? 'Resume Sync' : `Sync Tournaments for ${syncYear}`}</span>
            </button>
            {isResuming && (
              <button
                onClick={() => {
                  setResumeFrom(null);
                  setIsResuming(false);
                }}
                className="px-4 py-2.5 sm:py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm sm:text-base"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Competition Setup */}
      <CompetitionSetup onCompetitionChange={setSelectedCompetitionSetup} />

      {/* Associate Tournaments to Competition */}
      <TournamentAssociation selectedCompetition={selectedCompetitionSetup} />

      {/* Tournament Players Management */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Users className="h-6 w-6 text-blue-400" />
          <h3 className="text-xl font-bold text-white">Tournament Players</h3>
        </div>
        
        {selectedCompetitionSetup && (() => {
          const compTournaments = associatedTournaments[selectedCompetitionSetup.id] || [];
          return (
            <div className="space-y-4">
              {compTournaments.length > 0 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Select Tournament
                    </label>
                    <select
                      value={selectedTournament?.id || ''}
                      onChange={(e) => {
                        const tournament = compTournaments.find(t => t.id === e.target.value);
                        setSelectedTournament(tournament || null);
                      }}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select a tournament...</option>
                      {compTournaments.map((tournament) => (
                        <option key={tournament.id} value={tournament.id}>
                          {tournament.name} - {new Date(tournament.start_date).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <CompetitionTournamentPlayers 
                    selectedTournament={selectedTournament} 
                    competitionId={selectedCompetitionSetup.id}
                  />
                </>
              ) : (
                <div className="p-6 bg-slate-900/50 rounded-lg text-center">
                  <p className="text-slate-400">
                    No tournaments associated with this competition yet. Use the Tournament Associations section above to add tournaments.
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {!selectedCompetitionSetup && (
          <div className="p-6 bg-slate-900/50 rounded-lg text-center">
            <p className="text-slate-400">Select a competition to manage tournament players</p>
          </div>
        )}
      </div>

      {/* Competition Results - Show independently */}
      <CompetitionResults />
    </div>
  );
}

