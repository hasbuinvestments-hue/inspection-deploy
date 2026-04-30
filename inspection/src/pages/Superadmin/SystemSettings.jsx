import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import Badge from '../../components/common/Badge';

export default function SystemSettings() {
  const [config, setConfig] = useState({
    maintenanceMode: false,
    alertThresholdDays: 3,
    auditRetentionMonths: 6,
    autoApproveLowRisk: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const data = await apiFetch('/inspections/settings/global_config/');
      if (data && data.value) {
        setConfig(data.value);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      // If 404, it might not exist yet, which is fine
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await apiFetch('/inspections/settings/', {
        method: 'POST',
        body: JSON.stringify({
          key: 'global_config',
          value: config,
          label: 'Global System Configuration',
          description: 'Combined system-wide configuration object.'
        })
      });
      alert("Global system configuration synchronized successfully!");
    } catch (err) {
      // If POST fails because it exists, try PATCH
      if (err.message.includes('400') || err.message.includes('exists')) {
         try {
           await apiFetch('/inspections/settings/global_config/', {
             method: 'PATCH',
             body: JSON.stringify({ value: config })
           });
           alert("Global system configuration updated successfully!");
           return;
         } catch (patchErr) {
           alert("Failed to update settings: " + patchErr.message);
         }
      } else {
        alert("Failed to save settings: " + err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading system configuration...</div>;

  return (
    <div className="space-y-8 bg-white p-8 rounded-xl border border-slate-200">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Global System Configuration</h3>
        <p className="text-sm text-slate-500 mb-6">These settings affect all regional zones and officer review queues.</p>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div>
              <p className="font-bold text-slate-800">System Maintenance Mode</p>
              <p className="text-xs text-slate-500">Locks all PHO submissions and Finance verifications.</p>
            </div>
            <button 
              onClick={() => setConfig({...config, maintenanceMode: !config.maintenanceMode})}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${config.maintenanceMode ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600'}`}
            >
              {config.maintenanceMode ? 'ACTIVE' : 'INACTIVE'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-slate-100 rounded-lg">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Alert Threshold (Days)</label>
              <input 
                type="number" 
                value={config.alertThresholdDays}
                onChange={e => setConfig({...config, alertThresholdDays: parseInt(e.target.value) || 0})}
                className="w-full border border-slate-200 rounded p-2"
              />
              <p className="text-[10px] text-slate-400 mt-1 italic">Flags reports not reviewed within this period.</p>
            </div>
            <div className="p-4 border border-slate-100 rounded-lg">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Audit Retention (Months)</label>
              <select 
                value={config.auditRetentionMonths}
                onChange={e => setConfig({...config, auditRetentionMonths: parseInt(e.target.value)})}
                className="w-full border border-slate-200 rounded p-2"
              >
                <option value={1}>1 Month</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months</option>
                <option value={24}>24 Months</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <div>
              <p className="font-bold text-emerald-800">Fast-Track Low Risk Reviews</p>
              <p className="text-xs text-emerald-600">Auto-approve reports with 10/10 ratings and zero pest sightings.</p>
            </div>
            <input 
              type="checkbox" 
              checked={config.autoApproveLowRisk}
              onChange={e => setConfig({...config, autoApproveLowRisk: e.target.checked})}
              className="w-6 h-6 rounded border-emerald-300 text-emerald-600"
            />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 flex justify-end">
        <button 
          onClick={saveConfig}
          disabled={saving}
          className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition disabled:opacity-50"
        >
          {saving ? 'Synchronizing...' : 'Push Global Config'}
        </button>
      </div>
    </div>
  );
}
