import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

export default function AdminOverview() {
  const [stats, setStats] = useState({
    today_count: 0,
    pending_count: 0,
    declined_count: 0,
    overdue_count: 0,
    active_inspectors: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // In legacy, this used an RPC. Let's try to simulate or use the same RPC if it exists.
      let error = null; let data; try { data = await apiFetch('/metrics/admin/'); } catch(e) { error = e; }
      if (!error && data) {
        setStats(data);
      } else {
        // Fallback or handle error
        console.error("Admin metrics error:", error);
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading metrics...</div>;

  const statCards = [
    { label: "Today's Inspections", value: stats.today_count, color: "blue" },
    { label: "Pending Approvals", value: stats.pending_count, color: "amber" },
    { label: "Declined Reports", value: stats.declined_count, color: "red" },
    { label: "Avg Days to Pay", value: stats.avg_days_to_pay || '0', color: "emerald", suffix: " days" }
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-${s.color}-500/50`}></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}{s.suffix || ''}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PHO Productivity */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">PHO Productivity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Zone</th>
                  <th className="px-2 py-2 text-center">T</th>
                  <th className="px-2 py-2 text-center text-emerald-600">A</th>
                  <th className="px-2 py-2 text-center text-rose-600">D</th>
                  <th className="px-2 py-2 text-center text-amber-600">P</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(stats.pho_metrics || []).map(p => (
                   <tr key={p.id} className="hover:bg-slate-50">
                     <td className="px-4 py-3 font-medium text-slate-700">{p.full_name}</td>
                     <td className="px-4 py-3 text-slate-500">{p.zone}</td>
                     <td className="px-2 py-3 text-center font-bold">{p.total}</td>
                     <td className="px-2 py-3 text-center text-emerald-600 font-bold">{p.approved}</td>
                     <td className="px-2 py-3 text-center text-rose-600 font-bold">{p.declined}</td>
                     <td className="px-2 py-3 text-center text-amber-600 font-bold">{p.pending}</td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* NCCG Queue Health */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">NCCG Queue Status</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-2">Officer</th>
                  <th className="px-4 py-2">Assigned PHOs</th>
                  <th className="px-4 py-2 text-right">Pending Queue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(stats.nccg_metrics || []).map(n => (
                   <tr key={n.id} className="hover:bg-slate-50">
                     <td className="px-4 py-3 font-medium text-slate-700">{n.full_name}</td>
                     <td className="px-4 py-2 text-slate-500">{n.assigned_phos} PHOs</td>
                     <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${n.pending_queue > 10 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {n.pending_queue} Pending
                        </span>
                     </td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Exceptions/Alerts */}
      {stats.exceptions && stats.exceptions.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-rose-200 shadow-sm">
           <h3 className="text-lg font-bold text-rose-800 mb-4 flex items-center gap-2">
             <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
             Attention Required (Exceptions)
           </h3>
           <div className="space-y-3">
              {stats.exceptions.map(ex => (
                <div key={ex.id} className="p-4 bg-rose-50 rounded-lg flex justify-between items-center border border-rose-100">
                   <div>
                      <p className="font-bold text-rose-900">{ex.business_name}</p>
                      <p className="text-xs text-rose-700">{ex.reason} • Owned by: {ex.owner}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-bold text-rose-800">{new Date(ex.inspection_date).toLocaleDateString()}</p>
                      {ex.urgent && <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded uppercase font-bold">Urgent</span>}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
}
