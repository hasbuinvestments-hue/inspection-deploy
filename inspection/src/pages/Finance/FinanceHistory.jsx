import React, { useState } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import { apiFetch } from '../../lib/api';

export default function FinanceHistory() {
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const filters = {
    payment_status: 'verified_by_finance',
    is_paid: true
  };

  if (methodFilter) filters.payment_method = methodFilter;
  if (dateFilter) filters.inspection_date__date = dateFilter;

  const { data, loading, error, page, totalPages, setPage } = usePaginatedData({
    table: 'inspections/inspections',
    filters,
    itemsPerPage: 15
  });

  const exportToCSV = () => {
    let csv = "Date,Business,Permit,Amount,Ref,Method,Collector,VerifiedBy,Notes\n";
    data.forEach(p => {
      const d = new Date(p.payment_date || p.inspection_date).toLocaleDateString();
      const b = `"${p.businesses?.business_name || ''}"`;
      const permit = `"${p.businesses?.permit_no || ''}"`;
      const amt = p.amount_paid || 0;
      const ref = `"${p.payment_ref || ''}"`;
      const method = `"${p.payment_method || ''}"`;
      const collector = `"${p.inspector_name || ''}"`;
      const verifiedBy = `"${p.payment_verified_by || 'Finance System'}"`;
      const notes = `"${(p.finance_verification_notes || '').replace(/"/g, '""')}"`;
      csv += `${d},${b},${permit},${amt},${ref},${method},${collector},${verifiedBy},${notes}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue_archive_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Accessing archives...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex flex-wrap gap-4 items-center">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Method</label>
              <select 
                value={methodFilter}
                onChange={e => setMethodFilter(e.target.value)}
                className="text-xs font-bold border border-slate-300 rounded px-3 py-1.5 bg-white uppercase text-slate-700"
              >
                <option value="">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="Mpesa">M-Pesa</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Specific Date</label>
              <input 
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="text-xs font-bold border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-700"
              />
            </div>
        </div>
        <button 
          onClick={exportToCSV}
          className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
        >
          📥 Generate Revenue Report (CSV)
        </button>
      </div>

      <Table 
        headers={['Business Legacy', 'Verification Date', 'Ref #', 'Amount', 'Method', 'Officer', 'Status']}
        emptyMessage="No archived collections found for these filters."
      >
        {data.map(item => (
          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
            <td className="p-4">
               <p className="font-bold text-slate-900">{item.businesses?.business_name || 'N/A'}</p>
               <p className="text-[10px] text-slate-500 font-mono italic">{item.businesses?.permit_no}</p>
            </td>
            <td className="p-4 text-slate-600 text-xs font-medium">
              {new Date(item.updated_at).toLocaleDateString()}
            </td>
            <td className="p-4">
               <span className="text-[10px] font-mono bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200">
                 {item.payment_ref || 'MISSING'}
               </span>
            </td>
            <td className="p-4 font-black text-slate-900">
              {Number(item.amount_paid).toLocaleString()}
            </td>
            <td className="p-4 text-xs font-bold text-slate-700">
              {item.payment_method}
            </td>
            <td className="p-4 text-xs text-slate-500 font-medium">
              {item.inspector_name}
            </td>
            <td className="p-4">
              <Badge type="green">FULL SETTLEMENT</Badge>
            </td>
          </tr>
        ))}
      </Table>
      
      <Pagination 
        page={page} 
        totalPages={totalPages} 
        onPrev={() => setPage(page - 1)} 
        onNext={() => setPage(page + 1)} 
      />
    </div>
  );
}
