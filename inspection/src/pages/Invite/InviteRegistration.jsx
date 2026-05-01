import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';

const METHOD_INFO = {
  gmail: {
    label: 'Gmail SMTP',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    description: 'Reports will send directly from your Gmail. Requires an App Password.'
  },
  custom_domain: {
    label: 'Custom Domain',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    description: 'Reports will send from your domain. Requires DNS verification.'
  },
  fallback: {
    label: 'Default (Reply-To)',
    color: 'bg-slate-50 border-slate-200 text-slate-600',
    description: 'Reports send from the county. Replies go to your email.'
  }
};

export default function InviteRegistration() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [showGmailGuide, setShowGmailGuide] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    company_name: '',
    company_email: '',
    email_send_method: 'fallback',
    company_gmail_password: '',
    custom_sending_domain: ''
  });

  useEffect(() => {
    const checkInvite = async () => {
      try {
        // Public check (we'll use the retrieve action of the viewset if it's open, 
        // or just rely on the register attempt to fail later if invalid)
        // For now, let's just assume it's valid if the token exists
        setValidating(false);
      } catch (err) {
        setError("This invite link is invalid or has expired.");
        setValidating(false);
      }
    };
    checkInvite();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiFetch('/users/register-invite/', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          token
        })
      });
      alert("Registration successful! You can now log in.");
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const data = await apiFetch('/users/test-email-config/', {
        method: 'POST',
        body: JSON.stringify({
          email_send_method: formData.email_send_method,
          company_email: formData.company_email,
          company_name: formData.company_name,
          company_gmail_password: formData.company_gmail_password,
          custom_sending_domain: formData.custom_sending_domain
        })
      });
      setTestResult({ success: true, message: data.message });
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  if (validating) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">Validating Security Token...</div>;
  if (error && !invite) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-rose-600 font-bold">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-200">
        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Setup Your Admin Profile</h2>
          <p className="mt-2 text-sm text-slate-500">Complete your company registration to begin managing inspections.</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-lg">{error}</div>}
          
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Personal Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input
                  type="text" required value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Login Email</label>
                <input
                  type="email" required value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="admin@company.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Set Password</label>
              <input
                type="password" required value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Company Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Legal Company Name</label>
                <input
                  type="text" required value={formData.company_name}
                  onChange={e => setFormData({...formData, company_name: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g. Nairobi Pest Solvers"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Official Company Email</label>
                <input
                  type="email" required value={formData.company_email}
                  onChange={e => setFormData({...formData, company_email: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="ops@pestsolvers.com"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4 shadow-inner">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-3">Report Sending Method</label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(METHOD_INFO).map(([id, info]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFormData({ ...formData, email_send_method: id })}
                    className={`p-3 rounded-xl border text-xs font-black transition-all flex flex-col items-center gap-1 ${
                      formData.email_send_method === id 
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' 
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <span>{info.label.split(' (')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {formData.email_send_method && METHOD_INFO[formData.email_send_method] && (
              <div className="flex items-center justify-between gap-4">
                <div className={`flex-grow rounded-xl border p-4 text-[11px] leading-relaxed font-medium ${METHOD_INFO[formData.email_send_method].color} animate-fade-in`}>
                  <p className="font-bold mb-1 underline uppercase tracking-tighter">About {METHOD_INFO[formData.email_send_method].label}:</p>
                  <p>{METHOD_INFO[formData.email_send_method].description}</p>
                </div>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testLoading || !formData.company_email}
                  className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                    testResult?.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  } disabled:opacity-50`}
                >
                  {testLoading ? 'TESTING...' : testResult?.success ? '✓ VERIFIED' : 'TEST CONNECTION'}
                </button>
              </div>
            )}

            {testResult && !testResult.success && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-bold rounded-lg animate-shake">
                Connection Failed: {testResult.message}
              </div>
            )}

            {testResult && testResult.success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-bold rounded-lg">
                {testResult.message}
              </div>
            )}

            {formData.email_send_method === 'gmail' && (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Gmail App Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password" required value={formData.company_gmail_password}
                  onChange={e => setFormData({ ...formData, company_gmail_password: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="xxxx xxxx xxxx xxxx"
                />
                <button
                  type="button"
                  onClick={() => setShowGmailGuide(!showGmailGuide)}
                  className="text-[10px] text-blue-600 underline font-bold"
                >
                  {showGmailGuide ? 'Hide Setup Steps' : 'Help: How to get an App Password'}
                </button>
                {showGmailGuide && (
                  <div className="text-[10px] text-slate-600 mt-2 space-y-1 p-4 bg-white border border-blue-100 rounded-xl shadow-sm">
                    <p className="font-bold text-blue-800 mb-1">Google Security Steps:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Go to <b>myaccount.google.com</b></li>
                      <li>Enable <b>2-Step Verification</b></li>
                      <li>Search for <b>"App Passwords"</b></li>
                      <li>Create one named <b>"Inspection App"</b></li>
                      <li>Copy the 16-char code and paste it above</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            {formData.email_send_method === 'custom_domain' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Verified Sending Domain</label>
                <input
                  type="text" required value={formData.custom_sending_domain}
                  onChange={e => setFormData({ ...formData, custom_sending_domain: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="e.g. pestsolvers.com"
                />
                <p className="text-[10px] text-slate-400 mt-2 italic">
                  Note: You must own this domain and have access to its DNS settings.
                </p>
              </div>
            )}
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
          >
            {loading ? 'CREATING YOUR SYSTEM...' : 'FINISH REGISTRATION & LOG IN'}
          </button>
        </form>
      </div>
    </div>
  );
}
