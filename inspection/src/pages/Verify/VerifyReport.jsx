import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function VerifyReport() {
  const { code: codeFromUrl } = useParams();
  const [inputCode, setInputCode] = useState(codeFromUrl || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runVerify = async (rawCode) => {
    const normalized = (rawCode || '').trim().toUpperCase();
    if (!normalized) {
      setError('Enter a verification code first.');
      setResult(null);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await apiFetch(`/inspections/inspections/verify/${normalized}/`);
      
      if (!data || !data.id) {
        setResult({ is_valid: false });
        return;
      }

      setResult({ ...data, is_valid: true, report_id: data.id });
    } catch (verifyError) {
      if (verifyError.message.includes('404')) {
        setResult({ is_valid: false });
      } else {
        setError(verifyError.message || 'Failed to verify this report.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (codeFromUrl) {
      runVerify(codeFromUrl);
    }
  }, [codeFromUrl]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Report Verification Portal</h1>
          <p className="text-slate-400 mt-2">Check whether a downloaded inspection report is genuine.</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <label className="block text-sm font-semibold text-slate-300 mb-2">Verification Code</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(event) => setInputCode(event.target.value)}
              placeholder="Example: A1B2C3D4E5F6"
              className="flex-1 px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => runVerify(inputCode)}
              className="px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Verify'}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        </div>

        {result && result.is_valid === false && (
          <div className="bg-rose-950/40 border border-rose-700 rounded-xl p-5">
            <h2 className="text-lg font-bold text-rose-300">Invalid Report</h2>
            <p className="text-rose-200 mt-2">
              This code is not recognized as an approved, active inspection report.
            </p>
          </div>
        )}

        {result && result.is_valid && (
          <div className="bg-emerald-950/30 border border-emerald-700 rounded-xl p-5 space-y-3">
            <h2 className="text-lg font-bold text-emerald-300">Valid Report</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <p><span className="text-slate-400">Business:</span> {result.businesses?.business_name || result.business_name || '—'}</p>
              <p><span className="text-slate-400">Permit No:</span> {result.permit_no || result.businesses?.permit_no || '—'}</p>
              <p><span className="text-slate-400">Report ID:</span> {result.report_id}</p>
              <p><span className="text-slate-400">Inspector:</span> {result.inspector_name || '—'}</p>
              <p><span className="text-slate-400">Inspection Date:</span> {formatDate(result.inspection_date)}</p>
              <p><span className="text-slate-400">Issued:</span> {formatDate(result.issued_at)}</p>
              <p><span className="text-slate-400">Status:</span> {String(result.approval_status || '').toUpperCase()}</p>
              <p><span className="text-slate-400">Fingerprint:</span> <code className="text-[10px] bg-slate-800 px-1 rounded">{result.fingerprint || result.verification_fingerprint || '—'}</code></p>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 text-center">
          Match the business name, permit number, and inspection date against the document.
        </p>

        <div className="text-center">
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold">
            Back to System Login
          </Link>
        </div>
      </div>
    </div>
  );
}
