import React, { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ErrorLogsPanel from './ErrorLogsPanel';
import SuperadminOverview from './SuperadminOverview';
import SystemSettings from './SystemSettings';
import ActivityFeed from './ActivityFeed';
import AdminTable from '../Admin/AdminTable'; // Reuse admin table for global report viewing 
import MapOverview from '../Admin/MapOverview'; 


import AuditTrail from './AuditTrail';

export default function Superadmin() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Global Overview' },
    { id: 'errors', label: 'Error Logs' },
    { id: 'audit', label: 'Audit Trail' },
    { id: 'admins', label: 'Manage Admins' },
    { id: 'settings', label: 'System Settings' }
  ];

  return (
    <DashboardLayout 
      title="SuperAdmin Headquarters" 
      tabs={tabs} 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <div className="fade-in">
              <SuperadminOverview />
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Global Access</h3>
                <AdminTable tabType="reports" />
              </div>
            </div>
          )}
          {activeTab === 'errors' && <ErrorLogsPanel />}
          {activeTab === 'audit' && <AuditTrail />}
          {activeTab === 'admins' && (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <AdminTable tabType="inspectors" />
             </div>
          )}
          {activeTab === 'settings' && <SystemSettings />}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Live Activity Feed
            </h3>
            <ActivityFeed />
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-lg font-bold text-slate-800 mb-2">Geographic Pulse</h3>
             <div className="h-48 rounded-lg overflow-hidden border border-slate-100">
                <MapOverview />
             </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
