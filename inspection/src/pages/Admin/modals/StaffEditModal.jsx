import React, { useState, useEffect } from 'react';
import { apiFetch } from '/src/lib/api.js';
import Modal from '../../../components/common/Modal';
import { useAuth } from '../../../contexts/useAuth';

export default function StaffEditModal({ staff, isOpen, onClose, onComplete }) {
  const { profile: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    subcounty: '',
    assigned_nccg: '',
    department: '',
    company_name: '',
    company_email: ''
  });
  const [nccgs, setNccgs] = useState([]);
  const [saving, setSaving] = useState(false);

  const zones = ["Dagoretti North", "Dagoretti South", "Embakasi Central", "Embakasi East", "Embakasi North", "Embakasi South", "Embakasi West", "Kamkunji", "Kasarani", "Kibra", "Langata", "Makadara", "Mathare", "Roysambu", "Ruaraka", "Starehe", "Westlands"].sort();

  const isCreator = currentUser?.id === staff?.created_by || currentUser?.role === 'super_admin';

  useEffect(() => {
    if (staff) {
      setFormData({
        full_name: staff.full_name || '',
        email: staff.email || '',
        subcounty: staff.subcounty || '',
        assigned_nccg: staff.assigned_nccg || '',
        department: staff.department || '',
        company_name: staff.company_name || '',
        company_email: staff.company_email || ''
      });
      
      const fetchNccgs = async () => {
        try {
          const data = await apiFetch('/users/?role=nccg_inspector');
          setNccgs(data.results || data || []);
        } catch (e) {
          console.error("Failed to fetch NCCG Officers:", e);
        }
      };
      fetchNccgs();
    }
  }, [staff]);

  const handleSave = async () => {
    if (!isCreator) {
      alert("Permission Denied: Only the person who created this staff member can edit their details.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        department: formData.department,
        company_name: formData.company_name,
        company_email: formData.company_email
      };

      if (staff.role !== 'finance_manager' && staff.role !== 'admin') {
         payload.subcounty = formData.subcounty;
      }

      await apiFetch(`/users/${staff.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      // Update NCCG assignment separately if role is PHO
      if (staff.role === 'pho' && formData.assigned_nccg !== (staff.assigned_nccg || '')) {
        await apiFetch(`/users/${staff.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ assigned_nccg: formData.assigned_nccg || null })
        });
      }

      onComplete();
      onClose();
    } catch (e) {
      alert('Update failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isCreator ? `Edit Staff: ${staff?.full_name}` : `View Staff: ${staff?.full_name}`}>
      <div className="space-y-4">
        {!isCreator && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
            Read-only mode: You do not have permission to edit this personnel record.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
            <input 
              type="text" 
              disabled={!isCreator}
              value={formData.full_name}
              onChange={e => setFormData({...formData, full_name: e.target.value})}
              className="w-full border border-slate-200 rounded p-2 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Staff ID / Payroll</label>
            <input 
              type="text" 
              disabled={!isCreator}
              value={formData.department}
              onChange={e => setFormData({...formData, department: e.target.value})}
              className="w-full border border-slate-200 rounded p-2 text-sm disabled:bg-slate-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Address</label>
          <input 
            type="email" 
            disabled={!isCreator}
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            className="w-full border border-slate-200 rounded p-2 text-sm disabled:bg-slate-50"
          />
        </div>

        {staff?.role === 'admin' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Company Name</label>
              <input 
                type="text" 
                disabled={!isCreator}
                value={formData.company_name}
                onChange={e => setFormData({...formData, company_name: e.target.value})}
                className="w-full border border-slate-200 rounded p-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Company Email</label>
              <input 
                type="email" 
                disabled={!isCreator}
                value={formData.company_email}
                onChange={e => setFormData({...formData, company_email: e.target.value})}
                className="w-full border border-slate-200 rounded p-2 text-sm disabled:bg-slate-50"
              />
            </div>
          </div>
        )}

        {staff?.role !== 'admin' && staff?.role !== 'finance_manager' && (
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Assigned Subcounty</label>
            <select 
              disabled={!isCreator}
              value={formData.subcounty}
              onChange={e => setFormData({ ...formData, subcounty: e.target.value })}
              className="w-full border border-slate-200 rounded p-2 bg-white text-sm disabled:bg-slate-50"
            >
              <option value="">-- No Specific Subcounty --</option>
              {zones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
        )}

        {(staff?.role === 'admin' || staff?.role === 'finance_manager') && (
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Regional Scope</label>
            <input 
              type="text" 
              disabled 
              value="All Regions (Global)"
              className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 text-slate-500 font-bold"
            />
          </div>
        )}

        {staff?.role === 'pho' && (
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Assigned NCCG Officer</label>
            <select 
              disabled={!isCreator}
              value={formData.assigned_nccg}
              onChange={e => setFormData({ ...formData, assigned_nccg: e.target.value })}
              className="w-full border border-slate-200 rounded p-2 bg-white text-sm disabled:bg-slate-50"
            >
              <option value="">-- Unassigned --</option>
              {nccgs.map(n => <option key={n.id} value={n.id}>{n.full_name}</option>)}
            </select>
          </div>
        )}

        {isCreator && (
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg transition disabled:opacity-50 mt-4"
          >
            {saving ? 'Saving...' : 'Update Staff Details'}
          </button>
        )}
      </div>
    </Modal>
  );
}
