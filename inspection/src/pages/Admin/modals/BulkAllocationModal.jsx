import React, { useState, useEffect } from 'react';
import { apiFetch } from '/src/lib/api.js';
import Modal from '../../../components/common/Modal';

export default function BulkAllocationModal({ nccg, isOpen, onClose, onComplete }) {
  const [phos, setPhos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      const fetchPhos = async () => {
        try {
          const data = await apiFetch('/users/?role=pho');
          const phosList = data.results || data || [];
          setPhos(phosList);
          setSelectedIds(phosList.filter(p => p.assigned_nccg === nccg.id).map(p => p.id));
        } catch (e) {
          console.error("Failed to fetch PHOs:", e);
        } finally {
          setLoading(false);
        }
      };
      fetchPhos();
    }
  }, [isOpen, nccg]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Unassign removed ones
      const removedIds = phos
        .filter(p => p.assigned_nccg === nccg.id && !selectedIds.includes(p.id))
        .map(p => p.id);
      
      await Promise.all(removedIds.map(id => 
        apiFetch(`/users/${id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ assigned_nccg: null })
        })
      ));

      // 2. Assign selected ones
      await Promise.all(selectedIds.map(id => 
        apiFetch(`/users/${id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ assigned_nccg: nccg.id })
        })
      ));

      onComplete();
      onClose();
    } catch (e) {
      alert("Allocation failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage PHO Allocations: ${nccg?.full_name}`}>
      {loading ? <p className="p-4 text-center">Loading PHOs...</p> : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Assign/Unassign PHOs to this officer's review queue.</p>
          <div className="max-h-[300px] overflow-y-auto space-y-2 border border-slate-200 rounded p-4">
            {phos.map(p => (
              <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer transition">
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(p.id)}
                  onChange={e => {
                    if (e.target.checked) setSelectedIds([...selectedIds, p.id]);
                    else setSelectedIds(selectedIds.filter(id => id !== p.id));
                  }}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-sm">{p.full_name}</p>
                  <p className="text-[10px] text-slate-400 uppercase">{p.subcounty || 'No Subcounty'}</p>
                </div>
                {p.assigned_nccg && p.assigned_nccg !== nccg.id && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">STOLEN?</span>
                )}
              </label>
            ))}
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition disabled:opacity-50"
          >
            {saving ? 'Saving Changes...' : 'Save All Assignments'}
          </button>
        </div>
      )}
    </Modal>
  );
}
