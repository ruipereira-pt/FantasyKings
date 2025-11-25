import { useEffect, useState } from 'react';
import { Trophy, Save } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { useCompetitions } from '../hooks/useApi';

type Competition = Database['public']['Tables']['competitions']['Row'];

interface CompetitionSetupProps {
  onCompetitionChange: (competition: Competition | null) => void;
}

export default function CompetitionSetup({ onCompetitionChange }: CompetitionSetupProps) {
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [deadline, setDeadline] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'upcoming' | 'active' | 'completed'>('upcoming');
  const [numberOfPlayers, setNumberOfPlayers] = useState<number | ''>('');
  const [firstRound, setFirstRound] = useState('');
  const [pointsPerRound, setPointsPerRound] = useState<Record<string, number>>({});

  const {
    competitions,
    loading,
    error: competitionsError,
    fetchCompetitions,
    updateCompetition
  } = useCompetitions();

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  // Update form fields when competition changes
  // Intentional: we need to update form fields synchronously when competition changes
  useEffect(() => {
    if (selectedCompetition) {
      if (selectedCompetition.join_deadline) {
        // Convert UTC timestamp to local datetime-local format (YYYY-MM-DDTHH:mm)
        const date = new Date(selectedCompetition.join_deadline);
        
        if (!isNaN(date.getTime())) {
          // Get the local datetime string in the format expected by datetime-local input
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
          // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: update form field when competition changes
          setDeadline(localDateTime);
        } else {
           
          setDeadline('');
        }
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

       
      setStatus(selectedCompetition.status || 'upcoming');
       
      setNumberOfPlayers(selectedCompetition.number_of_players || '');
       
      setFirstRound(selectedCompetition.first_round || '');
      
      if (selectedCompetition.points_per_round && typeof selectedCompetition.points_per_round === 'object') {
         
        setPointsPerRound(selectedCompetition.points_per_round as Record<string, number>);
      } else {
         
        setPointsPerRound({});
      }
    }
  }, [selectedCompetition]);

  useEffect(() => {
    onCompetitionChange(selectedCompetition);
  }, [selectedCompetition, onCompetitionChange]);

  async function saveCompetition() {
    if (!selectedCompetition) {
      alert('Please select a competition');
      return;
    }

    if (!startDate || !endDate) {
      alert('Please set both start and end dates');
      return;
    }

    const updates: Record<string, unknown> = {
      start_date: startDate,
      end_date: endDate,
      status: status,
      number_of_players: numberOfPlayers ? Number(numberOfPlayers) : null,
      first_round: firstRound || null,
      points_per_round: Object.keys(pointsPerRound).length > 0 ? pointsPerRound : null,
    };

    // Only include join_deadline if it's not empty
    if (deadline && deadline.trim() !== '') {
      // Convert datetime-local to UTC timestamp
      const deadlineDate = new Date(deadline);
      updates.join_deadline = deadlineDate.toISOString();
    }

    const result = await updateCompetition(selectedCompetition.id, updates);
    
    if (result !== null && result !== undefined) {
      alert('Competition updated successfully!');
      // Update selectedCompetition with the new data
      setSelectedCompetition({ ...selectedCompetition, ...updates });
      onCompetitionChange({ ...selectedCompetition, ...updates });
    } else {
      alert(`Failed to update competition: ${competitionsError || 'Unknown error'}`);
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
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center space-x-2">
        <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
        <span>Competition Setup</span>
      </h3>

      <div className="space-y-4 sm:space-y-6">
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
            <option value="">-- Select a competition --</option>
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name}
              </option>
            ))}
          </select>
        </div>

        {selectedCompetition && (
          <>
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'upcoming' | 'active' | 'completed')}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active (On Going)</option>
                <option value="completed">Completed</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">
                Change to "Active" when you want to start updating tournament results
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Number of Players
                </label>
                <input
                  type="number"
                  value={numberOfPlayers}
                  onChange={(e) => setNumberOfPlayers(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., 128"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  First Round
                </label>
                <select
                  value={firstRound}
                  onChange={(e) => setFirstRound(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select first round...</option>
                  <option value="r128">Round of 128</option>
                  <option value="r64">Round of 64</option>
                  <option value="r32">Round of 32</option>
                  <option value="r16">Round of 16</option>
                  <option value="qf">Quarterfinal</option>
                  <option value="sf">Semifinal</option>
                  <option value="f">Final</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Points per Round (JSON)
              </label>
              <div className="space-y-2">
                {['r128', 'r64', 'r32', 'r16', 'qf', 'sf', 'f', 'w'].map((round) => (
                  <div key={round} className="flex items-center space-x-2">
                    <label className="text-sm text-slate-400 w-20">{round.toUpperCase()}:</label>
                    <input
                      type="number"
                      value={pointsPerRound[round] || ''}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : 0;
                        setPointsPerRound({ ...pointsPerRound, [round]: value });
                      }}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={saveCompetition}
              disabled={loading}
              className="w-full px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Save className="h-5 w-5" />
              <span>{loading ? 'Saving...' : 'Save Competition'}</span>
            </button>
          </>
        )}
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
                  ? new Date(selectedCompetition.join_deadline).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZoneName: 'short'
                    })
                  : 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Status:</span>
              <span className="text-white ml-2 capitalize">{selectedCompetition.status}</span>
            </div>
            <div>
              <span className="text-slate-400">Budget:</span>
              <span className="text-white ml-2">{selectedCompetition.budget || 100}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

