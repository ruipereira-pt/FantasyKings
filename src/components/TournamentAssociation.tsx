import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Plus, X, Edit2, Save, Search } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Competition = Database['public']['Tables']['competitions']['Row'];
type Tournament = Database['public']['Tables']['tournaments']['Row'];

interface TournamentWithAssociation extends Tournament {
  isAssociated: boolean;
}

interface TournamentAssociationProps {
  selectedCompetition: Competition | null;
}

export default function TournamentAssociation({ selectedCompetition: _selectedCompetition }: TournamentAssociationProps) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [tournaments, setTournaments] = useState<TournamentWithAssociation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [competitionForm, setCompetitionForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    join_deadline: ''
  });

  useEffect(() => {
    fetchCompetitions();
  }, []);

  useEffect(() => {
    if (selectedComp) {
      fetchTournaments();
      setCompetitionForm({
        name: selectedComp.name,
        start_date: selectedComp.start_date,
        end_date: selectedComp.end_date,
        join_deadline: selectedComp.join_deadline ? new Date(new Date(selectedComp.join_deadline).getTime() - new Date(selectedComp.join_deadline).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
      });
    }
  }, [selectedComp]);

  async function fetchCompetitions() {
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompetitions(data || []);
      if (data && data.length > 0) {
        setSelectedComp(data[0]);
      }
    } catch (error) {
      console.error('Error fetching competitions:', error);
    }
  }

  async function fetchTournaments() {
    if (!selectedComp) return;

    try {
      const [tournamentsRes, associationsRes] = await Promise.all([
        supabase
          .from('tournaments')
          .select('*')
          .order('start_date', { ascending: true }),
        supabase
          .from('competition_tournaments')
          .select('tournament_id')
          .eq('competition_id', selectedComp.id)
      ]);

      if (tournamentsRes.error) throw tournamentsRes.error;
      if (associationsRes.error) throw associationsRes.error;

      const associatedTournamentIds = new Set(
        (associationsRes.data as any)?.map((a: any) => a.tournament_id) || []
      );

      const tournamentsWithAssociation = ((tournamentsRes.data as any) || []).map((t: any) => ({
        ...t,
        isAssociated: associatedTournamentIds.has(t.id)
      }));

      setTournaments(tournamentsWithAssociation);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTournamentAssociation(tournament: TournamentWithAssociation) {
    if (!selectedComp) return;

    setSaving(true);
    try {
      if (tournament.isAssociated) {
        const { error } = await supabase
          .from('competition_tournaments')
          .delete()
          .eq('competition_id', selectedComp.id)
          .eq('tournament_id', tournament.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('competition_tournaments')
          .insert({
            competition_id: selectedComp.id,
            tournament_id: tournament.id
          } as any) as any);

        if (error) throw error;
      }

      await fetchTournaments();
    } catch (error) {
      console.error('Error toggling tournament association:', error);
      alert('Failed to update tournament association');
    } finally {
      setSaving(false);
    }
  }

  async function saveCompetitionEdit() {
    if (!selectedComp) return;

    setSaving(true);
    try {
      const updates: any = {
        name: competitionForm.name,
        start_date: competitionForm.start_date,
        end_date: competitionForm.end_date
      };

      if (competitionForm.join_deadline) {
        const deadlineDate = new Date(competitionForm.join_deadline);
        updates.join_deadline = deadlineDate.toISOString();
      }

      const query = supabase.from('competitions').update(updates as any).eq('id', selectedComp.id);
      const { error } = await (query as any);

      if (error) throw error;

      alert('Competition updated successfully!');
      setEditingCompetition(false);
      await fetchCompetitions();
    } catch (error) {
      console.error('Error updating competition:', error);
      alert('Failed to update competition');
    } finally {
      setSaving(false);
    }
  }



  const associatedTournaments = tournaments.filter(t => t.isAssociated);

  const filteredAvailableTournaments = tournaments
    .filter(t => !t.isAssociated)
    .filter(t => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(query) ||
        t.location?.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
      );
    });

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Calendar className="h-6 w-6 text-blue-400" />
          <h3 className="text-xl font-bold text-white">Tournament Associations</h3>
        </div>
        <button
          onClick={() => setEditingCompetition(true)}
          disabled={!selectedComp}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          <Edit2 className="h-4 w-4" />
          <span>Edit Competition</span>
        </button>
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Select Competition
        </label>
        <select
          value={selectedComp?.id || ''}
          onChange={(e) => {
            const comp = competitions.find(c => c.id === e.target.value);
            setSelectedComp(comp || null);
          }}
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {competitions.map((comp) => (
            <option key={comp.id} value={comp.id}>
              {comp.name} ({comp.type})
            </option>
          ))}
        </select>
      </div>

      {selectedComp && (
        <div className="mb-6 p-4 bg-slate-900/50 rounded-lg">
          <h4 className="text-white font-semibold mb-2">Competition Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Start Date:</span>
              <span className="text-white ml-2">{new Date(selectedComp.start_date).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-slate-400">End Date:</span>
              <span className="text-white ml-2">{new Date(selectedComp.end_date).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-slate-400">Join Deadline:</span>
              <span className="text-white ml-2">
                {selectedComp.join_deadline
                  ? new Date(selectedComp.join_deadline).toLocaleString()
                  : 'Not set'}
              </span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading tournaments...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-3">
              Associated Tournaments ({associatedTournaments.length})
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {associatedTournaments.length === 0 ? (
                <div className="text-sm text-slate-500 py-4 text-center border border-slate-700 rounded-lg">
                  No tournaments associated yet
                </div>
              ) : (
                associatedTournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-emerald-500/20"
                  >
                    <div className="flex-1">
                      <div className="text-white font-medium">{tournament.name}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {tournament.category} • {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleTournamentAssociation(tournament)}
                      disabled={saving}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove tournament"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-300">
                Available Tournaments ({filteredAvailableTournaments.length})
              </h4>
            </div>
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tournaments by name, location, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAvailableTournaments.length === 0 ? (
                <div className="text-sm text-slate-500 py-4 text-center border border-slate-700 rounded-lg">
                  {searchQuery ? 'No tournaments match your search' : 'All tournaments are associated'}
                </div>
              ) : (
                filteredAvailableTournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                  >
                    <div className="flex-1">
                      <div className="text-white font-medium">{tournament.name}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {tournament.category} • {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleTournamentAssociation(tournament)}
                      disabled={saving}
                      className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Add tournament"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {editingCompetition && selectedComp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Edit Competition</h3>
              <button
                onClick={() => setEditingCompetition(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Competition Name
                </label>
                <input
                  type="text"
                  value={competitionForm.name}
                  onChange={(e) => setCompetitionForm({ ...competitionForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={competitionForm.start_date}
                    onChange={(e) => setCompetitionForm({ ...competitionForm, start_date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={competitionForm.end_date}
                    onChange={(e) => setCompetitionForm({ ...competitionForm, end_date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Join Deadline (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={competitionForm.join_deadline}
                  onChange={(e) => setCompetitionForm({ ...competitionForm, join_deadline: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={saveCompetitionEdit}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Save className="h-5 w-5" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
                <button
                  onClick={() => setEditingCompetition(false)}
                  className="px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
