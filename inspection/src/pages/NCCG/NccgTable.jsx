import React, { useEffect, useState } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { useAuth } from '../../contexts/useAuth';
import { apiFetch } from '../../lib/api';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import NccgReviewModal from './NccgReviewModal';
import { generateInspectionPDF } from '../../lib/pdfGenerator';

export default function NccgTable({ tabType }) {
  const { profile } = useAuth();
  const [selectedReport, setSelectedReport] = useState(null);
  const [isFetchingFull, setIsFetchingFull] = useState(false);

  const handleViewPDF = async (item) => {
    try {
      const fullRecord = await apiFetch(`/inspections/inspections/${item.id}/`);
      generateInspectionPDF(fullRecord, { company_name: profile?.company_name, company_email: profile?.company_email });
    } catch (e) {
      alert('Error generating PDF: ' + e.message);
    }
  };
  const [assignedPhos, setAssignedPhos] = useState([]);
  const [phosLoaded, setPhosLoaded] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkActing, setIsBulkActing] = useState(false);

  const [dateFilter, setDateFilter] = useState('');
  const [phoFilter, setPhoFilter] = useState('');

  const filters = { is_draft: false };
  if (dateFilter) filters.inspection_date__date = dateFilter;
  if (phoFilter) filters.inspector = phoFilter;

  if (tabType === 'pending') {
    filters.approval_status = 'pending';
  } else if (tabType === 'approved') {
    filters.approval_status = 'approved';
  } else if (tabType === 'declined') {
    filters.approval_status = 'declined';
  }

  const { data, loading, error, page, totalPages, setPage, refetch } = usePaginatedData({
    table: 'inspections/inspections',
    filters,
    itemsPerPage: 10,
    authQuery: true
  });

  const getBadgeType = (status) => {
    if (status === 'approved') return 'green';
    if (status === 'pending') return 'amber';
    if (status === 'declined') return 'red';
    return 'gray';
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === data.length) setSelectedIds([]);
    else setSelectedIds(data.map(i => i.id));
  };

  const bulkUpdate = async (status) => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to ${status} ${selectedIds.length} reports?`)) return;

    setIsBulkActing(true);
    try {
      await Promise.all(selectedIds.map(id => 
        apiFetch(`/inspections/inspections/${id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ approval_status: status })
        })
      ));
      
      setSelectedIds([]);
      refetch();
    } catch (e) {
      alert("Bulk update failed: " + e.message);
    } finally {
      setIsBulkActing(false);
    }
  };

  useEffect(() => {
    const fetchPhos = async () => {
      const url = profile?.role === 'super_admin' ? '/users/?role=pho' : `/users/?role=pho&assigned_nccg=${profile?.id}`;
      const result = await apiFetch(url);
      setAssignedPhos(result?.results || result || []);
    };
    if (profile?.id) fetchPhos();
  }, [profile]);

  if (loading && !data) return <div className="p-8 text-center text-slate-500">Loading queues...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded">Error: {error.message}</div>;

  return (
    <>
      <div className="flex flex-wrap gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">Filter by Date</label>
          <input 
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="text-xs font-bold border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">Filter by PHO</label>
          <select 
            value={phoFilter}
            onChange={e => setPhoFilter(e.target.value)}
            className="text-xs font-bold border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-700 uppercase focus:ring-2 focus:ring-emerald-500 outline-none min-w-[150px]"
          >
            <option value="">All PHOs</option>
            {assignedPhos.map(p => (
              <option key={p.id} value={p.id}>{p.full_name || p.username}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end flex-grow justify-end">
           <button 
             onClick={() => { setDateFilter(''); setPhoFilter(''); }}
             className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase underline"
           >
             Clear Filters
           </button>
        </div>
      </div>

      {tabType === 'pending' && selectedIds.length > 0 && (
        <div className="bg-emerald-900 border border-emerald-500/50 p-4 rounded-xl mb-4 flex justify-between items-center fade-in">
          <p className="font-bold text-emerald-400">{selectedIds.length} Reports Selected for Mass Action</p>
          <div className="flex gap-4">
            <button 
              onClick={() => bulkUpdate('approved')} 
              disabled={isBulkActing}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
            >
              ✓ Mass Approve
            </button>
            <button 
              onClick={() => bulkUpdate('declined')} 
              disabled={isBulkActing}
              className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
            >
              ✕ Mass Decline
            </button>
          </div>
        </div>
      )}

      <Table 
        headers={[
          <input type="checkbox" checked={selectedIds.length === data.length && data.length > 0} onChange={selectAll} className="cursor-pointer" />,
          'Wait', 'Business', 'Inspector', 'Service', 'Status', 'Actions'
        ]}
        emptyMessage="No reports matching this criteria."
      >
        {data.map(item => (
          <tr key={item.id} className={selectedIds.includes(item.id) ? 'bg-emerald-500/10' : ''}>
            <td className="p-4">
               <input 
                 type="checkbox" 
                 checked={selectedIds.includes(item.id)} 
                 onChange={() => toggleSelection(item.id)} 
                 className="cursor-pointer"
               />
            </td>
            <td className="p-4 text-xs font-semibold text-slate-700">
               {(() => {
                 const days = Math.floor((new Date() - new Date(item.created_at || item.inspection_date)) / (1000 * 60 * 60 * 24));
                 return days === 0 ? 'Today' : `${days}d`;
               })()}
            </td>
            <td className="p-4 font-medium text-slate-900">{item.businesses?.business_name || 'N/A'}</td>
            <td className="p-4 text-sm text-slate-800 font-semibold">{item.inspector_name}</td>
            <td className="p-4 text-xs text-slate-700 font-medium">{item.service_type || 'Routine'}</td>
            <td className="p-4 text-xs">
              <Badge type={getBadgeType(item.approval_status)}>{item.approval_status?.toUpperCase() || 'UNKNOWN'}</Badge>
            </td>
            <td className="p-4 flex gap-3">
              <button
                onClick={async () => {
                  setIsFetchingFull(true);
                  try {
                    const data = await apiFetch(`/inspections/inspections/${item.id}/`);
                    setSelectedReport(data);
                  } catch (e) {
                    alert("Failed to load details: " + e.message);
                  } finally {
                    setIsFetchingFull(false);
                  }
                }}
                disabled={isFetchingFull}
                className="text-blue-600 hover:text-blue-800 font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {item.approval_status === 'pending' ? 'Review Form' : 'Details'}
              </button>
              {item.approval_status === 'approved' && (
                <button
                  onClick={() => handleViewPDF(item)}
                  className="text-slate-400 hover:text-slate-700 font-semibold text-sm transition-colors underline underline-offset-4"
                >
                  PDF
                </button>
              )}
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

      <NccgReviewModal 
        inspection={selectedReport} 
        onClose={() => setSelectedReport(null)} 
        refetch={refetch} 
      />
    </>
  );
}
