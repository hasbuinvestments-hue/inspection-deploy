import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

export default function ActivityFeed() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await apiFetch('/inspections/activity-logs/');
        // Handle DRF pagination (if results exist) or straight array
        const data = response.results || response.data || response;
        setLogs(data || []);
      } catch (error) {
        console.error('Failed to fetch activity logs:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
    
    // Replace realtime with polling every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getActionClass = (action) => {
    if (action.includes('REGISTERED') || action.includes('CREATED')) return 'text-emerald-600';
    if (action.includes('PURGED') || action.includes('DECLINED')) return 'text-rose-600';
    if (action.includes('TRANSFERRED') || action.includes('STATUS')) return 'text-amber-600';
    return 'text-blue-600';
  };

  const formatDescription = (log) => {
    const details = log.details || {};
    const biz = details.business_name || 'Inspection';
    
    switch(log.action) {
      case 'STAFF_REGISTERED': 
        return `Registered ${details.role}: ${details.target_email}`;
      case 'STAFF_PURGED': 
        return `Deleted ${details.role || 'staff'}: ${details.email}`;
      case 'STAFF_TRANSFERRED': 
        return `Transferred ${details.user_email || 'user'} to ${details.new_subcounty}`;
      case 'INSPECTION_STATUS_CHANGE': 
        if (details.new_approval === 'approved' && details.old_approval !== 'approved') {
          return `APPROVED inspection for ${biz}`;
        }
        if (details.new_approval === 'declined' && details.old_approval !== 'declined') {
          return `DECLINED inspection for ${biz}`;
        }
        if (details.new_payment === 'paid' && details.old_payment !== 'paid') {
          return `Confirmed PAYMENT for ${biz}`;
        }
        return `Updated ${biz} status to ${details.new_approval || details.new_payment}`;
      default: 
        return log.action.replace(/_/g, ' ').toLowerCase();
    }
  };

  if (loading) return <div className="p-4 text-slate-400">Loading activity...</div>;

  return (
    <div className="space-y-3">
      {logs.length === 0 && <p className="text-slate-500 text-center py-4">No recent activity recorded.</p>}
      {logs.map(log => (
        <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm flex flex-col gap-1 fade-in">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-800">{log.user_name}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {new Date(log.created_at).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-slate-600">{formatDescription(log)}</p>
          <div className={`text-[10px] font-bold uppercase ${getActionClass(log.action)}`}>
            {log.action_display}
          </div>
        </div>
      ))}
    </div>
  );
}
