import { useEffect, useState } from 'react';
import { apiFetch } from '/src/lib/api.js';
import Modal from '../../../components/common/Modal';

export default function AddStaffModal({ isOpen, onClose, onComplete, creatorRole }) {
  const roleOptions = creatorRole === 'super_admin'
    ? [{ id: 'admin', label: 'Regional Admin' }]
    : [
        { id: 'pho', label: 'PHO (Inspector)' },
        { id: 'nccg_inspector', label: 'NCCG Reviewer' },
        { id: 'finance_manager', label: 'Finance Manager' }
      ];

  const defaultRole = roleOptions[0]?.id || 'pho';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: defaultRole,
    staff_id: '',
    subcounty: '',
    company_name: '',
    company_email: ''
  });
  const [loading, setLoading] = useState(false);

  const zones = ["Dagoretti North", "Dagoretti South", "Embakasi Central", "Embakasi East", "Embakasi North", "Embakasi South", "Embakasi West", "Kamkunji", "Kasarani", "Kibra", "Langata", "Makadara", "Mathare", "Roysambu", "Ruaraka", "Starehe", "Westlands"].sort();
  const isZoneRequired = ['pho', 'nccg_inspector'].includes(formData.role);

  useEffect(() => {
    if (!isOpen) return;
    setFormData((prev) => ({
      ...prev,
      role: defaultRole,
      subcounty: ''
    }));
  }, [isOpen, defaultRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isZoneRequired && !formData.subcounty) {
        throw new Error('Subcounty is required for Inspector and NCCG Officer.');
      }

      const data = await apiFetch('/users/admin-create/', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          department: formData.staff_id,
          subcounty: formData.subcounty,
          company_name: formData.company_name,
          company_email: formData.company_email
        })
      });

      alert(`Staff member created successfully!`);
      onComplete();
      onClose();
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: defaultRole,
        staff_id: '',
        subcounty: ''
      });
    } catch (e) {
      alert("Creation failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={creatorRole === 'super_admin' ? 'Register New Admin' : 'Register New Staff Member'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
            <input 
              type="text" 
              required 
              value={formData.full_name}
              onChange={e => setFormData({...formData, full_name: e.target.value})}
              className="w-full border border-slate-200 rounded p-2 text-sm"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Staff ID / Payroll #</label>
            <input 
              type="text" 
              required 
              value={formData.staff_id}
              onChange={e => setFormData({...formData, staff_id: e.target.value})}
              className="w-full border border-slate-200 rounded p-2 text-sm"
              placeholder="NCC-XXXX"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email (Auth Login)</label>
          <input 
            type="email" 
            required 
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            className="w-full border border-slate-200 rounded p-2 text-sm"
            placeholder="jdoe@nairobi.go.ke"
          />
        </div>

        {creatorRole === 'super_admin' && (
          <div className="grid grid-cols-2 gap-4 fade-in">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Company Name</label>
              <input 
                type="text" 
                required 
                value={formData.company_name}
                onChange={e => setFormData({...formData, company_name: e.target.value})}
                className="w-full border border-slate-200 rounded p-2 text-sm"
                placeholder="e.g. Nairobi Pest Solvers"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Company Official Email</label>
              <input 
                type="email" 
                required 
                value={formData.company_email}
                onChange={e => setFormData({...formData, company_email: e.target.value})}
                className="w-full border border-slate-200 rounded p-2 text-sm"
                placeholder="ops@nairobiltd.com"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Initial Password</label>
          <input 
            type="password" 
            required 
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            className="w-full border border-slate-200 rounded p-2 text-sm"
            placeholder="Minimum 6 chars..."
            minLength={6}
          />
        </div>

        <div className={`grid gap-4 ${creatorRole === 'super_admin' ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">System Role</label>
            <select 
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value})}
              className="w-full border border-slate-200 rounded p-2 text-sm"
            >
              {roleOptions.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          {creatorRole !== 'super_admin' && (
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
              Primary Subcounty
            </label>
            <select 
              value={formData.subcounty}
              onChange={e => setFormData({...formData, subcounty: e.target.value})}
              className="w-full border border-slate-200 rounded p-2 text-sm"
            >
              <option value="">
                {isZoneRequired ? '-- Select Subcounty --' : '-- No Specific Subcounty --'}
              </option>
              {zones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg transition mt-4 disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : (creatorRole === 'super_admin' ? 'Create Admin Account' : 'Create Staff Account')}
        </button>
      </form>
    </Modal>
  );
}
