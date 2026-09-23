import { useState } from 'react';
import { useProject } from '../state/ProjectContext';
import { buildProfile, ProfileError } from '../geo/profile';
import type { ElevSource, ProfileControlPoint, ProfileInput } from '../geo/types';
import { formatFt, formatStation } from '../lib/format';
import EmptyState, { PanelSection } from './EmptyState';
import GeBadge from './GeBadge';
import SurveyBadge from './SurveyBadge';
import ProfileChart from './ProfileChart';

interface Row {
  station: string;
  invert: string;
}

const toRows = (cps: ProfileControlPoint[]): Row[] =>
  cps.map((c) => ({ station: String(c.stationFt), invert: String(c.invertElevFt) }));

function parseRows(rows: Row[]): ProfileControlPoint[] {  return rows.map((r, i) => {
    const stationFt = Number(r.station);
    const invertElevFt = Number(r.invert);
    if (!Number.isFinite(stationFt) || !Number.isFinite(invertElevFt)) {
      throw new ProfileError(
        'NO_CONTROL_POINTS',
        `Control point ${i + 1} needs numeric station and invert values.`,
      );
    }
    return { stationFt, invertElevFt };
  });
}

/**
 * Editable ground-elevation cell. Commits on blur/Enter: a typed value marks
 * the station user-entered; clearing restores the KMZ value where one exists.
 */
function GroundInput({
  chainageFt,
  groundElevFt,
  onCommit,
}: {
  chainageFt: number;
  groundElevFt?: number;
  onCommit: (chainageFt: number, value: number | undefined) => void;
}) {
  const committed = groundElevFt !== undefined ? groundElevFt.toFixed(2) : '';
  const [draft, setDraft] = useState(committed);
  const [lastCommitted, setLastCommitted] = useState(committed);
  if (committed !== lastCommitted) {
    setLastCommitted(committed);
    setDraft(committed);
  }
  const commit = () => {
    const t = draft.trim();
    if (t === '') {
      onCommit(chainageFt, undefined);
      return;
    }
    const v = Number(t);
    if (!Number.isFinite(v)) {
      setDraft(committed); // revert invalid input
      return;
    }
    onCommit(chainageFt, v);
  };
  return (
    <input
      className="num w-20 rounded border border-gray-300 px-1 py-0.5 text-right text-xs"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(committed);
      }}
      aria-label={`Ground elevation at ${formatStation(chainageFt)}, feet`}
      title="Type a surveyed elevation, or clear to restore the KMZ value"
      inputMode="decimal"
    />
  );
}

function SourceBadge({ source }: { source?: ElevSource }) {
  if (source === 'ge') return <GeBadge />;
  if (source === 'survey') return <SurveyBadge />;
  return <span className="text-gray-400">—</span>;
}

export default function ProfileTab() {
  const { state, setProfile, clearProfile, setStationGround, restoreGeGround } = useProject();
  const alignment = state.alignment;
  const profile = state.profile;

  const [rows, setRows] = useState<Row[]>(() =>
    profile ? toRows(profile.input.controlPoints) : [{ station: '0', invert: '' }],
  );
  const [pipeOD, setPipeOD] = useState(() =>
    profile ? String(profile.input.pipeODFt) : '',
  );
  const [editing, setEditing] = useState(!profile);
  const [error, setError] = useState<string | null>(null);
  // Grade quick-fill fields.
  const [gStart, setGStart] = useState('0');
  const [gInv, setGInv] = useState('');
  const [gGrade, setGGrade] = useState('');

  if (!alignment) {
    return <EmptyState title="No profile yet" hint="Import a KMZ to build the ground-surface vs. tunnel-invert profile." />;
  }

  const updateRow = (i: number, key: keyof Row, v: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

  const onBuild = () => {
    setError(null);
    try {
      const controlPoints = parseRows(rows).sort((a, b) => a.stationFt - b.stationFt);
      const pipeODFt = Number(pipeOD);
      const input: ProfileInput = { controlPoints, pipeODFt };
      const result = buildProfile(alignment.stations, input);
      setProfile(input, result);
      setEditing(false);
    } catch (e) {
      setError(
        e instanceof ProfileError
          ? `Profile error (${e.code}): ${e.message}`
          : `Profile error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };

  const applyGrade = () => {
    const s0 = Number(gStart);
    const inv0 = Number(gInv);
    const grade = Number(gGrade);
    if (![s0, inv0, grade].every(Number.isFinite)) {
      setError('Grade fill needs numeric start station, invert, and grade %.');
      return;
    }
    const s1 = alignment.lengthFt;
    const inv1 = inv0 + (grade / 100) * (s1 - s0);
    setRows([
      { station: String(s0), invert: String(inv0) },
      { station: String(Math.round(s1)), invert: inv1.toFixed(2) },
    ]);
    setError(null);
  };

  if (editing || !profile) {
    return (
      <div className="p-3">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Invert control points
        </h3>
        <div className="mb-1 grid grid-cols-[1fr_1fr_24px] gap-1 text-[11px] font-medium text-gray-500">
          <span>Station (ft)</span>
          <span>Invert elev (ft)</span>
          <span />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="mb-1 grid grid-cols-[1fr_1fr_24px] gap-1">
            <input
              className="num rounded border border-gray-300 px-2 py-1 text-sm"
              value={r.station}
              onChange={(e) => updateRow(i, 'station', e.target.value)}
              aria-label={`Control point ${i + 1} station`}
            />
            <input
              className="num rounded border border-gray-300 px-2 py-1 text-sm"
              value={r.invert}
              onChange={(e) => updateRow(i, 'invert', e.target.value)}
              aria-label={`Control point ${i + 1} invert elevation`}
            />
            <button
              type="button"
              className="text-gray-400 hover:text-red-700"
              title="Remove row"
              onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="mb-3 text-xs text-indigo-700 underline"
          onClick={() => setRows((rs) => [...rs, { station: '', invert: '' }])}
        >
          + Add control point
        </button>

        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Constant-grade fill
        </h3>
        <div className="mb-1 grid grid-cols-3 gap-1">
          <input
            className="num rounded border border-gray-300 px-2 py-1 text-sm"
            value={gStart}
            onChange={(e) => setGStart(e.target.value)}
            aria-label="Grade fill start station"
            title="Start station (ft)"
          />
          <input
            className="num rounded border border-gray-300 px-2 py-1 text-sm"
            value={gInv}
            onChange={(e) => setGInv(e.target.value)}
            aria-label="Grade fill start invert"
            title="Start invert elev (ft)"
          />
          <input
            className="num rounded border border-gray-300 px-2 py-1 text-sm"
            value={gGrade}
            onChange={(e) => setGGrade(e.target.value)}
            aria-label="Grade fill grade percent"
            title="Grade (%)"
          />
        </div>
        <button
          type="button"
          className="mb-3 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
          onClick={applyGrade}
        >
          Apply grade to end of drive
        </button>

        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Pipe
        </h3>
        <label className="mb-3 flex items-center gap-2 text-sm text-gray-700">
          OD (ft)
          <input
            className="num w-24 rounded border border-gray-300 px-2 py-1 text-sm"
            value={pipeOD}
            onChange={(e) => setPipeOD(e.target.value)}
            aria-label="Pipe outside diameter in feet"
          />
        </label>

        {error && <p className="mb-2 text-[11px] font-medium text-red-700">{error}</p>}
        <button
          type="button"
          className="w-full rounded bg-indigo-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          onClick={onBuild}
        >
          Build profile
        </button>
      </div>
    );
  }

  const stations = profile.result.stations;
  const minCover = Math.min(...stations.map((s) => s.coverFt ?? Infinity));
  const maxDepth = Math.max(...stations.map((s) => s.depthToInvertFt ?? -Infinity));
  const sources = new Set(stations.map((s) => s.elevSource));
  const hasGeBackup = stations.some((s) => s.geGroundElevFt !== undefined);
  const surveyCount = stations.filter((s) => s.elevSource === 'survey').length;

  return (
    <div>
      <PanelSection title="Profile">
        <ProfileChart
          stations={stations}
          borings={state.borings.map((b) => ({
            stationFt: b.stationFt,
            depthFt: b.depthFt,
            name: b.name,
            groundElevFt: b.groundElevFt,
          }))}
          showRuleLine={true}
        />
        <p className="mt-1 flex flex-wrap items-center gap-1">
          {sources.has('ge') && <GeBadge />}
          {sources.has('survey') && <SurveyBadge />}
          {sources.size === 0 && (
            <span className="text-[11px] text-gray-500">no ground elevations yet —</span>
          )}
          <span className="text-[11px] text-gray-500">ground elevations</span>
        </p>
        <div className="num mt-2 grid grid-cols-2 gap-1 text-xs text-gray-700">
          <span>Min cover: {formatFt(minCover)}</span>
          <span>Max depth: {formatFt(maxDepth)}</span>
        </div>
        <button
          type="button"
          className="mt-2 text-xs text-indigo-700 underline"
          onClick={() => {
            setRows(toRows(profile.input.controlPoints));
            setPipeOD(String(profile.input.pipeODFt));
            setEditing(true);
          }}
        >
          Edit inputs
        </button>{' '}
        {hasGeBackup && (
          <button
            type="button"
            className="mt-2 text-xs text-indigo-700 underline"
            title="Reset every station's ground to its KMZ-derived value"
            onClick={() => {
              if (
                surveyCount === 0 ||
                window.confirm(
                  `Replace ${surveyCount} user-entered ground elevation(s) with KMZ-derived values?`,
                )
              ) {
                restoreGeGround();
              }
            }}
          >
            Restore GE ground
          </button>
        )}{' '}
        <button
          type="button"
          className="mt-2 text-xs text-red-700 underline"
          onClick={clearProfile}
        >
          Clear profile
        </button>
      </PanelSection>

      {profile.result.warnings.length > 0 && (
        <PanelSection title="Warnings">
          <ul className="space-y-1">
            {profile.result.warnings.map((w, i) => (
              <li key={i} className="text-[11px] text-amber-800">
                <span className="font-medium">{w.code}</span>
                {w.stationFt !== undefined && (
                  <span className="num"> @ {formatStation(w.stationFt)}</span>
                )}
                : {w.message}
              </li>
            ))}
          </ul>
        </PanelSection>
      )}

      <PanelSection title="Inputs">
        <ul className="num space-y-0.5 text-xs text-gray-700">
          {profile.input.controlPoints.map((c, i) => (
            <li key={i}>
              {formatStation(c.stationFt)} → invert {formatFt(c.invertElevFt)}
            </li>
          ))}
          <li>Pipe OD: {formatFt(profile.input.pipeODFt)}</li>
        </ul>
        <p className="mt-1 text-[11px] text-gray-500">
          Assumption: linear grade between control points; invert held flat beyond outer
          points. Shallow-cover flag (&lt; 1 OD) is a project heuristic, not ASCE 36-15.
        </p>
      </PanelSection>

      <PanelSection title={`Stations (${stations.length})`}>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-[11px] text-gray-500">
                <th className="py-1 pr-2">Station</th>
                <th className="py-1 pr-2 text-right">Ground (ft)</th>
                <th className="py-1 pr-2">Src</th>
                <th className="py-1 pr-2 text-right">Invert</th>
                <th className="py-1 pr-2 text-right">Cover</th>
                <th className="py-1 text-right">Depth</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => (
                <tr key={s.chainageFt} className="border-t border-gray-100">
                  <td className="num py-0.5 pr-2">{formatStation(s.chainageFt)}</td>
                  <td className="num py-0.5 pr-2 text-right">
                    <GroundInput
                      chainageFt={s.chainageFt}
                      groundElevFt={s.groundElevFt}
                      onCommit={setStationGround}
                    />
                  </td>
                  <td className="py-0.5 pr-2">
                    <SourceBadge source={s.elevSource} />
                  </td>
                  <td className="num py-0.5 pr-2 text-right">{formatFt(s.invertElevFt)}</td>
                  <td
                    className={`num py-0.5 pr-2 text-right ${
                      s.coverFt !== undefined && s.coverFt < 0 ? 'font-semibold text-red-700' : ''
                    }`}
                  >
                    {formatFt(s.coverFt)}
                  </td>
                  <td className="num py-0.5 text-right">{formatFt(s.depthToInvertFt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelSection>
    </div>
  );
}
