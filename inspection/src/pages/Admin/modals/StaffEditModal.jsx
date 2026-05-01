import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import Modal from '../../../components/common/Modal';
import { useAuth } from '../../../contexts/useAuth';

function getEmailMethod(email) {
  if (!email || !email.includes('@')) return null;
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain === 'gmail.com') return 'gmail';
  return 'custom_domain';
}

const METHOD_INFO = {
  gmail: {
    label: 'Gmail SMTP',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    dot: 'bg-blue-500',
  },
  custom_domain: {
    label: 'Custom Domain',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    dot: 'bg-purple-500',
  },
  fallback: {
    label: 'County Default (Reply-To)',
    color: 'bg-slate-50 border-slate-200 text-slate-600',
    dot: 'bg-slate-400',
  }
};

export default function StaffEditModal({ staff, isOpen, onClose, onComplete }) {
  const { profile: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    subcounty: '',
    assigned_nccg: '',
    department: '',
    company_name: '',
    company_email: '',
    company_gmail_password: '',
    custom_sending_domain: ''
  });
  const [nccgs, setNccgs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showGmailGuide, setShowGmailGuide] = useState(false);

  const zones = ["Dagoretti North", "Dagoretti South", "Embakasi Central", "Embakasi East", "Embakasi North", "Embakasi South", "Embakasi West", "Kamkunji", "Kasarani", "Kibra", "Langata", "Makadara", "Mathare", "Roysambu", "Ruaraka", "Starehe", "Westlands"].sort();

  const isCreator = currentUser?.id === staff?.created_by || currentUser?.role === 'super_admin';

  const emailMethod = staff?.role === 'admin'
    ? (getEmailMethod(formData.company_email) || 'fallback')
    : null;
  const methodInfo = emailMethod ? METHOD_INFO[emailMethod] : null;

  useEffect(() => {
    if (staff) {
      setFormData({
        full_name: staff.full_name || '',
        email: staff.email || '',
        subcounty: staff.subcounty || '',
        assigned_nccg: staff.assigned_nccg || '',
        department: staff.department || '',
        company_name: staff.company_name || '',
        company_email: staff.company_email || '',
        company_gmail_password: '',
        custom_sending_domain: staff.custom_sending_domain || ''
      });

      const fetchNccgs = async () => {
        try {
          const data = await apiFetch('/users/?role=nccg_inspector');
          setNccgs(data.results || data || []);
        } catch (e) {
          console.error('Failed to fetch NCCG Officers:', e);
        }
      };
      fetchNccgs();
    }
  }, [staff]);

  // Auto-fill custom_sending_domain when company_email changes
  useEffect(() => {
    if (emailMethod === 'custom_domain' && formData.company_email.includes('@')) {
      const domain = formData.company_email.split('@')[1] || '';
      setFormData(prev => ({ ...prev, custom_sending_domain: domain }));
    }
  }, [formData.company_email, emailMethod]);

  const handleSave = async () => {
    if (!isCreator) {
      alert('Permission Denied: Only the person who created this staff member can edit their details.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        department: formData.department,
        company_name: formData.company_name,
        company_email: formData.company_email,
        email_send_method: emailMethod || 'fallback',
        custom_sending_domain: formData.custom_sending_domain || null,
        // Only send gmail password if a new one was typed
        ...(formData.company_gmail_password
          ? { company_gmail_password: formData.company_gmail_password }
          : {})
      };

      if (staff.role !== 'finance_manager' && staff.role !== 'admin') {
        payload.subcounty = formData.subcounty;
      }

      await apiFetch(`/users/${staff.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

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
              type="text" disabled={!isCreator} value={formData.full_name}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full border border-slate-200 rounded p-2 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Staff ID / Payroll</label>
            <input
              type="text" disabled={!isCreator} value={formData.department}
              onChange={e => setFormData({ ...formData, department: e.target.value })}
              className="w-full border border-slate-200 rounded p-2 text-sm disabled:bg-slate-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Address</label>
          <input
            type="email" disabled={!isCreator} value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full border border-slate-200 rounded p-2 text-sm disabled:bg-slate-50"
          />
        </div>

        {staff?.role === 'admin' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Company Name</label>
                <input
                  type="text" disabled={!isCreator} value={formData.company_name}
                  onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full border border-slate-200 rounded p-2 text-sm disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Company Email</label>
                <input
                  type="email" disabled={!isCreator} value={formData.company_email}
                  onChange={e => setFormData({ ...formData, company_email: e.target.value })}
                  className="w-full border border-slate-200 rounded p-2 text-sm disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Method indicator */}
            {methodInfo && (
              <div className={`rounded-lg border p-3 text-xs ${methodInfo.color}`}>
                <div className="flex items-center gap-2 font-bold">
                  <span className={`inline-block w-2 h-2 rounded-full ${methodInfo.dot}`} />
                  Active Email Method: {methodInfo.label}
                  {staff.domain_verified && emailMethod === 'custom_domain' && (
                    <span className="ml-auto text-green-600 font-bold">✓ Verified</span>
                  )}
                  {!staff.domain_verified && emailMethod === 'custom_domain' && (
                    <span className="ml-auto text-amber-600 font-bold">Pending DNS</span>
                  )}
                </div>
              </div>
            )}

            {/* Option 2: Gmail password update */}
            {emailMethod === 'gmail' && isCreator && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Gmail App Password <span className="text-slate-400 font-normal">(leave blank to keep existing)</span>
                </label>
                <input
                  type="password" value={formData.company_gmail_password}
                  onChange={e => setFormData({ ...formData, company_gmail_password: e.target.value })}
                  className="w-full border border-slate-200 rounded p-2 text-sm font-mono"
                  placeholder="xxxx xxxx xxxx xxxx"
                />
                <button
                  type="button"
                  onClick={() => setShowGmailGuide(g => !g)}
                  className="text-xs text-blue-600 underline mt-1"
                >
                  {showGmailGuide ? 'Hide' : 'How to get a Gmail App Password'}
                </button>
                {showGmailGuide && (
                  <ol className="text-xs text-slate-600 mt-2 space-y-1 pl-4 list-decimal bg-blue-50 border border-blue-100 rounded p-3">
                    <li>Go to <strong>myaccount.google.com</strong> for the company Gmail</li>
                    <li>Click <strong>Security</strong> → enable <strong>2-Step Verification</strong> if not done</li>
                    <li>Search for <strong>"App Passwords"</strong> in the search bar</li>
                    <li>Create a new App Password with name <strong>"Inspection System"</strong></li>
                    <li>Copy the 16-character code and paste it above</li>
                  </ol>
                )}
              </div>
            )}

            {/* Option 3: Custom domain */}
            {emailMethod === 'custom_domain' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Sending Domain</label>
                <input
                  type="text" disabled={!isCreator} value={formData.custom_sending_domain}
                  onChange={e => setFormData({ ...formData, custom_sending_domain: e.target.value })}
                  className="w-full border border-slate-200 rounded p-2 text-sm font-mono disabled:bg-slate-50"
                  placeholder="companydomain.com"
                />
                {!staff.domain_verified && (
                  <p className="text-xs text-amber-600 mt-1">
                    Domain not yet verified. Ask the company to add the DNS records provided by your email service.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {staff?.role !== 'admin' && staff?.role !== 'finance_manager' && (
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Assigned Subcounty</label>
            <select
              disabled={!isCreator} value={formData.subcounty}
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
              type="text" disabled
              value="All Regions (Global)"
              className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 text-slate-500 font-bold"
            />
          </div>
        )}

        {staff?.role === 'pho' && (
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Assigned NCCG Officer</label>
            <select
              disabled={!isCreator} value={formData.assigned_nccg}
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
            onClick={handleSave} disabled={saving}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg transition disabled:opacity-50 mt-4"
          >
            {saving ? 'Saving...' : 'Update Staff Details'}
          </button>
        )}
      </div>
    </Modal>
  );
}
