import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import BulkAllocationModal from './modals/BulkAllocationModal';

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d',    label: 'Last 7 Days' },
  { value: '30d',   label: 'Last 30 Days' },
  { value: '1y',    label: 'Last Year' },
];

export default function SupervisionMetrics() {
  const [metrics, setMetrics] = useState({ pho_metrics: [], nccg_metrics: [] });
  const [loading, setLoading] = useState(true);
  const [allocatingNccg, setAllocatingNccg] = useState(null);

  // History state
  const [historyRange, setHistoryRange] = useState('30d');
  const [historyPho, setHistoryPho] = useState('');
  const [historyZone, setHistoryZone] = useState('');
  const [historyData, setHistoryData] = useState({ history: [], summary: { total_applications: 0, total_audits: 0 } });
  const [historyLoading, setHistoryLoading] = useState(false);

  const [phoList, setPhoList] = useState([]);
  const [zoneList, setZoneList] = useState([]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/metrics/admin/');
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch supervision metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      let url = `/metrics/history/?range=${historyRange}`;
      if (historyPho) url += `&pho_id=${historyPho}`;
      if (historyZone) url += `&subcounty=${encodeURIComponent(historyZone)}`;
      const data = await apiFetch(url);
      setHistoryData(data);
    } catch (err) {
      console.error('History fetch failed', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { fetchMetrics(); }, []);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [phos, zones] = await Promise.all([
          apiFetch('/users/?role=pho'),
          apiFetch('/inspections/businesses/debug-subcounties/'),
        ]);
        setPhoList(phos?.results || phos || []);
        setZoneList(zones?.stored_subcounties || []);
      } catch (e) { /* silent */ }
    };
    loadMeta();
  }, []);

  // Fetch history whenever filters change
  useEffect(() => { fetchHistory(); }, [historyRange, historyPho, historyZone]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading supervision data...</div>;

  return (
    <div className="space-y-10">
      {/* PHO Real-time Table */}
      <section>
        <h3 className="text-lg font-bold text-slate-800 mb-4">PHO Performance (Real-time)</h3>
        <Table headers={['Inspector', 'Zone', 'Volume', 'Approve %', 'Decline %', 'Status']}>
          {metrics.pho_metrics?.map(pho => {
            const total = pho.total || 0;
            const appRate = total ? Math.round((pho.approved / total) * 100) : 0;
            const decRate = total ? Math.round((pho.declined / total) * 100) : 0;
            return (
              <tr key={pho.id}>
                <td className="p-4">
                  <div className="font-bold text-slate-800">{pho.full_name}</div>
                </td>
                <td className="p-4 text-sm text-slate-600">{pho.zone || 'Unassigned'}</td>
                <td className="p-4 text-sm font-semibold">{total} audits</td>
                <td className="p-4 text-emerald-600 font-bold">{appRate}%</td>
                <td className="p-4 text-rose-600 font-bold">{decRate}%</td>
                <td className="p-4">
                  <Badge type={total === 0 ? 'amber' : (pho.pending > 10 ? 'red' : 'green')}>
                    {total === 0 ? 'Idle' : (pho.pending > 10 ? 'Backlogged' : 'Active')}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </Table>
      </section>

      {/* NCCG Queue */}
      <section>
        <h3 className="text-lg font-bold text-slate-800 mb-4">NCCG Queue Supervision</h3>
        <Table headers={['Officer', 'Assigned PHOs', 'Pending Queue', 'Status', 'Actions']}>
          {metrics.nccg_metrics?.map(nccg => (
            <tr key={nccg.id}>
              <td className="p-4 font-bold text-slate-800">{nccg.full_name}</td>
              <td className="p-4">{nccg.assigned_phos} PHO(s)</td>
              <td className="p-4 text-amber-600 font-bold">{nccg.pending_queue} Pending</td>
              <td className="p-4">
                <Badge type={nccg.assigned_phos === 0 ? 'amber' : (nccg.pending_queue > 20 ? 'red' : 'green')}>
                  {nccg.assigned_phos === 0 ? 'No PHOs' : (nccg.pending_queue > 20 ? 'Overloaded' : 'Balanced')}
                </Badge>
              </td>
              <td className="p-4">
                <button onClick={() => setAllocatingNccg(nccg)} className="text-blue-600 hover:text-blue-800 font-bold text-xs underline">
                  MANAGE
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </section>

      {/* ─── Performance History ─── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <h3 className="text-lg font-bold text-slate-800">Performance History</h3>
          <span className="text-xs text-slate-400 font-medium">Applications = helped client apply · Audits = inspection conducted</span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Time Range</label>
            <select
              value={historyRange}
              onChange={e => setHistoryRange(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {RANGE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Filter by PHO</label>
            <select
              value={historyPho}
              onChange={e => setHistoryPho(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-emerald-400 min-w-[160px]"
            >
              <option value="">All PHOs</option>
              {phoList.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Filter by Zone</label>
            <select
              value={historyZone}
              onChange={e => setHistoryZone(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-emerald-400 min-w-[160px]"
            >
              <option value="">All Zones</option>
              {zoneList.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>

          {(historyPho || historyZone) && (
            <button
              onClick={() => { setHistoryPho(''); setHistoryZone(''); }}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 underline mt-4"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">📋 Total Applications</div>
            <div className="text-3xl font-black text-blue-700">
              {historyLoading ? '…' : historyData.summary.total_applications}
            </div>
            <div className="text-xs text-blue-400 mt-1">Clients helped to apply</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">🔍 Total Audits</div>
            <div className="text-3xl font-black text-emerald-700">
              {historyLoading ? '…' : historyData.summary.total_audits}
            </div>
            <div className="text-xs text-emerald-400 mt-1">Inspections conducted</div>
          </div>
        </div>

        {/* Daily Breakdown Table */}
        {historyLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading history...</div>
        ) : historyData.history.length === 0 ? (
          <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl text-sm">
            No activity data for the selected period.
          </div>
        ) : (
          <Table headers={['Date', 'Applications Started', 'Audits Conducted', 'Total Activity']}>
            {historyData.history.map(row => (
              <tr key={row.date} className="border-b border-slate-50">
                <td className="p-4 text-sm font-semibold text-slate-700">
                  {new Date(row.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="font-bold text-blue-700">{row.applications}</span>
                    <span className="text-xs text-slate-400">applications</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="font-bold text-emerald-700">{row.audits}</span>
                    <span className="text-xs text-slate-400">audits</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="w-full bg-slate-100 rounded-full h-2 flex overflow-hidden">
                    {(row.applications + row.audits) > 0 && (
                      <>
                        <div
                          className="bg-blue-400 h-2"
                          style={{ width: `${(row.applications / (row.applications + row.audits)) * 100}%` }}
                        />
                        <div
                          className="bg-emerald-400 h-2"
                          style={{ width: `${(row.audits / (row.applications + row.audits)) * 100}%` }}
                        />
                      </>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{row.applications + row.audits} total</div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <BulkAllocationModal
        nccg={allocatingNccg}
        isOpen={!!allocatingNccg}
        onClose={() => setAllocatingNccg(null)}
        onComplete={fetchMetrics}
      />
    </div>
  );
}
