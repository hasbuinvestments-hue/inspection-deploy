import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import NewClientModal from './modals/NewClientModal';
import Badge from '../../components/common/Badge';

export default function PHOMyClients({ profile }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState(null);

  const fetchMyClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/inspections/businesses/?registered_by_me=true&limit=50');
      setClients(res.results || res || []);
    } catch (e) {
      console.error('Failed to load registered clients:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyClients();
  }, [fetchMyClients]);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-slate-800">My Registered Clients</h2>
          <p className="text-sm text-slate-500">
            Businesses you registered from the field in {profile?.subcounty}.
          </p>
        </div>
        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          {clients.length} registered
        </span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading your clients...</div>
      ) : clients.length === 0 ? (
        <div className="py-16 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="font-bold text-slate-500 mb-1">No clients registered yet</p>
          <p className="text-sm text-slate-400">
            Use the <strong>Apply for Audit</strong> tab to register a new client from the field.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">UBP No.</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ward</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800">{client.business_name}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-tight">
                      {client.facility_type || 'Type not set'}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {client.permit_no || <span className="text-slate-300 italic">Not provided</span>}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{client.ward_name || '—'}</td>
                  <td className="py-3 px-4 text-slate-600">
                    <p>{client.owner_phone || client.contact_phone || '—'}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                      {client.owner_email || client.contact_email || ''}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    {client.is_new_registration
                      ? <Badge type="amber">New Registration</Badge>
                      : <Badge type="green">In Registry</Badge>}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setEditingClient(client)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewClientModal
        profile={profile}
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
        onSuccess={() => {
          setEditingClient(null);
          fetchMyClients();
        }}
        clientToEdit={editingClient}
      />
    </div>
  );
}
