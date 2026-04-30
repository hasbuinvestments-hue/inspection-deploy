import React, { useMemo, useState } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

export default function AuditTrail() {
  const [selectedLog, setSelectedLog] = useState(null);
  const [actionFilter, setActionFilter] = useState('');

  const { data, loading, error, page, totalPages, setPage, totalCount } = usePaginatedData({
    table: 'inspections/activity-logs',
    itemsPerPage: 20,
    filters: actionFilter ? { action: actionFilter } : {},
    authQuery: true
  });

  const getBadgeType = (action) => {
    if (action.includes('REGISTERED')) return 'emerald';
    if (action.includes('PURGED')) return 'red';
    if (action.includes('TRANSFERRED')) return 'amber';
    return 'blue';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">System Audit Trail</h2>
            <p className="text-sm text-slate-500">Total activities recorded: {totalCount || 0}</p>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="">All Actions</option>
              <option value="STAFF_REGISTERED">Staff Registered</option>
              <option value="STAFF_PURGED">Staff Purged</option>
              <option value="STAFF_TRANSFERRED">Staff Transferred</option>
              <option value="INSPECTION_STATUS_CHANGE">Status Changes</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading audit trail...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 bg-rose-50 border-b border-rose-100">
            Error loading logs: {error.message}
          </div>
        ) : (
          <>
            <Table
              headers={['Time', 'User', 'Action', 'Target/Details', 'Action']}
              emptyMessage="No activity logs found matching your filters."
            >
              {data.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-400 font-mono text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 font-semibold text-slate-700">{log.user_name}</td>
                  <td className="p-4">
                    <Badge type={getBadgeType(log.action)}>{log.action_display}</Badge>
                  </td>
                  <td className="p-4 text-slate-600 truncate max-w-xs text-sm">
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-800 font-bold text-sm"
                    >
                      View Details
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
          </>
        )}
      </div>

      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Details"
      >
        {selectedLog && (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Performed By</p>
                <p className="text-slate-800 font-bold">{selectedLog.user_name}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">{selectedLog.user_id}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Timestamp</p>
                <p className="text-slate-800 font-bold">{new Date(selectedLog.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 relative">
              <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-500 opacity-50 uppercase">Payload</div>
              <pre className="text-emerald-400 font-mono text-xs overflow-auto max-h-96">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
