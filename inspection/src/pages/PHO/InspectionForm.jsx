import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { sendClientInvoice, sendClientReport } from '../../lib/emailService';
import { compressImage } from '../../lib/imageCompression';
import { logError } from '../../lib/logger';
import Badge from '../../components/common/Badge';

export default function InspectionForm({ profile, initialData, onComplete }) {
  const [feeSchedule, setFeeSchedule] = useState({});
  const [step, setStep] = useState(1);
  const [inspectionId, setInspectionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [formData, setFormData] = useState({
     client_id: null,
     inspector_name: profile?.full_name || '',
     inspection_date: new Date().toISOString().slice(0,16),
     personnel: [],
     next_inspection_date: '',
     service_type: '',
     areas_affected: [],
     pest_types: [], // Aligned with legacy 'pest_types' field
     chemicals_used: [],
     chemical_dosages: [], // Restore dosage array
     treatment_methods: [],
     issues_found: [],
     pest_sightings: { rodents: false, bedbugs: false, bedbug_count: null, other: false, other_description: '' },
     housekeeping_rating: 'Good',
     waste_management_rating: 'Good', 
     stacking_rating: 'Good', 
     overall_sanitation_rating: 'Good',
     recommendations: [],
     notes: '',
     media: [],
     photo_urls: [],
     photo_meta: [],
     fee_category: '',
     fee_premise: '',
     calculated_fee: 0,
     ipm_nccg: 0,
     ipm_vendor: 0,
     ipm_audit: 0,
     is_paid: false, 
     payment_method: 'Cash',
     amount_paid: '',
     payment_ref: '',
     payment_status: 'pending' 
  });

  const [feeSearch, setFeeSearch] = useState('');
  const [feeResults, setFeeResults] = useState([]);

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
      ...prev,
      client_id: initialData.business || initialData.business_id || null,
      _clientObj: initialData.businesses || null,
      inspector_name: initialData.inspector_name || prev.inspector_name,
      inspection_date: initialData.inspection_date
        ? initialData.inspection_date.slice(0, 16)
        : prev.inspection_date,
      next_inspection_date: initialData.next_inspection_date
        ? initialData.next_inspection_date.slice(0, 16)
        : '',
      service_type: initialData.service_type || '',
      personnel: initialData.personnel || [],
      areas_affected: initialData.areas_affected || [],
      pest_types: initialData.pest_types || [],
      chemicals_used: initialData.chemicals_used || [],
      chemical_dosages: initialData.chemical_dosages || [],
      treatment_methods: initialData.treatment_methods || [],
      issues_found: initialData.issues_found || [],
      pest_sightings: initialData.pest_sightings || prev.pest_sightings,
      housekeeping_rating: initialData.housekeeping_rating || '',
      waste_management_rating: initialData.waste_management_rating || 'Good',
      stacking_rating: initialData.stacking_rating || 'Good',
      overall_sanitation_rating: initialData.overall_sanitation_rating || 'Good',
      recommendations: initialData.recommendations || [],
      notes: initialData.notes || '',
      photo_urls: initialData.photo_urls || [],
      photo_meta: initialData.photo_meta || [],
      fee_category: initialData.fee_category || '',
      fee_premise: initialData.fee_premise || '',
      calculated_fee: initialData.calculated_fee || 0,
      ipm_audit: initialData.ipm_audit || 0,
      ipm_nccg: initialData.ipm_nccg || 0,
      ipm_vendor: initialData.ipm_vendor || 0,
      is_paid: initialData.is_paid || false,
      amount_paid: initialData.amount_paid || '',
      payment_ref: initialData.payment_ref || '',
      payment_method: initialData.payment_method || 'Cash',
    }));
    setInspectionId(initialData.id);
    setStep(2);
    }
  }, [initialData]);

  useEffect(() => {
    const fetchFees = async () => {
       try {
          const res = await apiFetch('/inspections/settings/finance_act_2023/');
          setFeeSchedule(res.value || {});
       } catch (error) {
          console.error("Failed to fetch fee schedule:", error);
       }
    };
    fetchFees();
  }, []);

  useEffect(() => {
    if (!formData.fee_category) {
      setFeeResults([]);
      return;
    }

    const categoryEntries = feeSchedule[formData.fee_category] || [];
    const term = feeSearch.trim().toLowerCase();
    const matches = term
      ? categoryEntries.filter(entry => entry.premise.toLowerCase().includes(term))
      : categoryEntries;
    setFeeResults(matches);
  }, [feeSearch, formData.fee_category, feeSchedule]);

  // 1. Client Search Layer
  useEffect(() => {
    if (search.length < 3) {
      setClients([]);
      setSearchError('');
      return;
    }
    const delay = setTimeout(async () => {
      try {
        setSearchError('');
        const res = await apiFetch(`/inspections/businesses/?search=${encodeURIComponent(search)}&limit=5&applied_by_me=true`);
        const data = res.results || res;
        setClients(Array.isArray(data) ? data : []);
      } catch (err) {
        setClients([]);
        setSearchError('Could not reach server. Please wait a moment and try again.');
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const selectClient = (client) => {
    setFormData(prev => ({ ...prev, client_id: client.id, _clientObj: client }));
    setSearch('');
    setClients([]);
    setStep(2);
  };

  // 2. Auto-schedule Calculation
  useEffect(() => {
    if (!formData.service_type || formData.service_type === 'One Time Treatment') {
      setFormData(prev => ({ ...prev, next_inspection_date: '' }));
      return;
    }

    const baseDate = new Date(formData.inspection_date);
    let monthsToAdd = 0;

    switch (formData.service_type) {
      case 'Monthly': monthsToAdd = 1; break;
      case 'Bi-Monthly': monthsToAdd = 2; break;
      case 'Quarterly': monthsToAdd = 3; break;
      case 'Half-Yearly': monthsToAdd = 6; break;
      case 'Annually': monthsToAdd = 12; break;
    }

    if (monthsToAdd > 0) {
      baseDate.setMonth(baseDate.getMonth() + monthsToAdd);
      setFormData(prev => ({ 
        ...prev, 
        next_inspection_date: baseDate.toISOString().slice(0, 16) 
      }));
    }
  }, [formData.service_type, formData.inspection_date]);

  const handleMultiselect = (field, value) => {
    setFormData(prev => {
      const arr = prev[field] || [];
      if (arr.includes(value)) return { ...prev, [field]: arr.filter(i => i !== value) };
      return { ...prev, [field]: [...arr, value] };
    });
  };

  const submitReport = async (actionPhase) => {
    if (!formData.client_id) {
      alert("Error: No business selected. Please go back to Step 1 and select a target business.");
      setStep(1);
      return;
    }
    const isDraft = actionPhase === 'draft';
    try {
      setLoading(true);
      
      // 1. Upload Photos first
      const photoUrls = [];
      const photoMeta = [];
      
      if (formData.media && formData.media.length > 0) {
        for (const m of formData.media) {
          const fileName = `${Date.now()}_${m.file.name}`;
          const uploadData = new FormData();
          uploadData.append('file', m.file);
          const publicData = await apiFetch('/inspections/upload/', {
             method: 'POST', body: uploadData 
          });

          photoUrls.push(publicData.publicUrl);
          photoMeta.push({ 
            url: publicData.publicUrl, 
            name: m.file.name, 
            caption: m.caption, 
            issue: m.issue 
          });
        }
      }

      // 2. Prepare Payload
      const payload = {
        business_id: formData.client_id,
        inspector_id: profile.id,
        inspector_name: formData.inspector_name,
        inspection_date: formData.inspection_date,
        next_inspection_date: formData.next_inspection_date || null,
        service_type: formData.service_type,
        personnel: formData.personnel,
        areas_affected: formData.areas_affected,
        pest_types: formData.pest_types,
        chemicals_used: formData.chemicals_used,
        chemical_dosages: formData.chemical_dosages,
        treatment_methods: formData.treatment_methods,
        issues_found: formData.issues_found,
        pest_sightings: formData.pest_sightings,
        housekeeping_rating: formData.housekeeping_rating,
        waste_management_rating: formData.waste_management_rating,
        stacking_rating: formData.stacking_rating,
        overall_sanitation_rating: formData.overall_sanitation_rating,
        recommendations: formData.recommendations,
        photo_urls: photoUrls,
        photo_meta: photoMeta,
        notes: formData.notes,
        status: 'completed',
        is_draft: isDraft,
        approval_status: 'pending',
        fee_category: formData.fee_category,
        fee_premise: formData.fee_premise,
        calculated_fee: formData.calculated_fee,
        is_paid: formData.is_paid,
        amount_paid: formData.amount_paid ? parseFloat(formData.amount_paid) : 0,
        payment_ref: formData.payment_ref,
        payment_method: formData.payment_method,
        payment_status: formData.is_paid ? 'audit_pending' : 'pending',
        ipm_audit: formData.ipm_audit || 0,
        ipm_nccg: formData.ipm_nccg || 0,
        ipm_vendor: formData.ipm_vendor || 0
      };

      if (inspectionId && photoUrls.length === 0 && Array.isArray(formData.photo_urls)) {
        payload.photo_urls = formData.photo_urls;
      }

      if (inspectionId && photoMeta.length === 0 && Array.isArray(formData.photo_meta)) {
        payload.photo_meta = formData.photo_meta;
      }

      const method = inspectionId ? 'PATCH' : 'POST';
      const endpoint = inspectionId ? `/inspections/inspections/${inspectionId}/` : '/inspections/inspections/';
      const resultObj = await apiFetch(endpoint, {
          method: method,
          body: JSON.stringify(payload)
      });
      const resultRows = [resultObj];
      
      const createdId = resultRows?.[0]?.id;

      if (actionPhase === 'step6') {
        const fullRecord = await apiFetch(`/inspections/inspections/${createdId}/`);
        if (fullRecord) {
          const reportResult = await sendClientReport(fullRecord);
          alert(`Report submitted and email summary sent to ${reportResult?.recipient || 'client'}!`);
        }
        
        // Move to step 7
        setInspectionId(createdId);
        setFormData(prev => ({
           ...prev,
           media: [],
           photo_urls: photoUrls.length > 0 ? photoUrls : prev.photo_urls,
           photo_meta: photoMeta.length > 0 ? photoMeta : prev.photo_meta
        }));
        setStep(7);
        return;
      }

      if (actionPhase === 'step7') {
        const fullRecord = await apiFetch(`/inspections/inspections/${createdId}/`);
        if (fullRecord) {
          let alertMsg = 'Finance details submitted to NCCG for approval!';
          if (formData.fee_category && formData.calculated_fee > 0) {
            const invResult = await sendClientInvoice(fullRecord);
            if (invResult.success) {
              alertMsg = `Success! Finance details submitted and Invoice email sent to ${invResult.recipient}!`;
            }
          }
          alert(alertMsg);
        }
      }

      if (actionPhase === 'draft') {
        alert('Draft saved successfully!');
      }
      
      if (onComplete) {
        onComplete();
      } else {
        setStep(1); 
        setInspectionId(null);
        setFormData(prev => ({
          ...prev,
          media: [],
          personnel: [],
          areas_affected: [],
          pest_types: [],
          chemicals_used: [],
          chemical_dosages: [],
          treatment_methods: [],
          issues_found: [],
          pest_sightings: { rodents: false, bedbugs: false, bedbug_count: null, other: false, other_description: '' },
          recommendations: [],
          photo_urls: [],
          photo_meta: [],
          status: '',
          approval_status: 'pending',
          is_draft: false,
          fee_category: '',
          fee_premise: '',
          calculated_fee: 0
        }));
      }
    } catch(e) { 
      console.error(e);
      logError(e, { source: 'InspectionForm.submitReport', metadata: { actionPhase, formData: { ...formData, media: [] } } });
      alert("Submission failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const submitDraft = () => submitReport('draft');
  const submitFinalStep6 = () => submitReport('step6');
  const submitFinalStep7 = () => submitReport('step7');

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl max-w-xl mx-auto mb-10 text-white">
       <h2 className="text-xl font-bold mb-4 text-emerald-400">Step {step} of 7</h2>
       {loading && (
         <div className="mb-4 p-3 bg-emerald-900/20 border border-emerald-500/50 rounded-lg text-xs uppercase tracking-wider font-bold text-emerald-300">
           Saving report...
         </div>
       )}

       {/* Step 1: Client Select */}
       {step === 1 && (
         <div className="space-y-4 fade-in">
           <h3 className="text-lg font-bold">1. Select Target Business</h3>
           <input
             type="text"
             value={search}
             onChange={e => setSearch(e.target.value)}
             className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-white focus:ring-2 focus:ring-emerald-500"
             placeholder="Search by Permit # or Business Name (min. 3 chars)..."
           />
           {searchError && (
             <p className="text-xs text-red-400 mt-1">{searchError}</p>
           )}
           {clients.length > 0 && (
             <div className="bg-slate-900 border border-slate-600 rounded-lg overflow-hidden">
               {clients.map(c => (
                 <div
                   key={c.id}
                   onClick={() => selectClient(c)}
                   className="p-4 border-b border-slate-700 hover:bg-slate-800 cursor-pointer"
                 >
                   <p className="font-bold">{c.business_name}</p>
                   <p className="text-sm text-slate-400">Permit: {c.permit_no} • {c.ward_name}</p>
                 </div>
               ))}
             </div>
           )}
           {search.length >= 3 && clients.length === 0 && !searchError && (
             <p className="text-xs text-slate-500 mt-1">No businesses found in your subcounty matching "{search}".</p>
           )}
         </div>
       )}

       {/* Step 2: Inspection Info & Core */}
       {step === 2 && (
         <div className="space-y-4 fade-in">
           <h3 className="text-lg font-bold">2. Service & Context</h3>
           <div className="bg-slate-900 p-4 rounded-lg">
             <p className="text-xs text-slate-400">Target Client</p>
             <p className="font-bold text-emerald-400">{formData._clientObj?.business_name}</p>
           </div>
           
           <label className="block text-sm font-bold text-slate-400">PHO Name</label>
           <input 
             type="text" 
             value={formData.inspector_name} 
             disabled
             className="w-full bg-slate-900/50 border border-slate-600 rounded p-3 text-slate-300"
           />

            <label className="block text-sm font-bold text-slate-400">Service Routine</label>
            <select 
              value={formData.service_type}
              onChange={e => setFormData({ ...formData, service_type: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white"
            >
              <option value="">-- Select Rule --</option>
              <option value="One Time Treatment">One Time Treatment</option>
              <option value="Monthly">Monthly</option>
              <option value="Bi-Monthly">Bi-Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Half-Yearly">Half-Yearly</option>
              <option value="Annually">Annually</option>
            </select>

            {formData.next_inspection_date && (
              <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-lg fade-in">
                <p className="text-[10px] font-bold text-emerald-400 uppercase">Auto-Scheduled Next Check Up</p>
                <div className="flex justify-between items-center mt-1">
                   <p className="text-lg font-bold text-white">
                      {new Date(formData.next_inspection_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                   </p>
                   <Badge type="emerald">SYSTEM CALC</Badge>
                </div>
              </div>
            )}

            <label className="block text-sm font-bold text-slate-400 mt-4">Personnel (Space separated)</label>
            <input 
              type="text" 
              placeholder="Type name and press Space..."
              onKeyDown={e => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  const val = e.target.value.trim();
                  if (val && !formData.personnel.includes(val)) {
                    setFormData({ ...formData, personnel: [...formData.personnel, val] });
                    e.target.value = '';
                  }
                }
              }}
              className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white placeholder:text-slate-600"
            />
           <div className="flex flex-wrap gap-2 mt-2">
             {formData.personnel.map(p => (
               <span key={p} className="bg-slate-700 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                 {p}
                 <button onClick={() => setFormData({...formData, personnel: formData.personnel.filter(i => i !== p)})}>&times;</button>
               </span>
             ))}
           </div>

           <div className="flex gap-4 pt-4">
             <button onClick={() => setStep(1)} className="flex-1 bg-slate-700/50 backdrop-blur-md border border-slate-600 p-4 rounded-xl font-bold hover:bg-slate-600 transition-all active:scale-95">Back</button>
             <button onClick={() => setStep(3)} className="flex-1 bg-white text-slate-900 p-4 rounded-xl font-black hover:bg-slate-100 transition-all active:scale-95">Next →</button>
           </div>
         </div>
       )}

       {/* Step 3: Areas & Pests */}
       {step === 3 && (
         <div className="space-y-4 fade-in">
           <h3 className="text-lg font-bold">3. Areas & Vectors</h3>
           
           <label className="block text-sm font-bold text-slate-400 mb-2">Affected Topologies (Select multiple)</label>
            <div className="grid grid-cols-2 gap-2">
              {['Interior', 'Exterior', 'Dispatch', 'Smoking Unit'].map(a => (
                <label key={a} className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-700 rounded cursor-pointer hover:bg-slate-800 transition">
                  <input type="checkbox" checked={formData.areas_affected.includes(a)} onChange={() => handleMultiselect('areas_affected', a)} />
                  <span className="text-sm">{a}</span>
                </label>
              ))}
            </div>
            <CustomTagInput label="Other Areas" selected={formData.areas_affected} onToggle={v => handleMultiselect('areas_affected', v)} />

           <label className="block text-sm font-bold text-slate-400 mb-2 mt-4">Pest Types Tracked</label>
            <div className="grid grid-cols-2 gap-2">
              {['Cockroaches', 'Mice', 'Rats', 'Spiders', 'Ants', 'Mosquitoes'].map(v => (
                <label key={v} className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-700 rounded cursor-pointer hover:bg-slate-800 transition">
                  <input type="checkbox" checked={formData.pest_types.includes(v)} onChange={() => handleMultiselect('pest_types', v)} />
                  <span className="text-sm">{v}</span>
                </label>
              ))}
            </div>
            <CustomTagInput label="Other Pests" selected={formData.pest_types} onToggle={v => handleMultiselect('pest_types', v)} />

           <div className="flex gap-4 pt-4">
             <button onClick={() => setStep(2)} className="flex-1 bg-slate-700/50 backdrop-blur-md border border-slate-600 p-4 rounded-xl font-bold hover:bg-slate-600 transition-all active:scale-95">Back</button>
             <button onClick={() => setStep(4)} className="flex-1 bg-white text-slate-900 p-4 rounded-xl font-black hover:bg-slate-100 transition-all active:scale-95">Next Step →</button>
           </div>
         </div>
       )}

       {/* Step 4: Methods & Chemicals */}
       {step === 4 && (
         <div className="space-y-4 fade-in">
           <h3 className="text-lg font-bold">4. Chemicals & Deployments</h3>
           <label className="block text-sm font-bold text-slate-400 mb-2">Primary Chem</label>
           <div className="grid grid-cols-1 gap-2">
             {['FLOWERDS 4% EC (Organic)', 'MOS-N-ROACH 100EC', 'Advion Roach Gel'].map(a => (
               <label key={a} className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-700 rounded cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={formData.chemicals_used.includes(a)} 
                   onChange={() => {
                     setFormData(prev => {
                       const used = prev.chemicals_used.includes(a) 
                         ? prev.chemicals_used.filter(i => i !== a)
                         : [...prev.chemicals_used, a];
                       
                       const dosages = prev.chemicals_used.includes(a)
                         ? prev.chemical_dosages.filter(d => d.chemical !== a)
                         : [...prev.chemical_dosages, { chemical: a, dosage: '' }];
                         
                       return { ...prev, chemicals_used: used, chemical_dosages: dosages };
                     });
                   }} 
                 />
                 <span className="text-sm">{a}</span>
               </label>
             ))}
           </div>

           <div className="mt-4 space-y-3">
              <label className="block text-sm font-bold text-slate-400">Chemical Dilutions / Dosages</label>
              {formData.chemical_dosages.map((d, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-900 p-2 rounded border border-slate-700">
                   <input 
                     type="text" 
                     value={d.chemical}
                     disabled
                     className="flex-1 bg-slate-800 border-none rounded p-2 text-xs text-slate-300"
                   />
                   <input 
                     type="text" 
                     placeholder="e.g. 50ml / 5L"
                     value={d.dosage}
                     onChange={e => {
                       const updated = [...formData.chemical_dosages];
                       updated[idx].dosage = e.target.value;
                       setFormData({ ...formData, chemical_dosages: updated });
                     }}
                     className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-xs"
                   />
                </div>
              ))}
              {formData.chemical_dosages.length === 0 && (
                <p className="text-xs text-slate-500 italic">Select a chemical above to specify dosage.</p>
              )}
           </div>

           <label className="block text-sm font-bold text-slate-400 mb-2 mt-4">Methodologies</label>
            <div className="grid grid-cols-2 gap-2">
              {['Baiting', 'Residual Spray', 'Fogging', 'Dusting'].map(v => (
                <label key={v} className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-700 rounded cursor-pointer hover:bg-slate-800 transition">
                  <input type="checkbox" checked={formData.treatment_methods.includes(v)} onChange={() => handleMultiselect('treatment_methods', v)} />
                  <span className="text-sm">{v}</span>
                </label>
              ))}
            </div>
            <CustomTagInput label="Other Methods" selected={formData.treatment_methods} onToggle={v => handleMultiselect('treatment_methods', v)} />

           <div className="flex gap-4 pt-4">
             <button onClick={() => setStep(3)} className="flex-1 bg-slate-700/50 backdrop-blur-md border border-slate-600 p-4 rounded-xl font-bold hover:bg-slate-600 transition-all active:scale-95">Back</button>
             <button onClick={() => setStep(5)} className="flex-1 bg-white text-slate-900 p-4 rounded-xl font-black hover:bg-slate-100 transition-all active:scale-95">Next Phase →</button>
           </div>
         </div>
       )}

       {/* Step 5: Ratings & Analytics */}
       {step === 5 && (
         <div className="space-y-4 fade-in">
           <h3 className="text-lg font-bold">5. Facility Analytics</h3>

           <label className="block text-sm font-bold text-slate-400 mb-2 mt-4">Issues Found Tracker</label>
            <div className="grid grid-cols-2 gap-2">
              {['Live Pests', 'Droppings / Feces', 'Damage / Gnawing', 'Nesting Materials', 'Poor Hygiene', 'Structural Cracks'].map(v => (
                <label key={v} className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-700 rounded cursor-pointer hover:bg-slate-800 transition">
                  <input type="checkbox" checked={formData.issues_found.includes(v)} onChange={() => handleMultiselect('issues_found', v)} />
                  <span className="text-sm">{v}</span>
                </label>
              ))}
            </div>
            <CustomTagInput label="Other Issues" selected={formData.issues_found} onToggle={v => handleMultiselect('issues_found', v)} />

           {['housekeeping_rating', 'waste_management_rating', 'stacking_rating', 'overall_sanitation_rating'].map(rat => (
             <div key={rat}>
               <label className="block text-sm font-bold text-slate-400 mb-2 mt-4 capitalize">{rat.replace('_rating', '').replace('_', ' ')}</label>
               <div className="grid grid-cols-3 gap-2">
                 {['Good', 'Fair', 'Poor'].map(v => (
                   <label key={v} className={`flex items-center justify-center p-3 border rounded cursor-pointer transition ${formData[rat] === v ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-700'}`}>
                     <input type="radio" className="hidden" name={rat} value={v} checked={formData[rat] === v} onChange={() => setFormData({...formData, [rat]: v})} />
                     <span className="text-sm font-bold">{v}</span>
                   </label>
                 ))}
               </div>
             </div>
           ))}

           <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
              <h4 className="text-sm font-bold text-slate-400 mb-3">Pest Sighting Log</h4>
               <div className="space-y-3">
                 {['rodents', 'bedbugs', 'other'].map(s => (
                   <div key={s} className="space-y-2">
                     <label className="flex items-center gap-3 cursor-pointer">
                       <input 
                         type="checkbox" 
                         checked={formData.pest_sightings[s]} 
                         onChange={e => setFormData({
                           ...formData, 
                           pest_sightings: { ...formData.pest_sightings, [s]: e.target.checked }
                         })} 
                       />
                       <span className="capitalize">{s}</span>
                     </label>
                     
                     {s === 'bedbugs' && formData.pest_sightings.bedbugs && (
                       <input 
                         type="number" 
                         placeholder="Est. Count (e.g. 5)"
                         value={formData.pest_sightings.bedbug_count || ''}
                         onChange={e => setFormData({
                           ...formData,
                           pest_sightings: { ...formData.pest_sightings, bedbug_count: e.target.value }
                         })}
                         className="ml-7 w-32 bg-slate-800 border border-slate-700 rounded p-1 text-xs"
                       />
                     )}

                     {s === 'other' && formData.pest_sightings.other && (
                       <input 
                         type="text" 
                         placeholder="Describe pests..."
                         value={formData.pest_sightings.other_description || ''}
                         onChange={e => setFormData({
                           ...formData,
                           pest_sightings: { ...formData.pest_sightings, other_description: e.target.value }
                         })}
                         className="ml-7 w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs"
                       />
                     )}
                   </div>
                 ))}
               </div>
           </div>

           <div className="flex gap-4 pt-4">
             <button onClick={() => setStep(4)} className="flex-1 bg-slate-700/50 backdrop-blur-md border border-slate-600 p-4 rounded-xl font-bold hover:bg-slate-600 transition-all active:scale-95">Back</button>
             <button onClick={() => setStep(6)} className="flex-1 bg-white text-slate-900 p-4 rounded-xl font-black hover:bg-slate-100 transition-all active:scale-95">Review & Finish →</button>
           </div>
         </div>
       )}

       {/* Step 6: Finishes */}
       {step === 6 && (
         <div className="space-y-4 fade-in">
           <h3 className="text-lg font-bold">6. Finish Report & Media</h3>

           <label className="block text-sm font-bold text-slate-400">Additional Field Notes</label>
           <textarea 
             value={formData.notes}
             onChange={e => setFormData({ ...formData, notes: e.target.value })}
             rows="3"
             className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white"
             placeholder="Include context..."
           ></textarea>

            <label className="block text-sm font-bold text-slate-400 mt-4">Upload Site Media Profiles (Images strictly)</label>
            {isCompressing && (
              <div className="flex items-center gap-2 mb-2 text-emerald-400 animate-pulse">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold uppercase tracking-wider">Optimizing evidence files...</span>
              </div>
            )}
            <input 
              type="file" 
              multiple
              accept="image/*"
              disabled={isCompressing}
              onChange={async e => {
                try {
                  setIsCompressing(true);
                  const files = Array.from(e.target.files);
                  const processed = [];
                  for (const f of files) {
                    const compressed = await compressImage(f);
                    processed.push({ file: compressed, caption: '', issue: '' });
                  }
                  setFormData(prev => ({ ...prev, media: [...prev.media, ...processed] }));
                } catch (err) {
                  console.error("Compression error:", err);
                  const fallback = Array.from(e.target.files).map(f => ({ file: f, caption: '', issue: '' }));
                  setFormData(prev => ({ ...prev, media: [...prev.media, ...fallback] }));
                } finally {
                  setIsCompressing(false);
                }
              }}
              className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-slate-300 font-mono text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-emerald-500 file:text-white disabled:opacity-50"
            />
            
            {formData.media.length > 0 && (
              <div className="space-y-3 mt-4">
                {formData.media.map((m, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-700 p-3 rounded-lg flex gap-3 items-start">
                    <img src={URL.createObjectURL(m.file)} className="w-16 h-16 object-cover rounded" alt="Preview"/>
                    <div className="flex-1 space-y-2">
                       <input 
                         type="text" 
                         placeholder="Add caption..."
                         value={m.caption}
                         onChange={e => {
                           const updated = [...formData.media];
                           updated[idx].caption = e.target.value;
                           setFormData({ ...formData, media: updated });
                         }}
                         className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs"
                       />
                       <select 
                         value={m.issue}
                         onChange={e => {
                           const updated = [...formData.media];
                           updated[idx].issue = e.target.value;
                           setFormData({ ...formData, media: updated });
                         }}
                         className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs"
                       >
                         <option value="">-- Link to issue --</option>
                         {formData.issues_found.map(i => <option key={i} value={i}>{i}</option>)}
                       </select>
                    </div>
                    <button onClick={() => setFormData({...formData, media: formData.media.filter((_, i) => i !== idx)})} className="text-rose-400">✕</button>
                  </div>
                ))}
              </div>
            )}

           <div className="flex gap-4 pt-6">
             <button onClick={() => setStep(5)} className="flex-1 bg-slate-700/50 p-4 rounded-xl font-bold hover:bg-slate-600 transition-all">Back</button>
             <button
               onClick={submitDraft}
               disabled={loading || isCompressing}
               className="flex-[1.5] bg-slate-200 text-slate-800 p-4 rounded-xl font-bold hover:bg-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs"
             >
               {loading ? 'Saving...' : 'Save As Draft'}
             </button>
             <button
               onClick={submitFinalStep6}
               disabled={loading || isCompressing}
               className="flex-[1.5] bg-white text-slate-900 p-4 rounded-xl font-black hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs"
             >
               {loading ? 'Submitting...' : 'Complete Report'}
             </button>
           </div>
         </div>
       )}

       {/* Step 7: Finance */}
       {step === 7 && (
         <div className="space-y-4 fade-in">
           <h3 className="text-lg font-bold">7. Finance & NCCG Approval</h3>

           <label className="block text-sm font-bold text-slate-400">Statutory Premise Category</label>
           <select 
             value={formData.fee_category}
             onChange={e => {
               setFormData({ ...formData, fee_category: e.target.value, fee_premise: '', calculated_fee: 0 });
             }}
             className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white truncate"
           >
             <option value="">-- Select Category --</option>
             {Object.keys(feeSchedule || {}).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
             ))}
           </select>

           {formData.fee_category && (
             <React.Fragment>
               <label className="block text-sm font-bold text-slate-400 mt-4">Premise Type & Classification</label>
               <select 
                 value={formData.fee_premise}
                 onChange={e => {
                    const f = (feeSchedule[formData.fee_category] || []).find(f => f.premise === e.target.value);
                    const auditFee = f?.fees?.ipmAudit || 0;
                    setFormData({ 
                      ...formData, 
                      fee_premise: e.target.value, 
                      calculated_fee: f?.fees?.total || 0,
                      ipm_audit: auditFee,
                      ipm_nccg: auditFee * 0.25,
                      ipm_vendor: auditFee * 0.75
                    });
                  }}
                 className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white truncate"
               >
                 <option value="">-- Select Premise Classification --</option>
                 {(feeSchedule[formData.fee_category] || []).map(p => (
                    <option key={p.premise} value={p.premise}>{p.premise}</option>
                 ))}
               </select>

               {formData.fee_premise && formData.ipm_audit > 0 && (
                 <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 p-5 rounded-2xl mt-4 shadow-inner">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Audit Fee</p>
                    <p className="text-4xl font-black text-white">KES {Number(formData.ipm_audit || 0).toLocaleString()}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-emerald-500/20">
                       <div>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Govt Share (25%)</p>
                         <p className="text-lg font-bold text-emerald-400/80">KES {Number(formData.ipm_nccg || 0).toLocaleString()}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Vendor Share (75%)</p>
                         <p className="text-lg font-bold text-blue-400/80">KES {Number(formData.ipm_vendor || 0).toLocaleString()}</p>
                       </div>
                    </div>
                 </div>
               )}
             </React.Fragment>
           )}

           <div className="pt-4 border-t border-slate-700 mt-6">
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                 <input 
                   type="checkbox" 
                   checked={formData.is_paid} 
                   onChange={e => setFormData({ ...formData, is_paid: e.target.checked })} 
                   className="w-5 h-5 text-emerald-600 rounded"
                 />
                 <div className="flex-1">
                   <p className="font-bold text-sm">Payment Received on Ground?</p>
                   <p className="text-[10px] text-slate-500 uppercase">Confirming payment now notifies Finance for Audit</p>
                 </div>
              </label>

              {formData.is_paid && (
                <div className="mt-4 space-y-4 bg-slate-900 p-4 rounded-lg border border-slate-700 fade-in">
                   <div className="grid grid-cols-3 gap-2">
                      {['Cash', 'Mpesa', 'Cheque'].map(m => (
                        <button 
                          key={m}
                          type="button"
                          onClick={() => setFormData({ ...formData, payment_method: m })}
                          className={`p-3 rounded font-bold text-xs ${formData.payment_method === m ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                        >
                          {m}
                        </button>
                      ))}
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount (KES)</label>
                         <input 
                           type="number" 
                           value={formData.amount_paid}
                           onChange={e => setFormData({ ...formData, amount_paid: e.target.value })}
                           className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
                           placeholder="Amount..."
                         />
                      </div>
                      <div>
                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            {formData.payment_method === 'Mpesa' ? 'Mpesa Code' : (formData.payment_method === 'Cheque' ? 'Cheque #' : 'Reference (Optional)')}
                         </label>
                         <input 
                           type="text" 
                           value={formData.payment_ref}
                           onChange={e => setFormData({ ...formData, payment_ref: e.target.value })}
                           className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm font-mono"
                           placeholder="Ref..."
                         />
                      </div>
                   </div>
                </div>
              )}
           </div>

           <div className="flex gap-4 pt-6">
             <button
               onClick={submitFinalStep7}
               disabled={loading}
               className="w-full bg-emerald-600 text-white shadow p-3 rounded font-bold hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {loading ? 'Submitting...' : 'Complete Finance & Submit to NCCG'}
             </button>
           </div>
         </div>
       )}
    </div>
  );
}
function CustomTagInput({ label, selected, onToggle }) {
  const [custom, setCustom] = useState('');
  return (
    <div className="mt-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
      <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">{label}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {selected.filter(s => !['Interior', 'Exterior', 'Dispatch', 'Smoking Unit', 'Cockroaches', 'Mice', 'Rats', 'Spiders', 'Ants', 'Mosquitoes', 'Baiting', 'Residual Spray', 'Fogging', 'Dusting', 'Good', 'Fair', 'Poor', 'Live Pests', 'Droppings / Feces', 'Damage / Gnawing', 'Nesting Materials', 'Poor Hygiene', 'Structural Cracks'].includes(s)).map(t => (
          <Badge key={t} type="emerald" className="pl-2">
            {t} <button onClick={() => onToggle(t)} className="ml-1 hover:text-white">×</button>
          </Badge>
        ))}
      </div>
      <input 
        type="text"
        value={custom}
        onChange={e => setCustom(e.target.value)}
        onKeyDown={e => {
           if (e.key === 'Enter') {
             e.preventDefault();
             if (custom.trim()) { onToggle(custom.trim()); setCustom(''); }
           }
        }}
        placeholder="Type custom entry and press Enter..."
        className="w-full bg-transparent border-b border-slate-700 text-xs py-1 outline-none focus:border-emerald-500 transition-colors"
      />
    </div>
  );
}
