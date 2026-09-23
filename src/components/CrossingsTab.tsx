import { useState } from 'react';
import { useProject } from '../state/ProjectContext';
import {
  buildOverpassQuery,
  corridorPolyFilter,
  fetchOverpass,
  DEFAULT_CORRIDOR_HALF_WIDTH_FT,
} from '../osm/overpass';
import { detectCrossings, detectWetlandCrossings, detectLeveeCrossings, mergeCrossings } from '../osm/crossings';
import { NwiError, fetchNWI } from '../osm/nwi';
import { NldError, fetchNLD } from '../osm/nld';
import { OsmError } from '../osm/types';
import type { Crossing, CrossingKind } from '../osm/types';
import { formatStation } from '../lib/format';
import EmptyState, { PanelSection } from './EmptyState';
import { kindColor } from './CrossingMarkers';

const KINDS: CrossingKind[] = ['road', 'rail', 'water', 'building', 'utility', 'wetland', 'levee'];

export default function CrossingsTab() {
  const { state, setCrossings, clearCrossings } = useProject();
  const [halfWidth, setHalfWidth] = useState(String(DEFAULT_CORRIDOR_HALF_WIDTH_FT));
  const [kinds, setKinds] = useState<Set<CrossingKind>>(new Set(KINDS));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state.alignment) {
    return (
      <EmptyState
        title="No crossings yet"
        hint="Import a KMZ to begin, then detect crossings from OpenStreetMap, NWI wetlands, and NLD levees."
      />
    );
  }

  const toggleKind = (k: CrossingKind) =>
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const detect = async () => {
    setLoading(true);
    setError(null);
    try {
      const hw = Number(halfWidth);
      if (!Number.isFinite(hw) || hw <= 0) {
        throw new OsmError('BAD_RESPONSE', 'Corridor half-width must be a positive number.');
      }
      const stations = state.alignment!.stations;
      const poly = corridorPolyFilter(stations, hw);
      // Query all sources in parallel; one may fail while the others succeed.
      const [osmSettled, nwiSettled, nldSettled] = await Promise.allSettled([
        fetchOverpass(buildOverpassQuery(poly)),
        fetchNWI(stations, hw),
        fetchNLD(stations, hw),
      ]);
      const lists: Crossing[][] = [];
      const failures: string[] = [];
      if (osmSettled.status === 'fulfilled') {
        lists.push(detectCrossings(osmSettled.value.elements, stations));
      } else {
        const e = osmSettled.reason;
        failures.push(
          `OpenStreetMap: ${e instanceof OsmError ? `(${e.code}) ${e.message}` : String(e)}`,
        );
      }
      if (nwiSettled.status === 'fulfilled') {
        lists.push(detectWetlandCrossings(nwiSettled.value, stations));
      } else {
        const e = nwiSettled.reason;
        failures.push(
          `NWI wetlands: ${e instanceof NwiError ? `(${e.code}) ${e.message}` : String(e)}`,
        );
      }
      if (nldSettled.status === 'fulfilled') {
        lists.push(detectLeveeCrossings(nldSettled.value, stations));
      } else {
        const e = nldSettled.reason;
        failures.push(
          `NLD levees: ${e instanceof NldError ? `(${e.code}) ${e.message}` : String(e)}`,
        );
      }
      if (lists.length === 0) {
        throw new Error(failures.join(' '));
      }
      if (failures.length > 0) {
        setError(`Partial results — ${failures.join(' ')}`);
      }
      setCrossings(mergeCrossings(lists).filter((c) => kinds.has(c.kind)));
    } catch (e) {
      setError(
        e instanceof OsmError || e instanceof NwiError || e instanceof NldError
          ? `(${e.code}) ${e.message}`
          : `Detection failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PanelSection title="Detect">
        <label className="mb-2 block text-xs text-gray-600">
          Corridor half-width (ft)
          <input
            className="num mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            value={halfWidth}
            inputMode="decimal"
            onChange={(e) => setHalfWidth(e.target.value)}
          />
        </label>
        <div className="mb-2 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <label key={k} className="flex items-center gap-1 text-xs text-gray-600">
              <input type="checkbox" checked={kinds.has(k)} onChange={() => toggleKind(k)} />
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: kindColor(k) }}
              />
              {k}
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={detect}
          className="w-full rounded bg-brand-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-wait disabled:bg-gray-400"
        >
          {loading ? 'Querying sources…' : 'Detect crossings'}
        </button>
        {error && (
          <div className="mt-2 rounded border border-red-300 bg-red-50 p-2 text-[11px] text-red-800">
            <p className="font-semibold">Detection failed</p>
            <p>{error}</p>
            <button type="button" className="mt-1 text-brand-700 underline" onClick={detect}>
              Retry
            </button>
          </div>
        )}
        <p className="mt-1 text-[11px] text-gray-500">OSM-derived — field verify.</p>
        <p className="mt-1 text-[11px] text-gray-500">
          NWI wetlands are screening data (1:12,000 aerial imagery), not a legal or
          jurisdictional determination — field delineation governs. NWI-derived — field verify.
        </p>
        <p className="mt-1 text-[11px] text-gray-500">
          NLD is a national inventory, not a jurisdictional determination — a levee
          crossing may require USACE Section 408 permission. NLD-derived — field verify.
        </p>
      </PanelSection>

      <PanelSection title={`Crossings (${state.crossings.length})`}>
        {state.crossings.length === 0 ? (
          <p className="text-xs text-gray-500">
            None detected yet. Set the corridor and run detection above.
          </p>
        ) : (
          <>
            <ul className="max-h-96 space-y-1 overflow-y-auto">
              {state.crossings.map((c) => (
                <li key={c.id} className="flex items-start gap-2 rounded border border-gray-200 p-2">
                  <span
                    className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: kindColor(c.kind) }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    <p className="num text-[11px] text-gray-500">
                      {c.kind} · {formatStation(c.stationFt)} · {c.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-2 text-xs text-red-700 underline"
              onClick={() => {
                if (window.confirm('Clear all detected crossings?')) clearCrossings();
              }}
            >
              Clear crossings
            </button>
          </>
        )}
      </PanelSection>
    </div>
  );
}
