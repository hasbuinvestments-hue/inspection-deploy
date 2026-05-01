import { useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { saveSubmission } from '../../../lib/offline-store';

export default function NewClientModal({ profile, isOpen, onClose, onSuccess, clientToEdit = null }) {
  const [formData, setFormData] = useState({
    business_name: clientToEdit?.business_name || '',
    permit_no: clientToEdit?.permit_no || '',
    county_name: clientToEdit?.county_name || 'Nairobi',
    subcounty_name: clientToEdit?.subcounty_name || profile?.subcounty || '',
    ward_name: clientToEdit?.ward_name || '',
    building_name: clientToEdit?.building_name || '',
    street_name: clientToEdit?.street_name || '',
    plot_no: clientToEdit?.plot_no || '',
    facility_type: clientToEdit?.facility_type || '',
    // General contact
    contact_phone: clientToEdit?.contact_phone || '',
    contact_email: clientToEdit?.contact_email || '',
    // Owner / management
    owner_name: clientToEdit?.owner_name || '',
    owner_email: clientToEdit?.owner_email || '',
    owner_phone: clientToEdit?.owner_phone || '',
    // On-site contact person
    contact_person_name: clientToEdit?.contact_person_name || '',
    contact_person_email: clientToEdit?.contact_person_email || '',
    contact_person_phone: clientToEdit?.contact_person_phone || '',
    location_lat: clientToEdit?.location_lat || null,
    location_lng: clientToEdit?.location_lng || null
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Capture GPS coordinates on mount (field registration)
  useState(() => {
    if (!clientToEdit && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData(prev => ({
            ...prev,
            location_lat: pos.coords.latitude,
            location_lng: pos.coords.longitude
          }));
        },
        () => {
          // Silent fail - user can still register without GPS
        }
      );
    }
  }, []);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const isEdit = !!clientToEdit;
      const url = isEdit
        ? `/inspections/businesses/${clientToEdit.id}/`
        : '/inspections/businesses/';
      const res = await apiFetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(formData)
      });
      alert(isEdit
        ? `"${formData.business_name}" updated successfully!`
        : `"${formData.business_name}" registered! You can now search for them to start an audit.`);
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      if (err.message === 'OFFLINE_ERROR') {
        try {
          await saveSubmission('registration', { ...formData, id_to_edit: clientToEdit?.id });
          alert('OFFLINE: No internet connection. Registration saved locally on your phone and will sync automatically when you are back online.');
          onClose();
          return;
        } catch (e) {
          setError('Offline storage failed. Please check your browser settings.');
        }
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, name, type = 'text', required = false, readOnly = false, placeholder = '' }) => (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500 uppercase ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
        {!required && !readOnly && <span className="text-slate-400 font-normal normal-case"> (optional)</span>}
      </label>
      <input
        type={type}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        required={required}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl border text-slate-800 outline-none transition-all text-sm ${
          readOnly
            ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
            : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-emerald-500'
        }`}
      />
    </div>
  );

  const SectionHeader = ({ title }) => (
    <div className="md:col-span-full">
      <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">{title}</h3>
      <div className="h-px bg-slate-100 w-full mb-4" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {clientToEdit ? 'Edit Client Profile' : 'Field Client Registration'}
            </h2>
            <p className="text-sm text-slate-500">
              {clientToEdit
                ? 'Update client details before finalizing an audit.'
                : 'Register a new client directly from the ground. UBP number is optional.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable form body + footer inside a single <form> */}
        <form id="new-client-form" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto p-8 space-y-8 flex-1">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {/* ── Business Information ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SectionHeader title="Business Information" />

              <Field label="Business Name" name="business_name" required placeholder="e.g. Nairobi Pest Solvers" />
              <Field label="Unified Business Permit (UBP) No." name="permit_no" placeholder="e.g. UBP-2024-XXXX" />
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1">
                  Facility Type <span className="text-slate-400 font-normal normal-case">(optional)</span>
                </label>
                <select
                  name="facility_type"
                  value={formData.facility_type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-800 text-sm"
                >
                  <option value="">Select Type...</option>
                  <option value="Hotel/Restaurant">Hotel / Restaurant</option>
                  <option value="Hospital">Hospital / Clinic</option>
                  <option value="Warehouse">Warehouse / Storage</option>
                  <option value="Residential">Residential</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Office">Office / Commercial</option>
                  <option value="School">School / Institution</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <Field label="Sub-County" name="subcounty_name" readOnly />
            </div>

            {/* ── Location ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <SectionHeader title="Location Details" />
              <Field label="Ward" name="ward_name" required placeholder="e.g. Kileleshwa" />
              <Field label="Street" name="street_name" placeholder="e.g. Ngong Road" />
              <Field label="Building / House No." name="building_name" placeholder="e.g. Riverside Square" />
              <Field label="Plot No." name="plot_no" placeholder="e.g. L.R. 209/4321" />
            </div>

            {/* ── General Contact ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SectionHeader title="General Business Contact" />
              <Field label="Phone" name="contact_phone" placeholder="e.g. 0700 000 000" />
              <Field label="Email" name="contact_email" type="email" placeholder="info@business.com" />
            </div>

            {/* ── Owner / Management ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SectionHeader title="Owner / Management" />
              <Field label="Full Name" name="owner_name" placeholder="John Kamau" />
              <Field label="Phone" name="owner_phone" required placeholder="e.g. 0722 000 000" />
              <Field label="Email (for Reports & Invoices)" name="owner_email" type="email" placeholder="owner@example.com" />
            </div>

            {/* ── On-site Contact Person ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <SectionHeader title="On-Site Contact Person" />
              <Field label="Full Name" name="contact_person_name" placeholder="Jane Wanjiku" />
              <Field label="Phone" name="contact_person_phone" placeholder="e.g. 0711 000 000" />
              <Field label="Email" name="contact_person_email" type="email" placeholder="contact@example.com" />
            </div>
          </div>

          {/* Footer — inside <form> so submit triggers validation */}
          <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 active:scale-95 text-sm"
            >
              {loading ? 'Saving...' : (clientToEdit ? 'Save Changes' : 'Register Client')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
