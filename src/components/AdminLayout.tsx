import { Shield, Trophy, Users, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: 'competitions' | 'players';
  onTabChange: (tab: 'competitions' | 'players') => void;
}

export default function AdminLayout({ children, activeTab, onTabChange }: AdminLayoutProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-red-400" />
              <div>
                <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex space-x-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-1">
          <button
            onClick={() => onTabChange('competitions')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all flex-1 justify-center ${
              activeTab === 'competitions'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Trophy className="h-5 w-5" />
            <span className="font-semibold">Competitions Management</span>
          </button>
          <button
            onClick={() => onTabChange('players')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all flex-1 justify-center ${
              activeTab === 'players'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Users className="h-5 w-5" />
            <span className="font-semibold">Players Management</span>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
