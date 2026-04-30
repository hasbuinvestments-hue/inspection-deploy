import React, { useState } from 'react';
import { apiFetch } from '../../lib/api';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';

export default function PHOApplications({ profile, onApplied }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    
    setLoading(true);
    try {
      const res = await apiFetch(`/inspections/businesses/?search=${encodeURIComponent(search)}&limit=10`);
      // Fix: Res is paginated {count, results, ...}
      setResults(res.results || res);
    } catch (err) {
      alert("Search failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (businessId) => {
    setSubmitting(businessId);
    try {
      await apiFetch('/inspections/business-applications/', {
        method: 'POST',
        body: JSON.stringify({ business: businessId, status: 'active' })
      });
      alert("Application submitted successfully! You can now proceed to the Audit form.");
      // Fix: Trigger onApplied callback to switch tabs
      if (onApplied) onApplied();
      setResults(results.filter(r => r.id !== businessId));
    } catch (err) {
      alert("Application failed: " + err.message);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Business Registry Search</h2>
        <p className="text-sm text-slate-500">Phases 1: Apply for a business in {profile?.subcounty || 'your subcounty'} before starting an audit.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input 
          type="text" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by Business Name or Permit No..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button 
          type="submit" 
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search Registry'}
        </button>
      </form>

      {results.length > 0 ? (
        <Table 
          headers={['Business Name', 'Permit No', 'Ward', 'Action']}
          variant="light"
        >
          {results.map(item => (
            <tr key={item.id} className="border-b border-slate-50">
              <td className="p-4">
                <p className="font-bold text-slate-800">{item.business_name}</p>
                {/* Fix: business_type -> facility_type */}
                <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{item.facility_type}</p>
              </td>
              <td className="p-4 text-sm text-slate-600">{item.permit_no || 'N/A'}</td>
              <td className="p-4 text-sm text-slate-600">{item.ward_name}</td>
              <td className="p-4 text-right">
                <button 
                  onClick={() => handleApply(item.id)}
                  disabled={submitting === item.id}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-md transition-all shadow-md active:scale-95"
                >
                  {submitting === item.id ? 'Applying...' : 'Apply for Audit'}
                </button>
              </td>
            </tr>
          ))}
        </Table>
      ) : search && !loading && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-slate-500">No matching businesses found in {profile?.subcounty}.</p>
        </div>
      )}
    </div>
  );
}
