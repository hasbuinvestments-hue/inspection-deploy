import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import BulkAllocationModal from './modals/BulkAllocationModal';

export default function SupervisionMetrics() {
  const [metrics, setMetrics] = useState({ pho_metrics: [], nccg_metrics: [] });
  const [loading, setLoading] = useState(true);
  const [allocatingNccg, setAllocatingNccg] = useState(null);

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

  useEffect(() => {
    fetchMetrics();
  }, []);

  const refetch = () => {
    fetchMetrics();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading supervision data...</div>;

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-bold text-slate-800 mb-4">PHO Performance (Real-time)</h3>
        <Table headers={['Inspector', 'Volume', 'Approve %', 'Decline %', 'Status']}>
          {metrics.pho_metrics?.map(pho => {
            const total = pho.total || 0;
            const appRate = total ? Math.round((pho.approved / total) * 100) : 0;
            const decRate = total ? Math.round((pho.declined / total) * 100) : 0;
            
            return (
              <tr key={pho.id}>
                <td className="p-4">
                  <div className="font-bold text-slate-800">{pho.full_name}</div>
                  <div className="text-xs text-slate-600">{pho.zone || 'Unassigned'}</div>
                </td>
                <td className="p-4">{total} inspections</td>
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
                <button 
                  onClick={() => setAllocatingNccg(nccg)}
                  className="text-blue-600 hover:text-blue-800 font-bold text-xs underline"
                >
                  MANAGE
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </section>

      <BulkAllocationModal 
        nccg={allocatingNccg} 
        isOpen={!!allocatingNccg} 
        onClose={() => setAllocatingNccg(null)}
        onComplete={refetch}
      />
    </div>
  );
}
