import { CircleMarker, Tooltip } from 'react-leaflet';
import { useProject } from '../state/ProjectContext';

const BORING_COLOR = '#d97706';

/** Amber boring markers; click selects (3px outline when selected). */
export default function BoringMarkers() {
  const { state, selectBoring } = useProject();
  return (
    <>
      {state.borings.map((b) => {
        const selected = b.id === state.selectedBoringId;
        return (
          <CircleMarker
            key={b.id}
            center={[b.lat, b.lon]}
            radius={7}
            pathOptions={{
              color: BORING_COLOR,
              weight: selected ? 3 : 1.5,
              fillColor: BORING_COLOR,
              fillOpacity: selected ? 1 : 0.7,
            }}
            eventHandlers={{ click: () => selectBoring(b.id) }}
          >
            <Tooltip direction="top">
              <span className="text-xs font-medium">{b.name}</span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
