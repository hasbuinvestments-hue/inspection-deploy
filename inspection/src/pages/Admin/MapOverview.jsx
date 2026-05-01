import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { usePaginatedData } from '../../hooks/usePaginatedData';

export default function MapOverview() {
  const { data: reports, loading } = usePaginatedData({
    table: 'inspections/inspections',
    filters: { is_draft: false },
    itemsPerPage: 500, // Higher limit for heatmap coverage
    authQuery: true
  });

  if (loading) return <div className="p-8 text-center text-slate-500">Loading map data...</div>;

  const validMarkers = (reports || []).filter(r => r.gps_coordinates?.lat && r.gps_coordinates?.lng);

  const getMarkerColor = (date) => {
    const monthsAgo = (new Date() - new Date(date)) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo > 6) return '#ef4444'; // Red
    if (monthsAgo > 3) return '#f59e0b'; // Amber
    return '#10b981'; // Emerald
  };

  return (
    <div className="h-full w-full rounded-xl overflow-hidden">
      <MapContainer center={[-1.2921, 36.8219]} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validMarkers.map(r => (
          <CircleMarker 
            key={r.id} 
            center={[r.gps_coordinates.lat, r.gps_coordinates.lng]}
            radius={8}
            pathOptions={{ 
              color: getMarkerColor(r.inspection_date),
              fillColor: getMarkerColor(r.inspection_date),
              fillOpacity: 0.7 
            }}
          >
            <Popup>
              <div className="p-1 min-w-[150px]">
                <p className="font-bold text-slate-800 text-sm mb-1">{r.businesses?.business_name}</p>
                <div className="flex flex-col gap-1 text-[10px] text-slate-500">
                  <span className="flex justify-between"><span>Last Audit:</span> <b className="text-slate-700">{new Date(r.inspection_date).toLocaleDateString()}</b></span>
                  <span className="flex justify-between"><span>Status:</span> <b className="uppercase">{r.approval_status}</b></span>
                  <span className="flex justify-between"><span>Inspector:</span> <b>{r.inspector_name}</b></span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
