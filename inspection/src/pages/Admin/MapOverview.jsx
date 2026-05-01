import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import Badge from '../../components/common/Badge';

export default function MapOverview() {
  const [view, setView] = useState('map'); // 'map' or 'list'
  const { data: reports, loading } = usePaginatedData({
    table: 'inspections/inspections',
    filters: { is_draft: false },
    itemsPerPage: 500,
    authQuery: true
  });

  if (loading) return <div className="p-8 text-center text-slate-500">Loading risk data...</div>;

  const validMarkers = (reports || []).filter(r => r.gps_coordinates?.lat && r.gps_coordinates?.lng);

  const getRiskInfo = (date) => {
    const monthsAgo = (new Date() - new Date(date)) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo > 6) return { color: '#ef4444', label: 'High Risk', badge: 'red' };
    if (monthsAgo > 3) return { color: '#f59e0b', label: 'Medium Risk', badge: 'amber' };
    return { color: '#10b981', label: 'Low Risk', badge: 'emerald' };
  };

  return (
    <div className="h-full w-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header with Switch */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
           Field Risk Intelligence
        </h3>
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button 
            onClick={() => setView('map')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${view === 'map' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Map View
          </button>
          <button 
            onClick={() => setView('list')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${view === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Risk List
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {view === 'map' ? (
          <MapContainer center={[-1.2921, 36.8219]} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {validMarkers.map(r => {
              const risk = getRiskInfo(r.inspection_date);
              return (
                <CircleMarker 
                  key={r.id} 
                  center={[r.gps_coordinates.lat, r.gps_coordinates.lng]}
                  radius={8}
                  pathOptions={{ 
                    color: risk.color,
                    fillColor: risk.color,
                    fillOpacity: 0.7 
                  }}
                >
                  <Popup>
                    <div className="p-1 min-w-[150px]">
                      <p className="font-bold text-slate-800 text-sm mb-1">{r.businesses?.business_name}</p>
                      <div className="flex flex-col gap-1 text-[10px] text-slate-500">
                        <span className="flex justify-between"><span>Last Audit:</span> <b className="text-slate-700">{new Date(r.inspection_date).toLocaleDateString()}</b></span>
                        <span className="flex justify-between"><span>Risk:</span> <b style={{ color: risk.color }}>{risk.label}</b></span>
                        <span className="flex justify-between"><span>Inspector:</span> <b>{r.inspector_name}</b></span>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        ) : (
          <div className="h-full overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Business Name</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Risk Level</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Last Audit</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Inspector</th>
                </tr>
              </thead>
              <tbody>
                {(reports || []).map(r => {
                  const risk = getRiskInfo(r.inspection_date);
                  return (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{r.businesses?.business_name}</div>
                        <div className="text-[10px] text-slate-500">{r.businesses?.permit_no || 'No Permit'}</div>
                      </td>
                      <td className="p-4">
                        <Badge type={risk.badge}>{risk.label}</Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {new Date(r.inspection_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {r.inspector_name}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
