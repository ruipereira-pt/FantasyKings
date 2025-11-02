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
    setFetchingTournamentsSchedule(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('You must be logged in to fetch tournaments schedule');
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/fetch-tournaments-schedule`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully fetched tournaments schedule!\nProcessed: ${result.processed}\nTournaments created: ${result.tournaments_created}\nPlayers updated: ${result.players_updated}`);
      } else {
        const error = await response.json();
        alert(`Failed to fetch tournaments schedule: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching tournaments schedule:', error);
      alert('Failed to fetch tournaments schedule. Please try again.');
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
    <div className="space-y-6">
      {/* Fetch Tournaments Schedule Section */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <RefreshCw className="h-6 w-6 text-emerald-400" />
          <h3 className="text-xl font-bold text-white">Fetch Tournaments Schedule from SportsRadar</h3>
        </div>
        <p className="text-slate-400 mb-4">
          Fetch competitions, seasons (2025/2026), and season info from SportsRadar API. 
          This will create/update tournaments and update player schedules from qualification and main draw stages.
        </p>
        <button
          onClick={fetchTournamentsSchedule}
          disabled={fetchingTournamentsSchedule}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-5 w-5 ${fetchingTournamentsSchedule ? 'animate-spin' : ''}`} />
          <span>{fetchingTournamentsSchedule ? 'Fetching...' : 'Fetch Tournaments Schedule'}</span>
        </button>
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

