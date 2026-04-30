import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import FinanceTable from './FinanceTable';
import FinanceHistory from './FinanceHistory';
import FeeScheduleView from './FeeScheduleView';
import { apiFetch } from '../../lib/api';

export default function Finance() {
  const [activeTab, setActiveTab] = useState('unverified');

  const tabs = [
    { id: 'unverified', label: '⏳ Pending Verification' },
    { id: 'verified', label: '✅ Verified & Settled' },
    { id: 'history', label: '📜 Collection History' },
    { id: 'overdue', label: '⚠️ Overdue / Unpaid' },
    { id: 'fees', label: '📖 Fee Schedule' }
  ];

  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiFetch('/metrics/finance/')
      .then((data) => setStats(data))
      .catch((error) => {
        console.error("Finance summary error:", error);
      });
  }, []);

  return (
    <DashboardLayout 
      title="Finance Revenue Control" 
      tabs={tabs} 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
    >
      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Revenue</h3>
            <div className="text-2xl font-bold text-slate-800">KES {Number(stats.today_revenue || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Verified</h3>
            <div className="text-2xl font-bold text-green-600">KES {Number(stats.total_revenue || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
            <h3 className="text-[10px] font-bold text-slate-600 uppercase mb-1">Cash Collection</h3>
            <div className="text-lg font-bold text-slate-900">KES {Number(stats.cash_total || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
            <h3 className="text-[10px] font-bold text-slate-600 uppercase mb-1">M-Pesa Flow</h3>
            <div className="text-lg font-bold text-slate-900">KES {Number(stats.mpesa_total || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
            <h3 className="text-[10px] font-bold text-slate-600 uppercase mb-1">Cheque Pending</h3>
            <div className="text-lg font-bold text-slate-900">KES {Number(stats.cheque_total || 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex justify-between items-center">
          {tabs.find(t => t.id === activeTab)?.label}
        </h2>
        {activeTab === 'fees' ? <FeeScheduleView /> : <FinanceTable tabType={activeTab} />}
      </div>
    </DashboardLayout>
  );
}
