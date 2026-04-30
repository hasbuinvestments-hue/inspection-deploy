import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

export default function PHODashboardStats({ profile }) {
  const [stats, setStats] = useState({ 
    drafts: 0, 
    pending: 0, 
    declined: 0, 
    approved: 0, 
    flagged: 0,
    govt_revenue: 0,
    vendor_revenue: 0
  });

  useEffect(() => {
    const loadStats = async () => {
       try {
         const data = await apiFetch('/metrics/pho/');
         setStats({ 
           drafts: data.drafts || 0, 
           pending: data.pending || 0, 
           declined: data.declined || 0, 
           approved: data.approved || 0,
           flagged: data.flagged || 0,
           govt_revenue: data.govt_revenue || 0,
           vendor_revenue: data.vendor_revenue || 0
         });
       } catch (error) {
         console.error('Failed to load PHO dashboard stats:', error);
       }
    };
    loadStats();
  }, [profile]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
       <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '1rem', border: '1px solid #334155', textAlign: 'center' }}>
           <h3 style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Drafts</h3>
           <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>{stats.drafts}</div>
       </div>
       <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '1rem', border: '1px solid #334155', textAlign: 'center' }}>
           <h3 style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Pending</h3>
           <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{stats.pending}</div>
       </div>
       <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '1rem', border: '1px solid #334155', textAlign: 'center' }}>
           <h3 style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Declined</h3>
           <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{stats.declined}</div>
       </div>
       <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '1rem', border: '1px solid #334155', textAlign: 'center' }}>
           <h3 style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Approved</h3>
           <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{stats.approved}</div>
       </div>
    </div>
  );
}
