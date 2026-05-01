import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import Modal from '../../../components/common/Modal';

// Helper removed in favor of explicit selection

const METHOD_INFO = {
  gmail: {
    label: 'Gmail SMTP',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    dot: 'bg-blue-500',
    description: 'Reports will send directly from this Gmail. Requires an App Password.'
  },
  custom_domain: {
    label: 'Custom Domain',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    dot: 'bg-purple-500',
    description: 'Reports will send from your domain. Add the DNS records shown below.'
  },
  fallback: {
    label: 'County Default (Reply-To)',
    color: 'bg-slate-50 border-slate-200 text-slate-600',
    dot: 'bg-slate-400',
    description: 'Reports send from the county email. Replies go to the company email.'
  }
};

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
    company_email: '',
    email_send_method: 'fallback',
    company_gmail_password: '',
    custom_sending_domain: ''
  });
  const [loading, setLoading] = useState(false);
  const [showGmailGuide, setShowGmailGuide] = useState(false);

  const zones = ["Dagoretti North", "Dagoretti South", "Embakasi Central", "Embakasi East", "Embakasi North", "Embakasi South", "Embakasi West", "Kamkunji", "Kasarani", "Kibra", "Langata", "Makadara", "Mathare", "Roysambu", "Ruaraka", "Starehe", "Westlands"].sort();
  const isZoneRequired = ['pho', 'nccg_inspector'].includes(formData.role);

  const emailMethod = creatorRole === 'super_admin' ? formData.email_send_method : null;
  const methodInfo = emailMethod ? METHOD_INFO[emailMethod] : null;

  // Auto-fill custom_sending_domain from company_email
  useEffect(() => {
    if (emailMethod === 'custom_domain' && formData.company_email.includes('@')) {
      const domain = formData.company_email.split('@')[1] || '';
      setFormData(prev => ({ ...prev, custom_sending_domain: domain }));
    }
  }, [formData.company_email, emailMethod]);

  useEffect(() => {
    if (!isOpen) return;
    setFormData((prev) => ({ ...prev, role: defaultRole, subcounty: '' }));
  }, [isOpen, defaultRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isZoneRequired && !formData.subcounty) {
        throw new Error('Subcounty is required for Inspector and NCCG Officer.');
      }
      if (emailMethod === 'gmail' && !formData.company_gmail_password) {
        throw new Error('Gmail App Password is required when using a Gmail company email.');
      }

      await apiFetch('/users/admin-create/', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          department: formData.staff_id,
          subcounty: formData.subcounty,
          company_name: formData.company_name,
          company_email: formData.company_email,
          company_gmail_password: formData.company_gmail_password || null,
          custom_sending_domain: formData.custom_sending_domain || null,
          email_send_method: formData.email_send_method || 'fallback'
        })
      });

      alert('Staff member created successfully!');
      onComplete();
      onClose();
      setFormData({
        email: '', password: '', full_name: '', role: defaultRole,
        staff_id: '', subcounty: '', company_name: '', company_email: '',
        company_gmail_password: '', custom_sending_domain: ''
      });
    } catch (e) {
      alert('Creation failed: ' + e.message);
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
              type="text" required value={formData.full_name}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full border border-slate-200 rounded p-2 text-sm"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Staff ID / Payroll #</label>
            <input
              type="text" required value={formData.staff_id}
              onChange={e => setFormData({ ...formData, staff_id: e.target.value })}
              className="w-full border border-slate-200 rounded p-2 text-sm"
              placeholder="NCC-XXXX"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email (Auth Login)</label>
          <input
            type="email" required value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full border border-slate-200 rounded p-2 text-sm"
            placeholder="jdoe@nairobi.go.ke"
          />
        </div>

        {creatorRole === 'super_admin' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Company Name</label>
                <input
                  type="text" required value={formData.company_name}
                  onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full border border-slate-200 rounded p-2 text-sm"
                  placeholder="e.g. Nairobi Pest Solvers"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Company Official Email</label>
                <input
                  type="email" required value={formData.company_email}
                  onChange={e => setFormData({ ...formData, company_email: e.target.value })}
                  className="w-full border border-slate-200 rounded p-2 text-sm"
                  placeholder="e.g. ops@pestsolvers.com"
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Report Sending Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(METHOD_INFO).map(([id, info]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFormData({ ...formData, email_send_method: id })}
                      className={`p-2 rounded-lg border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${
                        formData.email_send_method === id 
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span>{info.label.split(' (')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {methodInfo && (
                <div className={`rounded-lg border p-3 text-[10px] leading-relaxed ${methodInfo.color} fade-in`}>
                  <p className="font-bold mb-0.5 underline">About {methodInfo.label}:</p>
                  <p>{methodInfo.description}</p>
                </div>
              )}

              {/* Option 2: Gmail App Password */}
              {formData.email_send_method === 'gmail' && (
                <div className="fade-in">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Gmail App Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password" required value={formData.company_gmail_password}
                    onChange={e => setFormData({ ...formData, company_gmail_password: e.target.value })}
                    className="w-full border border-slate-200 rounded p-2 text-sm font-mono"
                    placeholder="xxxx xxxx xxxx xxxx"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGmailGuide(g => !g)}
                    className="text-[10px] text-blue-600 underline mt-1 font-bold"
                  >
                    {showGmailGuide ? 'Hide' : 'How to get a Gmail App Password'}
                  </button>
                  {showGmailGuide && (
                    <ol className="text-[10px] text-slate-600 mt-2 space-y-1 pl-4 list-decimal bg-blue-50 border border-blue-100 rounded p-3">
                      <li>Go to <strong>myaccount.google.com</strong></li>
                      <li>Enable <strong>2-Step Verification</strong></li>
                      <li>Search for <strong>"App Passwords"</strong></li>
                      <li>Create one named <strong>"Inspection System"</strong></li>
                      <li>Copy the 16-character code and paste it above</li>
                    </ol>
                  )}
                </div>
              )}

              {/* Option 3: Custom Domain DNS Records */}
              {formData.email_send_method === 'custom_domain' && (
                <div className="fade-in">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Verified Sending Domain</label>
                  <input
                    type="text" required value={formData.custom_sending_domain}
                    onChange={e => setFormData({ ...formData, custom_sending_domain: e.target.value })}
                    className="w-full border border-slate-200 rounded p-2 text-sm font-mono"
                    placeholder="e.g. pestsolvers.com"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    Requires verifying ownership of this domain in the platform's Resend dashboard.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Initial Password</label>
          <input
            type="password" required value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
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
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              className="w-full border border-slate-200 rounded p-2 text-sm"
            >
              {roleOptions.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          {creatorRole !== 'super_admin' && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Primary Subcounty</label>
              <select
                value={formData.subcounty}
                onChange={e => setFormData({ ...formData, subcounty: e.target.value })}
                className="w-full border border-slate-200 rounded p-2 text-sm"
              >
                <option value="">{isZoneRequired ? '-- Select Subcounty --' : '-- No Specific Subcounty --'}</option>
                {zones.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          )}
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg transition mt-4 disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : (creatorRole === 'super_admin' ? 'Create Admin Account' : 'Create Staff Account')}
        </button>
      </form>
    </Modal>
  );
}
