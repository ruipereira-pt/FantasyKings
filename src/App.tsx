import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Rankings from './components/Rankings';
import Schedule from './components/Schedule';
import Competitions from './components/Competitions';
import Leaderboard from './components/Leaderboard';
import AuthModal from './components/AuthModal';
import LandingPage from './components/LandingPage';
import AdminPage from './components/AdminPage';

type TabType = 'rankings' | 'schedule' | 'competitions' | 'leaderboard' | 'admin';

const ADMIN_EMAILS = ['rui@fk.com', 'admin@fk.com'];

// Protected Route component for admin access
function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  // Determine active tab based on current route
  const getActiveTab = (): TabType => {
    const path = location.pathname;
    if (path === '/admin') return 'admin';
    if (path === '/schedule') return 'schedule';
    if (path === '/competitions') return 'competitions';
    if (path === '/leaderboard') return 'leaderboard';
    return 'rankings';
  };

  const activeTab = getActiveTab();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage onGetStarted={() => setShowAuthModal(true)} />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={(tab) => {
          // Navigate to appropriate route when tab changes
          const routes: Record<TabType, string> = {
            rankings: '/',
            schedule: '/schedule',
            competitions: '/competitions',
            leaderboard: '/leaderboard',
            admin: '/admin'
          };
          navigate(routes[tab]);
        }}
        onAuthClick={() => setShowAuthModal(true)}
        isAdmin={!!isAdmin}
      >
        <Routes>
          <Route path="/" element={<Rankings />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/competitions" element={<Competitions />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedAdminRoute>
                <AdminPage />
              </ProtectedAdminRoute>
            } 
          />
        </Routes>
      </Layout>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
