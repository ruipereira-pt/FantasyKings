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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-x-hidden w-full">
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-red-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-white truncate">Admin Dashboard</h1>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex-shrink-0 ml-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 w-full overflow-x-hidden">
        <div className="w-full min-w-0 mb-4 sm:mb-6 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-1">
          <button
            onClick={() => onTabChange('competitions')}
            className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all flex-1 ${
              activeTab === 'competitions'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-semibold text-sm sm:text-base">Competitions Management</span>
          </button>
          <button
            onClick={() => onTabChange('players')}
            className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all flex-1 ${
              activeTab === 'players'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-semibold text-sm sm:text-base">Players Management</span>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
