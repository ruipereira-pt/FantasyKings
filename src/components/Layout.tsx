import { Trophy, Calendar, Users, TrendingUp, LogIn, LogOut, User, Shield, Menu, X } from 'lucide-react';
import { ReactNode, useState } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-x-hidden w-full">
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400" />
              <h1 className="text-lg sm:text-2xl font-bold text-white">
                <span className="hidden sm:inline">FantasyKings.com</span>
                <span className="sm:hidden">FK</span>
              </h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
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
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="hidden lg:flex items-center space-x-2 px-3 py-2 bg-slate-800 rounded-lg">
                    <User className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-white">{user.email?.split('@')[0]}</span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={onAuthClick}
                  className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center space-x-2">
              {user && (
                <div className="flex items-center space-x-2 px-2 py-1.5 bg-slate-800 rounded-lg">
                  <User className="h-4 w-4 text-emerald-400" />
                </div>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-white hover:bg-slate-700 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-700 bg-slate-900/95 backdrop-blur-sm">
            <div className="px-4 pt-2 pb-4 space-y-1">
              <MobileNavButton
                icon={<TrendingUp className="h-5 w-5" />}
                label="Rankings"
                active={activeTab === 'rankings'}
                onClick={() => {
                  onTabChange('rankings');
                  setMobileMenuOpen(false);
                }}
              />
              <MobileNavButton
                icon={<Calendar className="h-5 w-5" />}
                label="Schedule"
                active={activeTab === 'schedule'}
                onClick={() => {
                  onTabChange('schedule');
                  setMobileMenuOpen(false);
                }}
              />
              <MobileNavButton
                icon={<Trophy className="h-5 w-5" />}
                label="Competitions"
                active={activeTab === 'competitions'}
                onClick={() => {
                  onTabChange('competitions');
                  setMobileMenuOpen(false);
                }}
              />
              <MobileNavButton
                icon={<Users className="h-5 w-5" />}
                label="Leaderboard"
                active={activeTab === 'leaderboard'}
                onClick={() => {
                  onTabChange('leaderboard');
                  setMobileMenuOpen(false);
                }}
              />
              {isAdmin && (
                <MobileNavButton
                  icon={<Shield className="h-5 w-5" />}
                  label="Admin"
                  active={activeTab === 'admin'}
                  onClick={() => {
                    onTabChange('admin');
                    setMobileMenuOpen(false);
                  }}
                />
              )}
              <div className="pt-2 border-t border-slate-700 mt-2">
                {user ? (
                  <>
                    <div className="px-4 py-2 text-sm text-slate-300">
                      {user.email}
                    </div>
                    <button
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      onAuthClick();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 w-full overflow-x-hidden">
        <div className="w-full min-w-0">
          {children}
        </div>
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
      className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        active
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MobileNavButton({ icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
        active
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
