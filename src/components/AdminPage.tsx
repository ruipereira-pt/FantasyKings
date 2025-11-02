import { useState } from 'react';
import AdminLayout from './AdminLayout';
import CompetitionManagement from './CompetitionManagement';
import PlayerManagement from './PlayerManagement';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'competitions' | 'players'>('competitions');

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'competitions' ? <CompetitionManagement /> : <PlayerManagement />}
    </AdminLayout>
  );
}
