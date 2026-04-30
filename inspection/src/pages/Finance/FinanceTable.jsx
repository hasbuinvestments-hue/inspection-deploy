import React, { useState } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import { apiFetch } from '../../lib/api';
import Modal from '../../components/common/Modal';

export default function FinanceTable({ tabType }) {
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [modalType, setModalType] = useState('view');
  const [notes, setNotes] = useState('');
  const [verificationRef, setVerificationRef] = useState('');

  // Determine filters based on tab
  // tabType: unverified, verified, overdue
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [phoFilter, setPhoFilter] = useState('');
  const [collectors, setCollectors] = useState([]);

  const filters = {};
  if (dateFilter) filters.inspection_date__date = dateFilter;
  if (phoFilter) filters.inspector = phoFilter;

  if (tabType === 'unverified') {
    filters.is_paid = true;
    filters.payment_status = 'audit_pending';
  } else if (tabType === 'verified') {
    filters.is_paid = true;
    filters.payment_status = 'verified_by_finance';
  } else if (tabType === 'overdue') {
    filters.is_paid = false;
    filters.status = 'completed';
    filters.payment_status__in = 'pending,unpaid';
  }

  if (methodFilter) {
    filters.payment_method = methodFilter;
  }

  React.useEffect(() => {
    const loadCollectors = async () => {
      const { data } = await apiFetch('/users/?role=pho');
      if (data) setCollectors(data);
    };
    loadCollectors();
  }, []);

  const { data, loading, error, page, totalPages, setPage, refetch } = usePaginatedData({
    table: 'inspections/inspections',
    filters,
    itemsPerPage: 10
  });

  const getBadgeType = (status, isPaid) => {
    if (status === 'verified_by_finance' || status === 'verified') return 'green';
    if (status === 'audit_pending' || status === 'audit') return 'amber';
    if (status === 'flagged') return 'red';
    if (!isPaid) return 'red';
    return 'gray';
  };

  const getBadgeLabel = (status, isPaid) => {
    if (status === 'verified_by_finance' || status === 'verified') return 'VERIFIED';
    if (status === 'audit_pending' || status === 'audit') return 'AUDIT PENDING';
    if (status === 'flagged') return 'FLAGGED';
    if (!isPaid) return 'UNPAID';
    return status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN';
  };

  const openPaymentModal = (item) => {
    setSelectedPayment(item);
    setModalType('view');
    setNotes('');
    setVerificationRef(item.payment_ref || '');
  };

  const handleVerify = async () => {
    if (!selectedPayment || !verificationRef) {
      alert("Please enter the formal receipt reference.");
      return;
    }

    try {
      setModalType('verify');
      const { error } = await apiFetch(`/inspections/inspections/${selectedPayment.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          payment_status: 'verified_by_finance',
          finance_verification_notes: notes,
          payment_ref: verificationRef
        })
      });
      if (error) throw error;
      
      setSelectedPayment(null);
      refetch();
    } catch (e) {
      alert("Error verifying: " + e.message);
    }
  };

  const handleFlag = async () => {
    if (!selectedPayment || !notes) {
      alert("Please provide the mismatch reason in the notes.");
      return;
    }

    try {
      setModalType('flag');
      const { error } = await apiFetch(`/inspections/inspections/${selectedPayment.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          payment_status: 'flagged',
          finance_verification_notes: notes
        })
      });
      if (error) throw error;
      
      setSelectedPayment(null);
      refetch();
    } catch (e) {
      alert("Error flagging: " + e.message);
    }
  };

  const exportToCSV = () => {
    let csv = "Date,Business,Permit,Amount,Status,Ref,Method,Collector,VerifiedBy\n";
    data.forEach(p => {
      const d = new Date(p.payment_date || p.inspection_date).toLocaleDateString();
      const b = `"${p.businesses?.business_name || ''}"`;
      const permit = `"${p.businesses?.permit_no || ''}"`;
      const amt = p.amount_paid || 0;
      const status = p.payment_status || 'PENDING';
      const ref = `"${p.payment_ref || ''}"`;
      const method = `"${p.payment_method || ''}"`;
      const collector = `"${p.inspector_name || ''}"`;
      const verifiedBy = `"${p.payment_verified_by || ''}"`;
      csv += `${d},${b},${permit},${amt},${status},${ref},${method},${collector},${verifiedBy}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_export_${tabType}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading records from server...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded">Error: {error.message}</div>;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-wrap gap-3 items-center">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight mr-4">Operational Ledger</h3>
            <div className="flex flex-col">
               <label className="text-[9px] font-bold text-slate-400 uppercase">Method</label>
               <select 
                value={methodFilter}
                onChange={e => setMethodFilter(e.target.value)}
                className="text-[10px] font-bold border border-slate-200 rounded px-2 py-1 bg-white uppercase text-slate-700"
              >
                <option value="">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="Mpesa">M-Pesa</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            
            <div className="flex flex-col">
               <label className="text-[9px] font-bold text-slate-400 uppercase">Received Date</label>
               <input 
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="text-[10px] font-bold border border-slate-200 rounded px-2 py-1 bg-white text-slate-700"
              />
            </div>

            <div className="flex flex-col">
               <label className="text-[9px] font-bold text-slate-400 uppercase">Field Officer</label>
               <select 
                value={phoFilter}
                onChange={e => setPhoFilter(e.target.value)}
                className="text-[10px] font-bold border border-slate-200 rounded px-2 py-1 bg-white uppercase text-slate-700 max-w-[120px]"
              >
                <option value="">All Staff</option>
                {collectors.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name || c.username}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => { setMethodFilter(''); setDateFilter(''); setPhoFilter(''); }}
              className="mt-3 text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase underline"
            >
              Reset
            </button>
        </div>
        <button 
          onClick={exportToCSV}
          className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          📥 Export CSV
        </button>
      </div>
      <Table 
        headers={['Business', 'Date', 'Method', 'Amount', 'Submitted By', 'Status', 'Actions']}
        emptyMessage="No payments matching this criteria."
      >
        {data.map(item => (
          <tr key={item.id}>
            <td className="p-4">
               <p className="font-medium text-slate-900">{item.businesses?.business_name || 'N/A'}</p>
               <p className="text-[10px] text-slate-600 font-mono tracking-tight">{item.businesses?.permit_no || 'No Permit'}</p>
            </td>
            <td className="p-4 text-slate-700 text-xs">
              {new Date(item.payment_date || item.inspection_date).toLocaleDateString()}
            </td>
            <td className="p-4">
               <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-1 rounded uppercase">
                 {item.payment_method || 'N/A'}
               </span>
            </td>
            <td className="p-4 font-bold text-slate-800">
              KES {Number(item.amount_paid || 0).toLocaleString()}
            </td>
            <td className="p-4 text-xs font-medium text-slate-600 truncate max-w-[120px]">
              {item.inspector_name || 'System'}
            </td>
            <td className="p-4">
              <Badge type={getBadgeType(item.payment_status, item.is_paid)}>
                {getBadgeLabel(item.payment_status, item.is_paid)}
              </Badge>
            </td>
            <td className="p-4">
              <button 
                onClick={() => openPaymentModal(item)}
                className="text-blue-600 hover:text-blue-800 font-semibold text-xs transition-colors underline underline-offset-4"
              >
                Audit Payment
              </button>
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

      {/* Payment Action Modal */}
      <Modal
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title={`${modalType === 'verify' ? 'Verify' : modalType === 'flag' ? 'Flag' : 'Review'} Payment: ${selectedPayment?.businesses?.business_name}`}
      >
        {selectedPayment && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 grid grid-cols-2 gap-4">
               <div>
                 <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Method</p>
                 <p className="font-semibold text-slate-800">{selectedPayment.payment_method || 'N/A'}</p>
               </div>
               <div>
                 <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Amount</p>
                 <p className="font-semibold text-slate-800 text-lg">KES {Number(selectedPayment.amount_paid).toLocaleString()}</p>
               </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Collected By</p>
                  <p className="font-semibold text-slate-800">{selectedPayment.payment_collected_by || 'Field PHO'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Verified By</p>
                  <p className="font-semibold text-slate-800">{selectedPayment.payment_verified_by || 'Pending Finance'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Current Ref</p>
                  <p className="font-semibold text-slate-800 font-mono text-[10px]">{selectedPayment.payment_ref || 'N/A'}</p>
                </div>
                {selectedPayment.ipm_audit > 0 && (
                  <div className="col-span-2 mt-4 pt-4 border-t border-slate-200">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Audit Revenue Breakdown (75/25)</p>
                    <div className="grid grid-cols-3 gap-2">
                       <div className="bg-white p-2 rounded border border-slate-200">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Audit Fee</p>
                          <p className="text-sm font-bold text-slate-800">KES {Number(selectedPayment.ipm_audit).toLocaleString()}</p>
                       </div>
                       <div className="bg-emerald-50 p-2 rounded border border-emerald-100">
                          <p className="text-[9px] font-bold text-emerald-600 uppercase">Govt (25%)</p>
                          <p className="text-sm font-bold text-emerald-700">KES {Number(selectedPayment.ipm_nccg).toLocaleString()}</p>
                       </div>
                       <div className="bg-blue-50 p-2 rounded border border-blue-100">
                          <p className="text-[9px] font-bold text-blue-600 uppercase">Vendor (75%)</p>
                          <p className="text-sm font-bold text-blue-700">KES {Number(selectedPayment.ipm_vendor).toLocaleString()}</p>
                       </div>
                    </div>
                  </div>
                )}
            </div>

            {selectedPayment.payment_status === 'audit_pending' && (
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                <p className="text-sm text-blue-800 mb-4 font-medium">Verify the payment using internal bank/M-Pesa statements.</p>
                
                <label className="block text-sm font-bold text-slate-700 mb-2">Final Official Receipt / Ref</label>
                <input 
                  type="text" 
                  value={verificationRef}
                  onChange={e => setVerificationRef(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 mb-4 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Official statement ref..."
                />

                <label className="block text-sm font-bold text-slate-700 mb-2">Internal Notes / Mismatch Reason</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 mb-4 bg-white"
                  rows="2"
                  placeholder="Only strictly required if flagging as mismatch..."
                ></textarea>

                <div className="flex gap-4 pt-2 border-t border-blue-100">
                   <button onClick={handleVerify} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded transition-colors shadow">
                     Verify & Approve
                   </button>
                   <button onClick={handleFlag} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded transition-colors shadow">
                     Flag Mismatch
                   </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
