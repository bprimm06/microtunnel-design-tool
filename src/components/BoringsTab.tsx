import { useState } from 'react';
import { useProject } from '../state/ProjectContext';
import {
  buildBoring,
  defaultBoringDepth,
  validateDepth,
  validateStrata,
} from '../geotech/borings';
import { BoringError } from '../geotech/types';
import type { Boring, Stratum } from '../geotech/types';
import { formatFt, formatStation } from '../lib/format';
import EmptyState, { PanelSection } from './EmptyState';

interface StratumRow {
  top: string;
  bottom: string;
  description: string;
}

function BoringEditor({ boring, onClose }: { boring: Boring; onClose: () => void }) {
  const { state, updateBoring, deleteBoring } = useProject();
  const [name, setName] = useState(boring.name);
  const [depth, setDepth] = useState(String(boring.depthFt));
  const [rows, setRows] = useState<StratumRow[]>(() =>
    boring.strata.map((s) => ({
      top: String(s.topDepthFt),
      bottom: String(s.bottomDepthFt),
      description: s.description,
    })),
  );
  const [error, setError] = useState<string | null>(null);

  const profileStations = state.profile?.result.stations ?? null;

  const onSave = () => {
    setError(null);
    try {
      const depthFt = Number(depth);
      validateDepth(depthFt);
      const strata: Stratum[] = rows
        .filter((r) => r.top !== '' || r.bottom !== '' || r.description !== '')
        .map((r) => ({
          topDepthFt: Number(r.top),
          bottomDepthFt: Number(r.bottom),
          description: r.description.trim(),
        }));
      validateStrata(strata, depthFt);
      const overridden = Math.abs(depthFt - boring.depthFt) > 1e-9;
      updateBoring({
        ...boring,
        name: name.trim() === '' ? boring.name : name.trim(),
        depthFt,
        depthSource:
          boring.depthSource === 'rule' && overridden ? 'override' : boring.depthSource,
        depthDerivation:
          boring.depthSource === 'rule' && overridden
            ? `${boring.depthDerivation} — overridden to ${depthFt.toFixed(1)} ft by user.`
            : boring.depthDerivation,
        strata,
      });
      onClose();
    } catch (e) {
      setError(
        e instanceof BoringError
          ? `(${e.code}) ${e.message}`
          : `Save failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };

  const onResetRule = () => {
    const rule = defaultBoringDepth(boring.stationFt, profileStations);
    if (!rule) {
      setError('No profile covers this station — cannot apply the rule.');
      return;
    }
    setDepth(String(rule.depthFt.toFixed(1)));
    setError(null);
  };

  const updateRow = (i: number, key: keyof StratumRow, v: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

  return (
    <div className="border-t border-gray-200 p-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Edit {boring.name}
      </h3>
      <label className="mb-2 block text-xs text-gray-600">
        Name
        <input
          className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="num mb-1 text-xs text-gray-600">
        Station {formatStation(boring.stationFt)} · offset {formatFt(boring.offsetFt, 0)}
      </div>
      <label className="mb-1 block text-xs text-gray-600">
        Depth (ft)
        <input
          className="num mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          value={depth}
          onChange={(e) => setDepth(e.target.value)}
          inputMode="decimal"
        />
      </label>
      <p className="mb-1 text-[11px] text-gray-500">{boring.depthDerivation}</p>
      <p className="mb-2 text-[11px]">
        <span className="font-medium text-gray-600">Source: </span>
        <span className={boring.depthSource === 'rule' ? 'text-green-700' : 'text-amber-700'}>
          {boring.depthSource === 'rule'
            ? '+20 ft rule'
            : boring.depthSource === 'override'
              ? 'user override'
              : 'manual'}
        </span>
        {boring.depthSource !== 'rule' && profileStations && (
          <button
            type="button"
            className="ml-2 text-indigo-700 underline"
            onClick={onResetRule}
          >
            Reset to rule
          </button>
        )}
      </p>

      <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Strata
      </h4>
      <div className="mb-1 grid grid-cols-[1fr_1fr_2fr_20px] gap-1 text-[11px] text-gray-500">
        <span>Top (ft)</span>
        <span>Bot (ft)</span>
        <span>Description</span>
        <span />
      </div>
      {rows.map((r, i) => (
        <div key={i} className="mb-1 grid grid-cols-[1fr_1fr_2fr_20px] gap-1">
          <input
            className="num rounded border border-gray-300 px-1 py-1 text-xs"
            value={r.top}
            onChange={(e) => updateRow(i, 'top', e.target.value)}
            aria-label={`Stratum ${i + 1} top depth`}
          />
          <input
            className="num rounded border border-gray-300 px-1 py-1 text-xs"
            value={r.bottom}
            onChange={(e) => updateRow(i, 'bottom', e.target.value)}
            aria-label={`Stratum ${i + 1} bottom depth`}
          />
          <input
            className="rounded border border-gray-300 px-1 py-1 text-xs"
            value={r.description}
            onChange={(e) => updateRow(i, 'description', e.target.value)}
            aria-label={`Stratum ${i + 1} description`}
          />
          <button
            type="button"
            className="text-gray-400 hover:text-red-700"
            title="Remove stratum"
            onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="mb-2 text-xs text-indigo-700 underline"
        onClick={() => setRows((rs) => [...rs, { top: '', bottom: '', description: '' }])}
      >
        + Add stratum
      </button>

      {error && <p className="mb-2 text-[11px] font-medium text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700"
          onClick={onSave}
        >
          Save
        </button>
        <button
          type="button"
          className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="ml-auto text-xs text-red-700 underline"
          onClick={() => {
            if (window.confirm(`Delete boring ${boring.name}?`)) {
              deleteBoring(boring.id);
              onClose();
            }
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function BoringsTab() {
  const {
    state,
    setPlacing,
    selectBoring,
    addBoring,
  } = useProject();
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!state.alignment) {
    return (
      <EmptyState
        title="No borings yet"
        hint="Import a KMZ to begin, then click the map to place borings."
      />
    );
  }

  const editing = editingId ? state.borings.find((b) => b.id === editingId) : undefined;

  const convertWaypoint = (idx: number) => {
    const w = state.waypoints[idx];
    if (!w || !state.alignment) return;
    addBoring(
      buildBoring(w.lat, w.lon, state.borings, state.alignment.stations, state.profile?.result.stations ?? null),
    );
  };

  return (
    <div>
      <PanelSection title="Placement">
        <button
          type="button"
          className={`w-full rounded px-2 py-1.5 text-sm font-medium text-white ${
            state.placingBoring ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
          onClick={() => setPlacing(!state.placingBoring)}
        >
          {state.placingBoring ? 'Placing… click the map (Esc to stop)' : 'Place borings'}
        </button>
        {!state.profile && (
          <p className="mt-1 text-[11px] text-amber-800">
            No profile yet — borings will need manual depths until you build one.
          </p>
        )}
      </PanelSection>

      {state.waypoints.length > 0 && (
        <PanelSection title={`KMZ waypoints (${state.waypoints.length})`}>
          <ul className="max-h-28 space-y-1 overflow-y-auto">
            {state.waypoints.map((w, i) => (
              <li key={`${w.name}-${i}`} className="flex items-center justify-between text-xs">
                <span className="text-gray-700">
                  {w.name}{' '}
                  <span className="num text-gray-500">
                    {w.lat.toFixed(5)}, {w.lon.toFixed(5)}
                  </span>
                </span>
                <button
                  type="button"
                  className="text-indigo-700 underline"
                  title="Create a boring at this waypoint"
                  onClick={() => convertWaypoint(i)}
                >
                  → boring
                </button>
              </li>
            ))}
          </ul>
        </PanelSection>
      )}

      <PanelSection title={`Borings (${state.borings.length})`}>
        {state.borings.length === 0 ? (
          <p className="text-xs text-gray-500">
            None yet. Toggle placement above and click the map, or convert a KMZ waypoint.
          </p>
        ) : (
          <ul className="space-y-1">
            {state.borings.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  className={`w-full rounded border p-2 text-left hover:bg-gray-50 ${
                    state.selectedBoringId === b.id ? 'border-amber-600' : 'border-gray-200'
                  }`}
                  onClick={() => {
                    selectBoring(b.id);
                    setEditingId(b.id);
                  }}
                >
                  <span className="text-sm font-medium text-gray-800">{b.name}</span>
                  <span className="num ml-2 text-xs text-gray-500">{formatStation(b.stationFt)}</span>
                  <span className="num block text-xs text-gray-600">
                    Depth {formatFt(b.depthFt)}{' '}
                    <span className={b.depthSource === 'rule' ? 'text-green-700' : 'text-amber-700'}>
                      ({b.depthSource === 'rule' ? '+20 ft rule' : b.depthSource})
                    </span>
                  </span>
                  {b.strata.length > 0 && (
                    <span className="num block text-[11px] text-gray-500">
                      {b.strata.length} {b.strata.length === 1 ? 'stratum' : 'strata'}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>

      {editing && <BoringEditor boring={editing} onClose={() => setEditingId(null)} />}
    </div>
  );
}
