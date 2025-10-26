import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Users, FileText, Trophy, Save, RefreshCw, Upload, Info } from 'lucide-react';
import type { Database } from '../lib/database.types';
import TournamentAssociation from './TournamentAssociation';

type Competition = Database['public']['Tables']['competitions']['Row'];
type Tournament = Database['public']['Tables']['tournaments']['Row'];

export default function CompetitionManagement() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [associatedTournaments, setAssociatedTournaments] = useState<Record<string, Tournament[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCompetitions();
  }, []);

  useEffect(() => {
    if (selectedCompetition) {
      if (selectedCompetition.join_deadline) {
        // Convert to datetime-local format (YYYY-MM-DDTHH:mm)
        const date = new Date(selectedCompetition.join_deadline);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        setDeadline(localDate.toISOString().slice(0, 16));
      } else {
        setDeadline('');
      }

      // Set start and end dates
      if (selectedCompetition.start_date) {
        setStartDate(selectedCompetition.start_date);
      } else {
        setStartDate('');
      }

      if (selectedCompetition.end_date) {
        setEndDate(selectedCompetition.end_date);
      } else {
        setEndDate('');
      }
    }
  }, [selectedCompetition]);

  async function fetchCompetitions() {
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setCompetitions(data || []);

      // Update selectedCompetition with fresh data if it exists
      if (selectedCompetition && data) {
        const updated = data.find(c => c.id === selectedCompetition.id);
        if (updated) {
          setSelectedCompetition(updated);
        }
      } else if (data && data.length > 0 && !selectedCompetition) {
        setSelectedCompetition(data[0]);
      }

      // Fetch associated tournaments for season, road_to_major, and per_gameweek competitions
      if (data) {
        const relevantComps = data.filter(c =>
          c.type === 'season' || c.type === 'road_to_major' || c.type === 'per_gameweek'
        );

        const tournamentsMap: Record<string, Tournament[]> = {};
        for (const comp of relevantComps) {
          const tournaments = await fetchCompetitionTournaments(comp.id);
          tournamentsMap[comp.id] = tournaments;
        }
        setAssociatedTournaments(tournamentsMap);
      }
    } catch (error) {
      console.error('Error fetching competitions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCompetitionTournaments(competitionId: string): Promise<Tournament[]> {
    try {
      const { data, error } = await supabase
        .from('competition_tournaments')
        .select('tournament_id, tournaments(*)')
        .eq('competition_id', competitionId);

      if (error) throw error;
      return data?.map(ct => ct.tournaments).filter(Boolean) as Tournament[] || [];
    } catch (error) {
      console.error('Error fetching competition tournaments:', error);
      return [];
    }
  }

  async function updateCompetitionDates() {
    if (!selectedCompetition) {
      alert('Please select a competition');
      return;
    }

    if (!startDate || !endDate) {
      alert('Please set both start and end dates');
      return;
    }

    setSaving(true);
    try {
      const updates: any = {
        start_date: startDate,
        end_date: endDate,
      };

      if (deadline) {
        const deadlineDate = new Date(deadline);
        updates.join_deadline = deadlineDate.toISOString();
      }

      const { data, error } = await supabase
        .from('competitions')
        .update(updates)
        .eq('id', selectedCompetition.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      alert('Competition dates updated successfully!');
      await fetchCompetitions();
    } catch (error) {
      console.error('Error updating competition:', error);
      alert(`Failed to update competition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  async function refreshPlayersList() {
    setSaving(true);
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
        throw new Error('Failed to refresh players');
      }

      alert('Players list updated successfully!');
    } catch (error) {
      console.error('Error refreshing players:', error);
      alert('Failed to refresh players list');
    } finally {
      setSaving(false);
    }
  }

  async function refreshTournaments() {
    setSaving(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-tournament-schedules`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to refresh tournaments');
      }

      alert('Tournaments updated successfully!');
    } catch (error) {
      console.error('Error refreshing tournaments:', error);
      alert('Failed to refresh tournaments');
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      const players = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',').map(p => p.trim().replace(/"/g, ''));
        if (parts.length < 3) continue;

        const ranking = parseInt(parts[0]);
        const name = parts[1];
        const points = parseInt(parts[2]);
        const country = parts[3] || '';

        if (isNaN(ranking) || !name || isNaN(points)) continue;

        players.push({
          name,
          ranking,
          live_ranking: ranking,
          points,
          country,
        });
      }

      if (players.length === 0) {
        alert('No valid player data found in the file');
        return;
      }

      for (const player of players) {
        const { data: existing } = await supabase
          .from('players')
          .select('id')
          .eq('name', player.name)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('players')
            .update({
              ranking: player.ranking,
              live_ranking: player.live_ranking,
              points: player.points,
              country: player.country,
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('players')
            .insert(player);
        }
      }

      alert(`Successfully uploaded ${players.length} players!`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload rankings. Please check the file format.');
    } finally {
      setUploading(false);
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
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Trophy className="h-6 w-6 text-emerald-400" />
          <span>Competition Management</span>
        </h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Competition
            </label>
            <select
              value={selectedCompetition?.id || ''}
              onChange={(e) => {
                const comp = competitions.find(c => c.id === e.target.value);
                setSelectedCompetition(comp || null);
              }}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {competitions.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Join Deadline (Optional)
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={updateCompetitionDates}
            disabled={saving}
            className="w-full px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? 'Saving...' : 'Save Competition Dates'}</span>
          </button>
        </div>

        {selectedCompetition && (
          <div className="mt-6 p-4 bg-slate-900/50 rounded-lg">
            <h4 className="text-white font-semibold mb-2">Competition Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Start Date:</span>
                <span className="text-white ml-2">{new Date(selectedCompetition.start_date).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-slate-400">End Date:</span>
                <span className="text-white ml-2">{new Date(selectedCompetition.end_date).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-slate-400">Join Deadline:</span>
                <span className="text-white ml-2">
                  {selectedCompetition.join_deadline
                    ? new Date(selectedCompetition.join_deadline).toLocaleString()
                    : 'Not set'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>
                <span className="text-white ml-2 capitalize">{selectedCompetition.status}</span>
              </div>
              <div>
                <span className="text-slate-400">Budget:</span>
                <span className="text-white ml-2">{selectedCompetition.budget_limit || 100}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <TournamentAssociation selectedCompetition={selectedCompetition} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="h-6 w-6 text-blue-400" />
            <h3 className="text-xl font-bold text-white">Update Players List</h3>
          </div>
          <p className="text-slate-400 mb-4">
            Refresh ATP rankings from external sources or upload a CSV file.
          </p>
          <div className="space-y-3">
            <button
              onClick={refreshPlayersList}
              disabled={saving || uploading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${saving ? 'animate-spin' : ''}`} />
              <span>{saving ? 'Updating...' : 'Auto Update'}</span>
            </button>
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading || saving}
                className="hidden"
                id="rankings-upload"
              />
              <label
                htmlFor="rankings-upload"
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors cursor-pointer ${
                  uploading || saving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload className={`h-5 w-5 ${uploading ? 'animate-spin' : ''}`} />
                <span>{uploading ? 'Uploading...' : 'Upload CSV'}</span>
              </label>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              CSV format: Rank, Name, Points, Country
            </p>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Calendar className="h-6 w-6 text-purple-400" />
            <h3 className="text-xl font-bold text-white">Update Tournaments</h3>
          </div>
          <p className="text-slate-400 mb-4">
            Refresh tournament schedules and dates from ATP sources.
          </p>
          <button
            onClick={refreshTournaments}
            disabled={saving}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Updating...' : 'Update Tournaments'}</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <FileText className="h-6 w-6 text-amber-400" />
          <h3 className="text-xl font-bold text-white">Draws & Results</h3>
        </div>
        <p className="text-slate-400 mb-4">
          Manual draw and results management interface coming soon.
        </p>
        <div className="p-6 bg-slate-900/50 rounded-lg text-center">
          <p className="text-slate-500">
            This feature will allow you to manually input tournament draws and results.
          </p>
        </div>
      </div>
    </div>
  );
}
