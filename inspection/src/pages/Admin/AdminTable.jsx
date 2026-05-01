import React, { useState } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { useAuth } from '../../contexts/useAuth';
import { apiFetch } from '../../lib/api';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import ReportViewerModal from '../../components/common/ReportViewerModal';
import { generateInspectionPDF } from '../../lib/pdfGenerator';
import StaffEditModal from './modals/StaffEditModal';
import AddStaffModal from './modals/AddStaffModal';
import TransferZoneModal from './modals/TransferZoneModal';

export default function AdminTable({ tabType }) {
  const { profile: currentUser } = useAuth();
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [transferringStaff, setTransferringStaff] = useState(null);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [phoFilter, setPhoFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [zoneList, setZoneList] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkActing, setIsBulkActing] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');

  React.useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [phos, zones] = await Promise.all([
          apiFetch('/users/?role=pho'),
          apiFetch('/inspections/inspections/subcounties/')
        ]);
        if (phos) setStaffList(phos.results || phos || []);
        if (zones) setZoneList(zones);
      } catch (e) {
        console.error("Metadata load failed", e);
      }
    };
    loadMetadata();
  }, []);

  let filters = {};
  if (tabType !== 'inspectors') {
    if (dateFilter) filters.inspection_date__date = dateFilter;
    if (phoFilter) filters.inspector = phoFilter;
    if (zoneFilter) filters.business__subcounty_name = zoneFilter;
  } else {
    // Staff filtering
    if (zoneFilter) filters.subcounty = zoneFilter;
    // We can also filter by role if needed, but for now we keep it to subcounty
  }

  if (tabType === 'reports') {
    // get all 
  } else if (tabType === 'alerts') {
     filters.is_alert = true;
  } else if (tabType === 'declined') {
     filters.approval_status = 'declined';
  } else if (tabType === 'payments') {
     filters.is_paid = true;
  } else if (tabType === 'field_registrations') {
     filters.is_new_registration = true;
  }

  const { data, loading, error, page, totalPages, setPage, refetch } = usePaginatedData({
    table: tabType === 'inspectors' ? 'users' : (tabType === 'field_registrations' ? 'inspections/businesses' : 'inspections/inspections'),
    filters,
    itemsPerPage: 15,
    authQuery: true
  });

  const toggleUserStatus = async (user) => {
    try {
      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      await apiFetch(`/users/${user.id}/`, { 
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }) 
      });
      refetch();
    } catch (e) {
      alert("Status Toggle Failed: " + e.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`CRITICAL: Are you sure you want to PERMANENTLY DELETE ${user.full_name}? This action is irreversible.`)) return;
    
    try {
      await apiFetch('/users/admin-purge/', { 
        method: 'POST',
        body: JSON.stringify({ user_id: user.id }) 
      });
      refetch();
      alert("Staff member purged successfully.");
    } catch (e) {
      alert("Safe Purge Failed: " + e.message);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      const invite = await apiFetch('/users/invites/', {
        method: 'POST',
        body: JSON.stringify({ role: 'admin' })
      });
      const baseUrl = window.location.origin;
      setGeneratedInviteLink(`${baseUrl}/register-invite/${invite.id}`);
    } catch (e) {
      alert("Invite generation failed: " + e.message);
    }
  };

  const inspectReport = async (item) => {
    try {
      const fullRecord = await apiFetch(`/inspections/inspections/${item.id}/`);
      setSelectedItem(fullRecord);
    } catch (e) {
      alert('Failed to load full report details: ' + e.message);
    }
  };

  const handleViewPDF = async (item) => {
    try {
      const fullRecord = await apiFetch(`/inspections/inspections/${item.id}/`);
      generateInspectionPDF(fullRecord, { company_name: currentUser?.company_name, company_email: currentUser?.company_email });
    } catch (e) {
      alert('Error generating PDF: ' + e.message);
    }
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
      // For bulk update, we loop for now, or implement a backend bulk action
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

  if (loading) return <div className="p-8 text-center text-slate-500">Executing Admin queries...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded">Error: {error.message}</div>;

  return (
    <>
        {tabType === 'inspectors' && (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
          <div className="flex justify-end mb-4">
            <button 
              onClick={() => setIsAddingStaff(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded shadow-sm text-sm"
            >
              {currentUser?.role === 'super_admin' ? '+ Register New Admin' : '+ Register New Staff'}
            </button>
            {currentUser?.role === 'super_admin' && (
              <button 
                onClick={handleGenerateInvite}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded shadow-sm text-sm ml-2"
              >
                🔗 Generate Invite Link
              </button>
            )}
          </div>
        )}
        {tabType !== 'inspectors' && (
          <div className="flex flex-wrap gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">Filter by Date</label>
              <input 
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="text-xs font-bold border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">Filter by PHO</label>
              <select 
                value={phoFilter}
                onChange={e => setPhoFilter(e.target.value)}
                className="text-xs font-bold border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-700 uppercase outline-none focus:ring-2 focus:ring-slate-400 min-w-[150px]"
              >
                <option value="">All Personnel</option>
                {staffList.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.username}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">NCCG Zone</label>
              <select 
                value={zoneFilter}
                onChange={e => setZoneFilter(e.target.value)}
                className="text-xs font-bold border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-700 uppercase outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">All Zones</option>
                {zoneList.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div className="flex items-end flex-grow justify-end">
               <button 
                 onClick={() => { setDateFilter(''); setPhoFilter(''); setZoneFilter(''); }}
                 className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase underline"
               >
                 Flush Filters
               </button>
            </div>
          </div>
        )}
        {tabType !== 'inspectors' && selectedIds.length > 0 && (
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl mb-4 flex justify-between items-center fade-in">
            <p className="font-bold text-slate-300">{selectedIds.length} Records Selected</p>
            <div className="flex gap-4">
              <button 
                onClick={() => bulkUpdate('approved')} 
                disabled={isBulkActing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
              >
                ✓ Active Approve
              </button>
              <button 
                onClick={() => bulkUpdate('declined')} 
                disabled={isBulkActing}
                className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
              >
                ✕ Block/Decline
              </button>
            </div>
          </div>
        )}
        <Table 
          headers={tabType === 'inspectors' 
            ? ['Staff Member', 'Role', 'Company Alignment', 'Zone', 'Status', 'Actions'] 
            : tabType === 'field_registrations'
            ? ['Date Registered', 'Business Name', 'Permit/UBP', 'Zone', 'Ward', 'Registered By', 'Actions']
            : [
                <input type="checkbox" checked={selectedIds.length === data.length && data.length > 0} onChange={selectAll} className="cursor-pointer" />,
                'Wait', 'System ID', 'Date', 'Business Target', 'Service', 'Inspector', 'Flags', 'Actions']
            }
          emptyMessage="No matching records found."
        >
          {data.map(item => (
            tabType === 'inspectors' ? (
              <tr key={item.id}>
                <td className="p-4">
                  <div className="font-bold">{item.full_name}</div>
                  <div className="text-[10px] text-slate-600 font-mono">{item.id.split('-')[0]}</div>
                </td>
                <td className="p-4">
                  <Badge type={item.role === 'nccg_officer' ? 'amber' : 'blue'}>{item.role.replace('_', ' ').toUpperCase()}</Badge>
                </td>
                <td className="p-4">
                   <div className="font-bold text-slate-700 text-xs truncate max-w-[150px]">
                     {item.role === 'admin' ? item.company_name : (item.works_for || 'System')}
                   </div>
                   <div className="text-[10px] text-slate-400">
                     {item.role === 'admin' ? item.company_email : ''}
                   </div>
                </td>
                <td className="p-4 text-slate-600">{item.subcounty || 'Global'}</td>
                <td className="p-4">
                  <Badge type={item.status === 'active' ? 'green' : 'red'}>{item.status === 'active' ? 'ACTIVE' : 'SUSPENDED'}</Badge>
                </td>
                <td className="p-4 flex gap-2">
                  {item.id !== currentUser?.id && (
                    <button onClick={() => toggleUserStatus(item)} className={`text-xs font-bold ${item.status === 'active' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {item.status === 'active' ? 'SUSPEND' : 'ACTIVATE'}
                    </button>
                  )}
                  <button onClick={() => setEditingStaff(item)} className="text-xs font-bold text-blue-500 underline">EDIT</button>
                  
                  {(item.role === 'pho' || item.role === 'nccg_inspector') && (currentUser?.id === item.created_by || currentUser?.role === 'super_admin') && (
                    <button 
                      onClick={() => setTransferringStaff(item)}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-800 ml-2 border border-emerald-200 px-1 rounded bg-emerald-50"
                    >
                      TRANSFER
                    </button>
                  )}
                  
                  {currentUser?.role === 'super_admin' && (
                    <button 
                      onClick={() => handleDeleteUser(item)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 ml-2 border border-rose-200 px-1 rounded bg-rose-50"
                    >
                      PURGE
                    </button>
                  )}
                </td>
              </tr>
            ) : tabType === 'field_registrations' ? (
              <tr key={item.id}>
                <td className="p-4 text-xs text-slate-500 font-medium">
                  {new Date(item.created_at).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-800">{item.business_name}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-tighter">{item.facility_type}</div>
                </td>
                <td className="p-4 text-sm font-semibold text-slate-600">
                  {item.permit_no || <Badge type="amber">PENDING_UBP</Badge>}
                </td>
                <td className="p-4 text-xs font-bold text-slate-700">{item.subcounty_name}</td>
                <td className="p-4 text-sm text-slate-600">{item.ward_name}</td>
                <td className="p-4">
                  <div className="text-xs font-bold text-emerald-700">{item.created_by_name}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-tighter">Field Agent</div>
                </td>
                <td className="p-4 flex gap-3">
                  <button className="text-blue-600 hover:underline text-xs font-bold">Inspect Profile</button>
                </td>
              </tr>
            ) : (
              <tr key={item.id} className={selectedIds.includes(item.id) ? 'bg-emerald-500/5' : ''}>
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
                <td className="p-4 text-xs font-mono text-slate-600">{item.id.split('-')[0]}</td>
                <td className="p-4 text-slate-700">{new Date(item.inspection_date).toLocaleDateString()}</td>
                <td className="p-4 font-medium text-slate-800">{item.businesses?.business_name || 'N/A'}</td>
                <td className="p-4 text-xs text-slate-700 font-medium">{item.service_type || 'Routine'}</td>
                <td className="p-4 text-xs text-slate-700 font-semibold">{item.inspector_name}</td>
                <td className="p-4">
                  {item.payment_status === 'flagged' && <Badge type="red">PAYMENT_HOLD</Badge>}
                  {item.approval_status === 'pending' && <Badge type="amber">LOCKED_IN_QUEUE</Badge>}
                  {(item.approval_status !== 'pending' && item.payment_status !== 'flagged') && <Badge type="green">NOMINAL</Badge>}
                </td>
                <td className="p-4 flex gap-3">
                  <button onClick={() => inspectReport(item)} className="text-slate-600 hover:text-blue-800 font-semibold text-sm transition-colors decoration-dashed decoration-1 underline underline-offset-4">
                    Inspect
                  </button>
                  {item.approval_status === 'approved' && (
                    <button onClick={() => handleViewPDF(item)} className="text-slate-400 hover:text-slate-700 font-semibold text-sm transition-colors underline underline-offset-4">
                      PDF
                    </button>
                  )}
                </td>
              </tr>
            )
          ))}
        </Table>
      
      <Pagination 
        page={page} 
        totalPages={totalPages} 
        onPrev={() => setPage(page - 1)} 
        onNext={() => setPage(page + 1)} 
      />

      <StaffEditModal 
        staff={editingStaff} 
        isOpen={!!editingStaff} 
        onClose={() => setEditingStaff(null)} 
        onComplete={refetch}
      />

      <TransferZoneModal 
        staff={transferringStaff}
        isOpen={!!transferringStaff}
        onClose={() => setTransferringStaff(null)}
        onComplete={refetch}
      />

      <AddStaffModal 
        isOpen={isAddingStaff} 
        onClose={() => setIsAddingStaff(false)} 
        onComplete={refetch}
        creatorRole={currentUser?.role}
      />

      <ReportViewerModal 
        inspection={selectedItem} 
        onClose={() => setSelectedItem(null)} 
      />

      {generatedInviteLink && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-200 fade-in">
             <h3 className="text-xl font-black text-slate-800 mb-2">Self-Registration Link Generated!</h3>
             <p className="text-sm text-slate-500 mb-6">Share this unique link with the prospective Regional Admin. They will be able to set their own password and company details.</p>
             
             <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6 break-all font-mono text-xs text-blue-600 font-bold select-all">
                {generatedInviteLink}
             </div>

             <div className="flex gap-4">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedInviteLink);
                    alert("Link copied to clipboard!");
                  }}
                  className="flex-grow bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
                >
                  Copy Link
                </button>
                <button 
                  onClick={() => setGeneratedInviteLink('')}
                  className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-slate-600 transition-all"
                >
                  Close
                </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
