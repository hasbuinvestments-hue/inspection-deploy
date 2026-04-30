import React, { useState } from 'react';
import { apiFetch } from '/src/lib/api.js';
import Modal from '../../../components/common/Modal';

export default function TransferZoneModal({ staff, isOpen, onClose, onComplete }) {
  const [newSubcounty, setNewSubcounty] = useState(staff?.subcounty || '');
  const [loading, setLoading] = useState(false);

  const zones = ["Dagoretti North", "Dagoretti South", "Embakasi Central", "Embakasi East", "Embakasi North", "Embakasi South", "Embakasi West", "Kamkunji", "Kasarani", "Kibra", "Langata", "Makadara", "Mathare", "Roysambu", "Ruaraka", "Starehe", "Westlands"].sort();

  const handleTransfer = async () => {
    if (!newSubcounty) {
        alert("Please select a target subcounty.");
        return;
    }
    setLoading(true);
    try {
      await apiFetch('/users/transfer-subcounty/', {
        method: 'POST',
        body: JSON.stringify({ 
            user_id: staff.id, 
            subcounty: newSubcounty 
        })
      });
      alert(`${staff.full_name} has been transferred to ${newSubcounty}.`);
      onComplete();
      onClose();
    } catch (e) {
      alert("Transfer failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!staff) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Transfer Personnel: ${staff.full_name}`}>
      <div className="space-y-6 p-1">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
           <p className="text-xs text-slate-500 font-bold uppercase mb-2">Current Location</p>
           <p className="text-lg font-bold text-slate-800">{staff.subcounty || 'Unassigned / Global'}</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">New Target Subcounty</label>
          <select 
            value={newSubcounty}
            onChange={e => setNewSubcounty(e.target.value)}
            className="w-full border border-slate-200 rounded-xl p-3 bg-white text-sm font-semibold shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          >
            <option value="">-- Select New Location --</option>
            {zones.map(z => (
              <option key={z} value={z} disabled={z === staff.subcounty}>
                {z} {z === staff.subcounty ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-4">
            <button 
                onClick={handleTransfer}
                disabled={loading || !newSubcounty || newSubcounty === staff.subcounty}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {loading ? 'Processing Transfer...' : 'Confirm Zone Transfer'}
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-4 uppercase font-bold tracking-wider">
                Note: This will move all future audits for this inspector to the new zone.
            </p>
        </div>
      </div>
    </Modal>
  );
}
