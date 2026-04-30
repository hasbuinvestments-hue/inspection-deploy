import React from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import { apiFetch } from '../../lib/api';

export default function PHODrafts({ profile, onResume }) {
  const filters = { 
    inspector: profile?.id,
    is_draft: true 
  };

  const { data, loading, error, page, totalPages, setPage } = usePaginatedData({
    table: 'inspections/inspections',
    filters,
    itemsPerPage: 10,
    authQuery: true
  });

  if (loading) return <div className="text-slate-500 text-center p-8 bg-slate-900/50 rounded-xl border border-slate-800">Loading your drafts...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">My Work in Progress</h2>
            <p className="text-xs text-slate-400 mt-1">Found {data.length} incomplete inspections ready to resume.</p>
          </div>
          <div className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
             <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest animate-pulse">● Live Workspace</span>
          </div>
        </div>

        <Table 
          variant="dark"
          headers={['Last Saved', 'Business Target', 'Service Type', 'Action']}
          emptyMessage="You have no active drafts. Start a new inspection to see them here."
        >
          {data.map(item => (
            <tr key={item.id} className="group hover:bg-slate-900/50 transition-colors">
              <td className="p-4 text-slate-400 text-xs font-medium">
                {new Date(item.updated_at).toLocaleString()}
              </td>
              <td className="p-4">
                 <p className="font-bold text-slate-200">{item.businesses?.business_name || item.business_name || 'Unnamed Business'}</p>
                 <p className="text-[10px] text-slate-500 font-mono italic">{item.businesses?.permit_no || 'DRAFT'}</p>
              </td>
              <td className="p-4">
                 <Badge type="gray">{item.service_type || 'Routine Inspection'}</Badge>
              </td>
              <td className="p-4">
                <button 
                  onClick={async () => {
                    const full = await apiFetch(`/inspections/inspections/${item.id}/`);
                    onResume(full);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2 px-6 rounded-lg text-xs transition-all transform group-hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  RESUME WORK
                </button>
              </td>
            </tr>
          ))}
        </Table>

        <div className="mt-6">
          <Pagination 
            page={page} 
            totalPages={totalPages} 
            onPrev={() => setPage(page - 1)} 
            onNext={() => setPage(page + 1)} 
          />
        </div>
      </div>
    </div>
  );
}
