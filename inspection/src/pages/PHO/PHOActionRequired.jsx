import React, { useState } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import { apiFetch } from '../../lib/api';
import ReportViewerModal from '../../components/common/ReportViewerModal';

export default function PHOActionRequired({ profile, onResume }) {
  const [selectedReport, setSelectedReport] = useState(null);

  const filters = { 
    inspector: profile?.id,
    is_draft: false,
    status__in: 'declined,flagged' // Backend should support this or we filter by payment_status/approval_status
  };

  // Explicit filters for double safety
  const { data, loading, error, page, totalPages, setPage } = usePaginatedData({
    table: 'inspections/inspections',
    filters: {
      inspector: profile?.id,
      is_draft: false,
      is_action_required: true
    },
    itemsPerPage: 15,
    authQuery: true
  });

  const actionableData = data;

  if (loading && !data.length) return <div className="text-slate-500 text-center p-8 bg-rose-950/20 rounded-xl border border-rose-900/30">Scanning for issues...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-slate-950 p-6 rounded-2xl border border-rose-900/30 shadow-2xl relative overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 blur-3xl rounded-full"></div>
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
               Action Required
            </h2>
            <p className="text-xs text-rose-400/80 mt-1">Found {actionableData.length} reports flagged for correction or payment verification.</p>
          </div>
          <div className="bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/30">
             <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest tracking-tighter">Requires Attention</span>
          </div>
        </div>

        <Table 
          variant="dark"
          headers={['Priority', 'Issue Reason', 'Business Target', 'Inspector Action']}
          emptyMessage="Excellent! You have no reports with pending corrections."
        >
          {actionableData.map(item => (
            <tr key={item.id} className="group hover:bg-rose-500/5 transition-colors border-l-2 border-l-transparent hover:border-l-rose-500">
              <td className="p-4">
                 <Badge type="red">{item.payment_status === 'flagged' ? 'FINANCE HOLD' : 'REPO RT DECLINED'}</Badge>
              </td>
              <td className="p-4">
                 <p className="text-xs font-medium text-rose-200 italic line-clamp-1">
                   "{item.finance_verification_notes || item.nccg_notes || 'Review details for feedback.'}"
                 </p>
              </td>
              <td className="p-4">
                 <p className="font-bold text-slate-200">{item.businesses?.business_name || 'N/A'}</p>
                 <p className="text-[10px] text-slate-500 font-mono italic">{item.businesses?.permit_no}</p>
              </td>
              <td className="p-4 flex gap-3">
                <button 
                  onClick={async () => {
                    const full = await apiFetch(`/inspections/inspections/${item.id}/`);
                    setSelectedReport(full);
                  }}
                  className="text-slate-400 hover:text-white font-bold text-xs transition-colors"
                >
                  VIEW LOGS
                </button>
                <button 
                  onClick={async () => {
                    const full = await apiFetch(`/inspections/inspections/${item.id}/`);
                    onResume(full);
                  }}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-1.5 px-4 rounded-lg text-[10px] transition-all"
                >
                  FIX & RESUBMIT
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

      <ReportViewerModal 
        inspection={selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    </div>
  );
}
