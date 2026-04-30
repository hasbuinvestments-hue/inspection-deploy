import React from 'react';
import Modal from './Modal';
import Badge from './Badge';
import { getBusinessEmail, getBusinessPhone, getBusinessContactName } from '../../lib/reportContacts';

export default function ReportViewerModal({ 
  inspection, 
  onClose, 
  actions = null // { onApprove, onReject, loading }
}) {
  if (!inspection) return null;

  const b = inspection.businesses || {};
  const isPending = inspection.approval_status === 'pending' && !inspection.is_draft;
  const targetPests = inspection.pest_types || inspection.types_of_pests || [];
  const treatedAreas = inspection.areas_affected || inspection.areas_treated || [];
  const controlMethods = inspection.treatment_methods || inspection.methods_of_control || [];
  const observedIssues = inspection.issues_found || inspection.issues_observed || [];
  const verificationCode = inspection.id || inspection.verification_code || '';
  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify/${encodeURIComponent(verificationCode)}`
    : `/verify/${encodeURIComponent(verificationCode)}`;

  return (
    <Modal isOpen={!!inspection} onClose={onClose} title={`Inspection Report: ${b.business_name || 'Generic'}`}>
      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
        
        {/* Header Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="col-span-2">
            <p className="text-[10px] font-bold text-slate-600 uppercase">Business & License</p>
            <p className="font-bold text-slate-800">{b.business_name || 'Business Link Missing'}</p>
            <p className="text-xs text-slate-700">{b.permit_no || 'No Permit'} • {b.ward_name || 'No Ward'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-600 uppercase">Wait Time</p>
            <p className="text-sm font-semibold text-emerald-600">
               {(() => {
                 const days = Math.floor((new Date() - new Date(inspection.created_at || inspection.inspection_date)) / (1000 * 60 * 60 * 24));
                 return days === 0 ? 'Today' : `${days} day${days > 1 ? 's' : ''} ago`;
               })()}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-600 uppercase">Status</p>
            <Badge type={inspection.approval_status === 'approved' ? 'green' : (inspection.approval_status === 'declined' ? 'red' : 'amber')}>
              {inspection.is_draft ? 'Draft' : inspection.approval_status}
            </Badge>
          </div>
        </div>

        {/* Technical Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <section>
                <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 border-b border-emerald-100 pb-1">Site & Personnel</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-slate-600 font-medium">Building/Street:</span> {b.building_name || '—'} {b.street_name || ''}</p>
                  <p><span className="text-slate-600 font-medium">Lead PHO:</span> {inspection.inspector_name}</p>
                  <p><span className="text-slate-600 font-medium">Assisting:</span> {inspection.personnel?.join(', ') || 'None'}</p>
                  <p><span className="text-slate-600 font-medium">Service:</span> {inspection.service_type}</p>
                </div>
              </section>

              <section>
                <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 border-b border-emerald-100 pb-1">Business Contacts</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-slate-600 font-medium">Contact Person:</span> {getBusinessContactName(b)}</p>
                  <p><span className="text-slate-600 font-medium">Phone:</span> {getBusinessPhone(b)}</p>
                  <p><span className="text-slate-600 font-medium">Email:</span> {getBusinessEmail(b)}</p>
                </div>
              </section>
            </div>

           <div className="space-y-4">
              <section>
                <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 border-b border-emerald-100 pb-1">Sanitation Assessment</h4>
                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold">
                   <div className="bg-slate-100 p-2 rounded">
                      <p className="text-slate-600">HOUSEKEEPING</p>
                      <p className="text-sm text-slate-900">{inspection.housekeeping_rating || '—'}</p>
                   </div>
                   <div className="bg-slate-100 p-2 rounded">
                      <p className="text-slate-600">WASTE MGMT</p>
                      <p className="text-sm text-slate-900">{inspection.waste_management_rating || '—'}</p>
                   </div>
                   <div className="bg-slate-100 p-2 rounded">
                      <p className="text-slate-600">STACKING</p>
                      <p className="text-sm text-slate-900">{inspection.stacking_rating || '—'}</p>
                   </div>
                   <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                      <p className="text-emerald-700">OVERALL</p>
                      <p className="text-sm text-emerald-800 font-bold">{inspection.overall_sanitation_rating || '—'}</p>
                   </div>
                </div>
              </section>

              <section>
                <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 border-b border-emerald-100 pb-1">Payment & Fees</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-slate-600">Assessed Fee:</span> KES {Number(inspection.calculated_fee || 0).toLocaleString()}</p>
                  <p><span className="text-slate-600">Received:</span> KES {Number(inspection.amount_paid || 0).toLocaleString()}</p>
                  <p><span className="text-slate-600">Method:</span> {inspection.payment_method || '—'}</p>
                  <p><span className="text-slate-600">Ref:</span> <span className="font-mono text-xs text-slate-900">{inspection.payment_ref || '—'}</span></p>
                </div>
              </section>
           </div>
        </div>

        {/* Vectors & Infestations */}
        <section>
          <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 border-b border-emerald-100 pb-1">Vector Sighting Log</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl border ${inspection.pest_sightings?.rodents ? 'bg-rose-50 border-rose-200' : 'bg-slate-100 border-slate-200'}`}>
              <p className="text-[10px] font-bold text-slate-600 uppercase">Rodents</p>
              <p className="text-sm font-bold text-slate-900">{inspection.pest_sightings?.rodents ? '✓ DETECTED' : 'NONE'}</p>
            </div>
            <div className={`p-4 rounded-xl border ${inspection.pest_sightings?.bedbugs ? 'bg-rose-50 border-rose-200' : 'bg-slate-100 border-slate-200'}`}>
              <p className="text-[10px] font-bold text-slate-600 uppercase">Bedbugs</p>
              <div className="flex justify-between items-end">
                <p className="text-sm font-bold text-slate-900">{inspection.pest_sightings?.bedbugs ? '✓ DETECTED' : 'NONE'}</p>
                {inspection.pest_sightings?.bedbug_count && (
                  <span className="text-xs font-mono text-rose-600 font-bold bg-white px-1.5 rounded">{inspection.pest_sightings.bedbug_count} units</span>
                )}
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${inspection.pest_sightings?.other ? 'bg-amber-50 border-amber-200' : 'bg-slate-100 border-slate-200'}`}>
              <p className="text-[10px] font-bold text-slate-600 uppercase">Other Vectors</p>
              <p className="text-sm font-bold text-slate-900">{inspection.pest_sightings?.other ? (inspection.pest_sightings.other_description || 'DETECTED') : 'NONE'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
               <p className="text-[10px] font-bold text-slate-600 uppercase">Target Pests</p>
               <div className="flex flex-wrap gap-1 mt-1">
                  {targetPests.map(p => (
                    <span key={p} className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">{p}</span>
                  ))}
                  {targetPests.length === 0 && <span className="text-[10px] text-slate-500">None recorded</span>}
               </div>
            </div>
          </div>
        </section>

        {/* Areas & Logic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <section>
              <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 border-b border-emerald-100 pb-1">Treatment Zones</h4>
              <div className="flex flex-wrap gap-1">
                {treatedAreas.map(a => (
                  <span key={a} className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">{a}</span>
                ))}
                {treatedAreas.length === 0 && <span className="text-[10px] text-slate-500">None recorded</span>}
              </div>
           </section>
           <section>
              <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 border-b border-emerald-100 pb-1">Methodology</h4>
              <div className="flex flex-wrap gap-1">
                {controlMethods.map(m => (
                  <span key={m} className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100">{m}</span>
                ))}
                {controlMethods.length === 0 && <span className="text-[10px] text-slate-500">None recorded</span>}
              </div>
           </section>
        </div>

        {/* Chemical Matrix */}
        <section>
          <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 border-b border-emerald-100 pb-1">Chemical Deployment Matrix</h4>
          <div className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2">Chemical Name</th>
                  <th className="px-3 py-2 text-right">Dosage / Dilution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {inspection.chemical_dosages?.length > 0 ? (
                  inspection.chemical_dosages.map((d, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium">{d.chemical}</td>
                      <td className="px-3 py-2 text-right text-slate-600 italic font-mono">{d.dosage}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="px-3 py-4 text-center text-slate-600 italic">No specific dosages recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Evidence Portfolio */}
        <section>
          <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 border-b border-emerald-100 pb-1">Evidence Portfolio</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {inspection.photo_meta?.map((p, idx) => (
              <div key={idx} className="group relative bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                 <img src={p.url} className="w-full h-24 object-cover" alt="Evidence" />
                 {p.caption && <p className="p-1 px-2 text-[10px] bg-white/90 italic truncate">{p.caption}</p>}
                 {p.issue && (
                   <div className="absolute top-1 left-1">
                      <Badge type="red" size="sm" className="opacity-90">{p.issue}</Badge>
                   </div>
                 )}
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button onClick={() => window.open(p.url, '_blank')} className="text-white text-[10px] font-bold underline">Expand View</button>
                 </div>
              </div>
            ))}
            {!inspection.photo_meta?.length && <p className="text-xs text-slate-500 italic">No photos attached.</p>}
          </div>
        </section>

        {/* Findings & Recommendations */}
        <section>
           <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 border-b border-emerald-100 pb-1">Findings & Recommendations</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-3">
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Observed Issues</p>
                <div className="flex flex-wrap gap-1">
                   {observedIssues.map(i => <span key={i} className="text-[10px] bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-200 font-bold">! {i}</span>)}
                   {observedIssues.length === 0 && <span className="text-[10px] text-slate-500 font-medium italic">None recorded</span>}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Official Advice</p>
                <div className="flex flex-wrap gap-1">
                  {inspection.recommendations?.map(r => <span key={r} className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-bold">✓ {r}</span>)}
                  {(!inspection.recommendations || inspection.recommendations.length === 0) && <span className="text-[10px] text-slate-500 font-medium italic">None recorded</span>}
                </div>
              </div>
           </div>
           <p className="text-xs text-slate-700 font-medium italic bg-slate-100 p-3 rounded border border-slate-200">
             {inspection.notes || 'No additional field notes provided.'}
           </p>
        </section>

        {/* Action Controls (Injectable) */}
        {actions && (
          <div className="pt-6 border-t border-slate-200 mt-6 space-y-4">
             <textarea 
               value={actions.notes}
               onChange={e => actions.setNotes(e.target.value)}
               className="w-full border border-slate-300 rounded-lg p-3 text-sm"
               placeholder="Official review notes..."
               rows="3"
             ></textarea>
             <div className="flex gap-4">
                <button 
                  onClick={actions.onReject} 
                  disabled={actions.loading}
                  className="flex-1 bg-white border border-rose-500 text-rose-600 font-bold py-3 rounded-lg hover:bg-rose-50 disabled:opacity-50"
                >
                  Decline to PHO
                </button>
                <button 
                  onClick={actions.onApprove} 
                  disabled={actions.loading}
                  className="flex-[2] bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition shadow-lg"
                >
                  Approve Report
                </button>
             </div>
          </div>
        )}

        {/* Finance Review Feedback */}
        {inspection.payment_status === 'flagged' && inspection.finance_verification_notes && (
          <div className="p-4 bg-rose-50 rounded-lg border border-rose-200 mt-4 shadow-sm">
             <div className="flex items-center gap-2 mb-2">
               <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
               <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Finance Feedback (Payment Issue)</p>
             </div>
             <p className="text-sm text-rose-800 font-medium italic italic">"{inspection.finance_verification_notes}"</p>
             <p className="text-[10px] text-rose-500 mt-2 font-bold uppercase">Action Required: Please verify payment reference and resubmit if necessary.</p>
          </div>
        )}

        {/* NCCG Archive History Notes (If declined previously) */}
        {inspection.nccg_notes && !isPending && (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mt-4">
             <p className="text-[10px] font-bold text-amber-600 uppercase">Reviewer Feedback</p>
             <p className="text-sm text-amber-800 italic">{inspection.nccg_notes}</p>
          </div>
        )}

        {/* Verification Footer (Publicly Verifiable) */}
        {inspection.approval_status === 'approved' && inspection.verification_code && (
           <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row gap-6 items-center bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center min-w-24">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Verify</p>
                <p className="text-[9px] text-slate-400 mt-1">No third-party QR</p>
              </div>
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Badge type="green">AUTHENTIC ORIGINAL</Badge>
                  <span className="text-[10px] font-mono text-slate-600">ID: {inspection.verification_code}</span>
                </div>
                <h5 className="text-sm font-bold text-slate-800">Document Integrity Protected</h5>
                <p className="text-xs text-slate-700 leading-relaxed">
                  This report is cryptographically linked to the official NCCG registry. 
                  Use the verification URL below to validate this record.
                </p>
                <p className="text-[10px] font-mono text-slate-700 break-all bg-white px-2 py-1 rounded border border-slate-100">
                  {verificationUrl}
                </p>
                {inspection.verification_fingerprint && (
                  <p className="text-[9px] font-mono text-slate-600 break-all bg-white px-2 py-1 rounded border border-slate-100">
                    FINGERPRINT: {inspection.verification_fingerprint}
                  </p>
                )}
              </div>
           </div>
        )}

      </div>
    </Modal>
  );
}
