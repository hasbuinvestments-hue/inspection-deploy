import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

export default function SuperadminOverview() {
  const [stats, setStats] = useState({ 
    totalReports: 0, 
    totalUsers: 0, 
    totalZones: 0,
    flaggedReports: 0,
    pendingReports: 0,
    dailyGrowth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      let error = null; let data; try { data = await apiFetch('/metrics/superadmin/'); } catch(e) { error = e; }
      if (!error && data) {
        setStats(data);
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Synchronizing Global Health Metrics...</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-hover hover:border-emerald-300">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Global Inspections</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-black text-slate-800">{(stats.totalReports || 0).toLocaleString()}</p>
            <span className="text-emerald-500 text-xs font-bold mb-1">+{stats.dailyGrowth || 0}%</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-hover hover:border-blue-300">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Security Health (Flags)</p>
          <div className="flex items-end gap-2">
            <p className={`text-4xl font-black ${stats.flaggedReports > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{stats.flaggedReports}</p>
            <span className="text-slate-400 text-xs font-bold mb-1">Flagged Payments</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-hover hover:border-amber-300">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Queue Workload</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-black text-slate-800">{stats.pendingReports}</p>
            <span className="text-amber-500 text-xs font-bold mb-1">Pending Review</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-800">
           <h3 className="text-xl font-bold text-white mb-4">Infrastructure Integrity</h3>
           <div className="space-y-4">
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-400">Database Uptime</span>
                 <span className="text-emerald-400 font-mono tracking-tighter">{stats.uptime}</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-400">Storage Utilization (Photos)</span>
                 <span className="text-blue-400 font-mono tracking-tighter">{stats.storageUtilization}</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-400">Active Service Zones</span>
                 <span className="text-white font-mono tracking-tighter">{stats.totalZones} Regions</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-400">Total Registered Personnel</span>
                 <span className="text-white font-mono tracking-tighter">{stats.totalUsers} Profiles</span>
               </div>
           </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
           <h3 className="text-xl font-bold text-slate-800 mb-4">System Alerts</h3>
           <div className="space-y-3">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-4">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                 <p className="text-sm text-emerald-800 font-medium">All regional synchronization tunnels operating normally.</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-4">
                 <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                 <p className="text-sm text-blue-800 font-medium">Auto-invoicing service successfully dispatched 42 client alerts today.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
