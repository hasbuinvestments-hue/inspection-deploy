import React, { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AdminTable from './AdminTable';
import AdminOverview from './AdminOverview';
import SupervisionMetrics from './SupervisionMetrics';
import MapOverview from './MapOverview';
import ApplicationView from './ApplicationView';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'inspectors', label: '👥 Staff Registry' },
    { id: 'supervision', label: '📈 PHO/NCCG Metrics' },
    { id: 'applications', label: '🎯 Staff Applications' },
    { id: 'alerts', label: '⚠️ Alerts & Exceptions' },
    { id: 'reports', label: '📋 All Reports' },
    { id: 'field_registrations', label: '📍 Field Registrations' },
    { id: 'declined', label: '❌ Declined Reports' },
    { id: 'payments', label: '💰 Revenue & Overdue' },
    { id: 'map', label: '🗺️ Map View' }
  ];

  return (
    <DashboardLayout 
      title="Admin Operations Hub" 
      tabs={tabs} 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
    >
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex justify-between items-center">
          {tabs.find(t => t.id === activeTab)?.label}
        </h2>
        {activeTab === 'overview' && <AdminOverview />}
        {activeTab === 'supervision' && <SupervisionMetrics />}
        {activeTab === 'applications' && <ApplicationView />}
        {activeTab === 'map' && <MapOverview />}
        {!['overview', 'supervision', 'applications', 'map'].includes(activeTab) && (
          <AdminTable tabType={activeTab} />
        )}
      </div>
    </DashboardLayout>
  );
}
