import React, { useState } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import { apiFetch } from '../../lib/api';
import { generateInspectionPDF } from '../../lib/pdfGenerator';
import ReportViewerModal from '../../components/common/ReportViewerModal';

export default function PHOArchive({ profile, onResume }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateFilter, setDateFilter] = useState('');

  const filters = { 
    inspector: profile?.id,
    is_draft: false,
    approval_status__in: 'pending,approved'
  };
  
  if (dateFilter) filters.inspection_date__date = dateFilter;

  const { data, loading, error, page, totalPages, setPage } = usePaginatedData({
    table: 'inspections/inspections',
    filters,
    itemsPerPage: 15,
    authQuery: true
  });
  
  const handleViewPDF = async (item) => {
    try {
      const full = await apiFetch(`/inspections/inspections/${item.id}/`);
      generateInspectionPDF(full, { company_name: profile?.company_name, company_email: profile?.company_email });
    } catch (e) {
      alert("Error generating PDF: " + e.message);
    }
  };

  const handleViewReport = async (item) => {
    try {
      const full = await apiFetch(`/inspections/inspections/${item.id}/`);
      setSelectedReport(full);
    } catch (e) {
      alert("Error loading report: " + e.message);
    }
  };

  const getStatusBadge = (status, approval, paymentStatus) => {
    if (paymentStatus === 'flagged') return <Badge type="red">FINANCE HOLD</Badge>;
    if (approval === 'approved') return <Badge type="green">APPROVED</Badge>;
    if (approval === 'declined') return <Badge type="red">DECLINED</Badge>;
    return <Badge type="amber">LOCKED IN QUEUE</Badge>;
  };

  if (loading && !data.length) return <div className="text-slate-500 text-center p-8 bg-slate-900 border border-slate-700 rounded-lg">Accessing archives...</div>;

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl text-white">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-emerald-400">Official Archive</h2>
            <div className="mt-2 flex items-center gap-2">
               <label className="text-[10px] font-bold text-slate-400 uppercase">Audit Date</label>
               <input 
                 type="date"
                 value={dateFilter}
                 onChange={e => setDateFilter(e.target.value)}
                 className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-bold text-emerald-400 outline-none focus:ring-1 focus:ring-emerald-500"
               />
               {dateFilter && (
                 <button onClick={() => setDateFilter('')} className="text-[10px] text-slate-500 hover:text-white underline font-bold uppercase transition-colors">Clear</button>
               )}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Records Found</p>
            <p className="text-lg font-black text-white">{data.length}</p>
          </div>
       </div>
       
       <Table 
         variant="dark"
         headers={['Audit Date', 'Business Target', 'Filing State', 'Action']}
         emptyMessage="You have no finalized records in the official archive."
       >
         {data.map(item => (
           <tr key={item.id} className="border-b border-slate-700 hover:bg-slate-900/40 transition-colors">
             <td className="p-4 text-slate-100 text-xs font-medium">
               {new Date(item.inspection_date).toLocaleDateString()}
             </td>
             <td className="p-4 font-bold text-slate-100">{item.businesses?.business_name || 'Generic Target'}</td>
             <td className="p-4">{getStatusBadge(item.status, item.approval_status, item.payment_status)}</td>
             <td className="p-4 flex gap-4">
               <button 
                 onClick={() => handleViewReport(item)}
                 className="text-emerald-400 hover:text-emerald-300 font-bold text-xs uppercase"
               >
                 Review
               </button>
               <button 
                 onClick={() => handleViewPDF(item)}
                 className="text-white/40 hover:text-white font-bold text-xs uppercase underline underline-offset-4"
               >
                 Export PDF
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

       <ReportViewerModal 
         inspection={selectedReport}
         onClose={() => setSelectedReport(null)}
       />
    </div>
  );
}
