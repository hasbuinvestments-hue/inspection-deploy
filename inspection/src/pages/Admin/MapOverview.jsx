import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { usePaginatedData } from '../../hooks/usePaginatedData';

// Fix for default marker icons in React-Leaflet
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapOverview() {
  const { data: reports, loading } = usePaginatedData({
    table: 'inspections/inspections',
    filters: { approval_status: 'approved', is_draft: false },
    itemsPerPage: 100, // Load many for the map
    authQuery: true
  });

  if (loading) return <div className="p-8 text-center text-slate-500">Loading map data...</div>;

  const validMarkers = (reports || []).filter(r => r.gps_coordinates?.lat && r.gps_coordinates?.lng);

  return (
    <div className="h-[600px] w-full rounded-xl overflow-hidden border border-slate-200">
      <MapContainer center={[-1.2921, 36.8219]} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validMarkers.map(r => (
          <Marker key={r.id} position={[r.gps_coordinates.lat, r.gps_coordinates.lng]}>
            <Popup>
              <div className="p-1">
                <p className="font-bold text-slate-800">{r.businesses?.business_name}</p>
                <p className="text-xs text-slate-500">Inspector: {r.inspector_name}</p>
                <p className="text-xs text-slate-500">Date: {new Date(r.inspection_date).toLocaleDateString()}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
