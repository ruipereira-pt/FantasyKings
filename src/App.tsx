import { useState } from 'react';
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

const ADMIN_EMAIL = 'rui@fk.com';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('rankings');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, loading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

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

  if (activeTab === 'admin') {
    return <AdminPage />;
  }

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAuthClick={() => setShowAuthModal(true)}
        isAdmin={isAdmin}
      >
        {activeTab === 'rankings' && <Rankings />}
        {activeTab === 'schedule' && <Schedule />}
        {activeTab === 'competitions' && <Competitions />}
        {activeTab === 'leaderboard' && <Leaderboard />}
      </Layout>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
