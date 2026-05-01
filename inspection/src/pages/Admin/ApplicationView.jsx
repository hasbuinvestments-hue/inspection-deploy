import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';

export default function ApplicationView({ profile }) {
  const [applications, setApplications] = useState([]);
  const [phos, setPhos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [reassignId, setReassignId] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [page]);

  useEffect(() => {
    fetchPhos();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/inspections/business-applications/?limit=10&offset=${page * 10}`);
      setApplications(data.results || data);
      if (data.count) {
        setTotalPages(Math.ceil(data.count / 10));
      }
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhos = async () => {
    try {
      const data = await apiFetch('/users/?role=pho');
      setPhos(data.results || data);
    } catch (err) {
      console.error("Failed to fetch PHOs:", err);
    }
  };

  const handleReassign = async (appId, newInspectorId) => {
    if (!newInspectorId) return;
    setIsUpdating(true);
    try {
      await apiFetch(`/inspections/business-applications/${appId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ inspector: newInspectorId })
      });
      setReassignId(null);
      fetchApplications();
    } catch (err) {
      alert("Re-assignment failed: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Staff-to-Business Assignments</h2>
          <p className="text-sm text-slate-500">Overview of all PHO audit requests and active assignments.</p>
        </div>
        <button 
          onClick={fetchApplications}
          className="text-emerald-600 font-bold text-sm hover:underline"
        >
          Refresh List
        </button>
      </div>

      <Table 
        headers={['PHO Officer', 'Target Business', 'Permit No', 'Applied Date', 'Status']}
        variant="light"
        className="shadow-md"
      >
        {loading ? (
          <tr>
            <td colSpan={5} className="p-12 text-center text-slate-400">Loading assignments...</td>
          </tr>
        ) : applications.length === 0 ? (
          <tr>
            <td colSpan={5} className="p-12 text-center text-slate-400 font-medium">No active staff assignments found.</td>
          </tr>
        ) : (
          applications.map(app => (
            <tr key={app.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-4">
                {reassignId === app.id ? (
                  <div className="flex items-center gap-2">
                    <select 
                      onChange={(e) => handleReassign(app.id, e.target.value)}
                      disabled={isUpdating}
                      className="text-xs border border-slate-300 rounded p-1 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      defaultValue=""
                    >
                      <option value="" disabled>Select Staff...</option>
                      {phos.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name || p.username}</option>
                      ))}
                    </select>
                    <button onClick={() => setReassignId(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700">{app.inspector_name || 'N/A'}</span>
                    <button 
                      onClick={() => setReassignId(app.id)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 text-left font-bold uppercase tracking-tighter"
                    >
                      RE-ASSIGN
                    </button>
                  </div>
                )}
              </td>
              <td className="p-4">
                <p className="font-medium text-slate-800">{app.business_name}</p>
                <p className="text-[10px] text-slate-400 uppercase">Registered Business</p>
              </td>
              <td className="p-4 text-sm text-slate-600">{app.permit_no || 'Pending'}</td>
              <td className="p-4 text-sm text-slate-500">
                {new Date(app.applied_at).toLocaleDateString()}
              </td>
              <td className="p-4">
                <Badge type={app.status === 'active' ? 'green' : 'amber'}>
                  {app.status?.toUpperCase() || 'PENDING'}
                </Badge>
              </td>
            </tr>
          ))
        )}
      </Table>

      <Pagination 
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage(p => Math.max(0, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages - 1, p + 1))}
      />
    </div>
  );
}
