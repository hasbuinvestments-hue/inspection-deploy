import React, { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import NccgTable from './NccgTable';
import NccgMap from './NccgMap';

export default function NCCG() {
  const [activeTab, setActiveTab] = useState('pending');

  const tabs = [
    { id: 'pending', label: 'Pending Approvals' },
    { id: 'approved', label: 'Approved Today' },
    { id: 'declined', label: 'Declined Reports' },
    { id: 'map', label: 'Action Map' }
  ];

  return (
    <DashboardLayout 
      title="NCCG Field Command" 
      tabs={tabs} 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
    >
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex justify-between items-center">
          {tabs.find(t => t.id === activeTab)?.label}
        </h2>
        {activeTab === 'map' ? (
           <NccgMap />
        ) : (
           <NccgTable tabType={activeTab} />
        )}
      </div>
    </DashboardLayout>
  );
}
