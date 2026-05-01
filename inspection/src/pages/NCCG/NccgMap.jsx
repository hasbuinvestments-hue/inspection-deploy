import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { useAuth } from '../../contexts/useAuth';
import { apiFetch } from '../../lib/api';

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

export default function NccgMap() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';
  const [assignedState, setAssignedState] = useState({ profileId: null, phosIds: [] });

  useEffect(() => {
    if (!profile?.id || isSuperAdmin) {
      return;
    }
    const loadPhos = async () => {
      try {
        const data = await apiFetch(`/users/?assigned_nccg_id=${profile.id}`);
        setAssignedState({
          profileId: profile.id,
          phosIds: (data.results || data || []).map(p => p.id),
        });
      } catch (e) {
        console.error("Failed to load assigned PHOs:", e);
      }
    };
    loadPhos();
  }, [isSuperAdmin, profile?.id]);

  const phosLoaded = isSuperAdmin || assignedState.profileId === profile?.id;

  const hasNoPhos = !isSuperAdmin && assignedState.phosIds.length === 0;

  const { data: reports, loading } = usePaginatedData({
    table: 'inspections/inspections',
    filters: {
      approval_status: 'pending',
      ...(isSuperAdmin ? {} : { inspector__in: assignedState.phosIds.join(',') })
    },
    skip: !phosLoaded || hasNoPhos,
    itemsPerPage: 100,
    authQuery: true
  });

  if (loading || !phosLoaded) return <div className="p-8 text-center text-slate-500">Loading map...</div>;
  if (hasNoPhos) return <div className="p-8 text-center text-slate-500">No PHOs assigned to your queue yet.</div>;

  const validMarkers = (reports || []).filter(r => r.gps_coordinates?.lat && r.gps_coordinates?.lng);

  return (
    <div className="h-[60vh] w-full rounded-xl overflow-hidden border border-slate-200">
      <MapContainer center={[-1.2921, 36.8219]} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validMarkers.map(r => (
          <Marker key={r.id} position={[r.gps_coordinates.lat, r.gps_coordinates.lng]}>
            <Popup>
              <div className="p-2">
                <p className="font-bold text-slate-800 mb-1">{r.businesses?.business_name}</p>
                <div className="text-xs text-slate-500 space-y-1">
                  <p><strong>Inspector:</strong> {r.inspector_name}</p>
                  <p><strong>Ward:</strong> {r.businesses?.ward_name}</p>
                  <p><strong>Submitted:</strong> {new Date(r.inspection_date).toLocaleDateString()}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
