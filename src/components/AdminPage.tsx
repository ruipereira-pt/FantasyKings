import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield } from 'lucide-react';
import AdminLayout from './AdminLayout';
import CompetitionManagement from './CompetitionManagement';
import PlayerManagement from './PlayerManagement';

const ADMIN_EMAIL = 'rui@fk.com';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'competitions' | 'players'>('competitions');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      setIsAdmin(user.email === ADMIN_EMAIL);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 max-w-md text-center">
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'competitions' ? <CompetitionManagement /> : <PlayerManagement />}
    </AdminLayout>
  );
}
