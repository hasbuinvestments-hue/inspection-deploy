import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

const StatCard = ({ label, value, color = '#f8fafc', sub }) => (
  <div style={{ backgroundColor: '#0f172a', padding: '1rem 1.25rem', borderRadius: '1rem', border: '1px solid #334155', textAlign: 'center' }}>
    <h3 style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</h3>
    <div style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{value}</div>
    {sub && <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.2rem' }}>{sub}</div>}
  </div>
);

const ActivityCard = ({ label, today, yesterday, todayColor = '#10b981', icon }) => (
  <div style={{ backgroundColor: '#0f172a', padding: '1rem 1.25rem', borderRadius: '1rem', border: '1px solid #334155' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      <h3 style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</h3>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
      <div style={{ backgroundColor: '#1e293b', padding: '0.6rem', borderRadius: '0.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.55rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: todayColor }}>{today}</div>
      </div>
      <div style={{ backgroundColor: '#1e293b', padding: '0.6rem', borderRadius: '0.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.55rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Yesterday</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#94a3b8' }}>{yesterday}</div>
      </div>
    </div>
  </div>
);

export default function PHODashboardStats({ profile }) {
  const [stats, setStats] = useState({
    drafts: 0, pending: 0, declined: 0, approved: 0, flagged: 0,
    govt_revenue: 0, vendor_revenue: 0,
    productivity: {
      today: { applications: 0, audits: 0 },
      yesterday: { applications: 0, audits: 0 }
    }
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
          vendor_revenue: data.vendor_revenue || 0,
          productivity: data.productivity || { today: { applications: 0, audits: 0 }, yesterday: { applications: 0, audits: 0 } }
        });
      } catch (error) {
        console.error('Failed to load PHO dashboard stats:', error);
      }
    };
    loadStats();
  }, [profile]);

  const { today, yesterday } = stats.productivity;

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Today's Activity — Applications vs Audits */}
      <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Daily Activity</span>
        <div style={{ height: '1px', flex: 1, backgroundColor: '#1e293b' }}></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        <ActivityCard
          label="Applications Started (Helped Clients Apply)"
          icon="📋"
          today={today.applications}
          yesterday={yesterday.applications}
          todayColor="#3b82f6"
        />
        <ActivityCard
          label="Audits Conducted (Inspections Completed)"
          icon="🔍"
          today={today.audits}
          yesterday={yesterday.audits}
          todayColor="#10b981"
        />
      </div>

      {/* Overall Totals */}
      <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Overall Status</span>
        <div style={{ height: '1px', flex: 1, backgroundColor: '#1e293b' }}></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <StatCard label="Drafts" value={stats.drafts} color="#f8fafc" />
        <StatCard label="Pending" value={stats.pending} color="#f59e0b" />
        <StatCard label="Declined" value={stats.declined} color="#ef4444" />
        <StatCard label="Approved" value={stats.approved} color="#10b981" />
      </div>
    </div>
  );
}
