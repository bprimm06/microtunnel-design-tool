import { CircleMarker, Tooltip } from 'react-leaflet';
import { useProject } from '../state/ProjectContext';
import { formatStation } from '../lib/format';
import type { CrossingKind } from '../osm/types';

const KIND_COLORS: Record<CrossingKind, string> = {
  road: '#dc2626',
  rail: '#475569',
  water: '#2563eb',
  building: '#ea580c',
  utility: '#7c3aed',
};

export function kindColor(kind: CrossingKind): string {
  return KIND_COLORS[kind];
}

/** Crossing markers, colored by kind, with name + station tooltips. */
export default function CrossingMarkers() {
  const { state } = useProject();
  return (
    <>
      {state.crossings.map((c) => {
        const color = KIND_COLORS[c.kind];
        return (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lon]}
            radius={6}
            pathOptions={{ color, weight: 1.5, fillColor: color, fillOpacity: 0.7 }}
          >
            <Tooltip direction="top">
              <span className="text-xs">
                <span className="font-medium">{c.name}</span>
                <span className="num text-gray-500">
                  {' '}· {c.kind} · {formatStation(c.stationFt)}
                </span>
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
