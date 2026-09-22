import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  LayersControl,
  LayerGroup,
  ScaleControl,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { useProject } from '../state/ProjectContext';
import { formatStation } from '../lib/format';
import { buildBoring } from '../geotech/borings';
import BoringMarkers from './BoringMarkers';
import CrossingMarkers from './CrossingMarkers';

/**
 * Click-to-place borings. Active while the "Place borings" toggle is on:
 * each map click projects to the alignment, applies the +20 ft rule depth
 * (or manual when no profile), and adds the boring.
 */
function PlaceBoringHandler() {
  const { state, addBoring, setPlacing } = useProject();
  useMapEvents({
    click(e) {
      if (!state.placingBoring || !state.alignment) return;
      addBoring(
        buildBoring(
          e.latlng.lat,
          e.latlng.lng,
          state.borings,
          state.alignment.stations,
          state.profile?.result.stations ?? null,
        ),
      );
    },
  });
  // Esc exits placement mode.
  useEffect(() => {
    if (!state.placingBoring) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPlacing(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.placingBoring, setPlacing]);
  return null;
}

/** Zoom to the alignment whenever a new one is loaded. */
function FitToAlignment() {
  const { state } = useProject();
  const map = useMap();
  useEffect(() => {
    if (state.alignment) {
      const bounds = state.alignment.stations.map(
        (s) => [s.lat, s.lon] as [number, number],
      );
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  }, [state.alignment, map]);
  return null;
}

const OSM_STANDARD = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ESRI_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTRIBUTION =
  'Imagery &copy; <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics';

const ALIGNMENT_STYLE = { color: '#4f46e5', weight: 4 };

export default function MapViewer() {
  const { state } = useProject();
  const { layers, alignment } = state;
  const positions = alignment?.stations.map((s) => [s.lat, s.lon] as [number, number]) ?? [];
  const start = alignment?.stations[0];
  const end = alignment?.stations[alignment.stations.length - 1];

  return (
    <MapContainer center={[39.5, -98.35]} zoom={4} scrollWheelZoom className="z-0">
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Satellite (Esri)">
          <TileLayer url={ESRI_IMAGERY} attribution={ESRI_ATTRIBUTION} maxZoom={19} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Streets (OSM)">
          <TileLayer url={OSM_STANDARD} attribution={OSM_ATTRIBUTION} maxZoom={19} />
        </LayersControl.BaseLayer>
      </LayersControl>

      {layers.alignment && alignment && (
        <LayerGroup>
          <Polyline positions={positions} pathOptions={ALIGNMENT_STYLE} />
          {start && (
            <CircleMarker
              center={[start.lat, start.lon]}
              radius={6}
              pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 1 }}
            >
              <Tooltip permanent direction="top">
                <span className="num">{formatStation(start.chainageFt)}</span>
              </Tooltip>
            </CircleMarker>
          )}
          {end && (
            <CircleMarker
              center={[end.lat, end.lon]}
              radius={6}
              pathOptions={{ color: '#4f46e5', fillColor: '#fff', fillOpacity: 1 }}
            >
              <Tooltip permanent direction="top">
                <span className="num">{formatStation(end.chainageFt)}</span>
              </Tooltip>
            </CircleMarker>
          )}
        </LayerGroup>
      )}
      {layers.borings && (
        <LayerGroup>
          <BoringMarkers />
        </LayerGroup>
      )}
      {layers.crossings && (
        <LayerGroup>
          <CrossingMarkers />
        </LayerGroup>
      )}
      {layers.settlement && <LayerGroup />}

      <ScaleControl position="bottomleft" imperial />
      <PlaceBoringHandler />
      <FitToAlignment />
    </MapContainer>
  );
}
