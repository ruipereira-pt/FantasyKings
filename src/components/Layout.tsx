import { Trophy, Calendar, Users, TrendingUp, LogIn, LogOut, User, Shield } from 'lucide-react';
import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
  activeTab: 'rankings' | 'schedule' | 'competitions' | 'leaderboard' | 'admin';
  onTabChange: (tab: 'rankings' | 'schedule' | 'competitions' | 'leaderboard' | 'admin') => void;
  onAuthClick: () => void;
  isAdmin?: boolean;
}

export default function Layout({ children, activeTab, onTabChange, onAuthClick, isAdmin = false }: LayoutProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Trophy className="h-8 w-8 text-emerald-400" />
              <h1 className="text-2xl font-bold text-white">
                FantasyKings.com
              </h1>
            </div>
            <div className="flex items-center space-x-1">
              <nav className="flex space-x-1 mr-4">
                <NavButton
                  icon={<TrendingUp className="h-5 w-5" />}
                  label="Rankings"
                  active={activeTab === 'rankings'}
                  onClick={() => onTabChange('rankings')}
                />
                <NavButton
                  icon={<Calendar className="h-5 w-5" />}
                  label="Schedule"
                  active={activeTab === 'schedule'}
                  onClick={() => onTabChange('schedule')}
                />
                <NavButton
                  icon={<Trophy className="h-5 w-5" />}
                  label="Competitions"
                  active={activeTab === 'competitions'}
                  onClick={() => onTabChange('competitions')}
                />
                <NavButton
                  icon={<Users className="h-5 w-5" />}
                  label="Leaderboard"
                  active={activeTab === 'leaderboard'}
                  onClick={() => onTabChange('leaderboard')}
                />
                {isAdmin && (
                  <NavButton
                    icon={<Shield className="h-5 w-5" />}
                    label="Admin"
                    active={activeTab === 'admin'}
                    onClick={() => onTabChange('admin')}
                  />
                )}
              </nav>
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 px-3 py-2 bg-slate-800 rounded-lg">
                    <User className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-white">{user.email?.split('@')[0]}</span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={onAuthClick}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

interface NavButtonProps {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavButton({ icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      data-tab={label.toLowerCase()}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        active
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
