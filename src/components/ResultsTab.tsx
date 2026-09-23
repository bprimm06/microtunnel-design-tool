import { useState } from 'react';
import { useProject } from '../state/ProjectContext';
import { buildCaseFromProfile, profileFingerprint } from '../cases/buildCase';
import { runCase } from '../cases/runCase';
import { CaseError } from '../cases/types';
import type { CalcCase } from '../cases/types';
import type { CaseResults } from '../cases/runCase';
import type { JackingResults } from '../engine/jacking/types';
import type { FaceResults } from '../engine/face-pressure/types';
import type { SettlementResults } from '../engine/settlement/types';
import {
  formatFt,
  formatIn,
  formatKips,
  formatPct,
  formatPsf,
  formatStation,
} from '../lib/format';
import EmptyState, { PanelSection } from './EmptyState';
import CaseEditor from './CaseEditor';
import { REPORT_ASSUMPTIONS, settlementAssumptions } from '../cases/assumptions';
import { buildReportHtml, reportFilename } from '../report/buildReport';
import { downloadHtml } from '../report/download';

function Badge({ status }: { status: string }) {
  const color =
    status === 'OK'
      ? 'bg-green-100 text-green-800'
      : status === 'REVIEW' || status === 'MARGINAL' || status === 'ELEVATED UTILIZATION'
        ? 'bg-amber-100 text-amber-800'
        : status === 'INPUT REQUIRED' || status === 'OUTSIDE DRIVE'
          ? 'bg-gray-100 text-gray-700'
          : 'bg-red-100 text-red-800';
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${color}`}>{status}</span>
  );
}

function Warnings({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-amber-800">
      {items.map((w, i) => (
        <li key={i}>{w}</li>
      ))}
    </ul>
  );
}

function JackingSection({ r }: { r: JackingResults }) {
  const gov = r.rows[r.govRowIdx];
  return (
    <PanelSection title="Jacking force (U7)">
      <div className="num mb-1 grid grid-cols-2 gap-1 text-xs text-gray-700">
        <span>Max base: {formatKips(r.maxBaseKips)}</span>
        <span>Max high: {formatKips(r.maxHighKips)}</span>
        <span>Governing: {gov ? formatStation(gov.endFt) : '—'}</span>
        <span>
          Status: <Badge status={r.alignmentStatus} />
        </span>
      </div>
      {r.capacities.length > 0 && (
        <table className="num mt-1 w-full text-[11px]">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-0.5">Capacity</th>
              <th className="py-0.5">Allow (kips)</th>
              <th className="py-0.5">Util base</th>
              <th className="py-0.5">Util high</th>
              <th className="py-0.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {r.capacities.map((c, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-0.5">{c.name || `Capacity ${i + 1}`}</td>
                <td className="py-0.5">{c.capacityKips !== undefined ? formatKips(c.capacityKips, 0) : '—'}</td>
                <td className="py-0.5">{formatPct(c.utilBase * 100, 0)}</td>
                <td className="py-0.5">{formatPct(c.utilHigh * 100, 0)}</td>
                <td className="py-0.5">
                  <Badge status={c.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="num mt-1 text-[11px] text-gray-600">
        IJS: {r.ijs.screen}
        {r.ijs.count > 0 && ` — ${r.ijs.count} @ ${formatFt(r.ijs.spacingFt, 0)} from ${formatStation(r.ijs.firstStationFt)}`}
      </p>
      <p className="num text-[11px] text-gray-600">
        Pushback {formatKips(r.pushback.pushbackKips)} — <Badge status={r.pushback.status} />
      </p>
      <Warnings items={r.warnings} />
    </PanelSection>
  );
}

function FaceSection({ r }: { r: FaceResults }) {
  return (
    <PanelSection title="Face pressure (U8)">
      <div className="num mb-1 grid grid-cols-2 gap-1 text-xs text-gray-700">
        <span>Governing target: {formatPsf(r.governingTargetPsf)}</span>
        <span>@ {formatStation(r.governingStationFt)}</span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        <table className="num w-full text-[11px]">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-gray-500">
              <th className="py-0.5">Station</th>
              <th className="py-0.5">Cover (ft)</th>
              <th className="py-0.5">Min stab (psf)</th>
              <th className="py-0.5">Target (psf)</th>
              <th className="py-0.5">Blowout (psf)</th>
              <th className="py-0.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {r.stations.map((s, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-0.5">{formatStation(s.stationFt)}</td>
                <td className="py-0.5">{formatFt(s.coverFt)}</td>
                <td className="py-0.5">{formatPsf(s.minStablePsf)}</td>
                <td className="py-0.5">{formatPsf(s.targetPsf)}</td>
                <td className="py-0.5">{formatPsf(s.maxBlowoutPsf)}</td>
                <td className="py-0.5">
                  <Badge status={s.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Warnings items={r.warnings} />
    </PanelSection>
  );
}

function TroughChart({ trough }: { trough: { xFt: number; settleIn: number }[] }) {
  const W = 260;
  const H = 90;
  const PAD = 8;
  if (trough.length === 0) return null;
  const xMax = Math.max(...trough.map((p) => Math.abs(p.xFt)), 1);
  const yMax = Math.max(...trough.map((p) => p.settleIn), 0.01);
  const X = (x: number) => PAD + ((x + xMax) / (2 * xMax)) * (W - 2 * PAD);
  const Y = (y: number) => H - PAD - (y / yMax) * (H - 2 * PAD);
  const d = trough.map((p, i) => `${i === 0 ? 'M' : 'L'}${X(p.xFt).toFixed(1)},${Y(p.settleIn).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full rounded border border-gray-200 bg-white">
      <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="#9ca3af" strokeWidth={1} />
      <path d={d} fill="none" stroke="#4f46e5" strokeWidth={2} />
      <text x={W / 2} y={H - 1} fontSize={8} textAnchor="middle" fill="#6b7280">
        transverse offset (ft) — governing trough
      </text>
    </svg>
  );
}

function SettlementSection({ c, r }: { c: CalcCase; r: SettlementResults }) {
  const gov = r.segments[r.govIdx];
  const assumptions = settlementAssumptions(c, r);
  return (
    <PanelSection title="Settlement (U9)">
      <div className="num mb-1 grid grid-cols-2 gap-1 text-xs text-gray-700">
        <span>Max settlement: {formatIn(r.maxSettleIn)}</span>
        <span>
          Status: <Badge status={r.alignmentStatus} />
        </span>
        {gov && <span className="col-span-2">Governing: {formatStation(gov.startFt)}–{formatStation(gov.endFt)}</span>}
      </div>
      <TroughChart trough={r.trough} />
      {r.receptors.length > 0 && (
        <table className="num mt-1 w-full text-[11px]">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-0.5">Receptor</th>
              <th className="py-0.5">Station</th>
              <th className="py-0.5">Offset (ft)</th>
              <th className="py-0.5">Settle (in)</th>
              <th className="py-0.5">Ratio</th>
              <th className="py-0.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {r.receptors.map((rec, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-0.5">{rec.name}</td>
                <td className="py-0.5">{formatStation(rec.stationFt)}</td>
                <td className="py-0.5">{formatFt(rec.offsetFt, 0)}</td>
                <td className="py-0.5">{formatIn(rec.settleIn)}</td>
                <td className="py-0.5">{formatPct(rec.ratio * 100, 0)}</td>
                <td className="py-0.5">
                  <Badge status={rec.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Warnings items={r.warnings} />
      <div className="mt-2 border-t border-gray-100 pt-1">
        <p className="text-[11px] font-semibold text-gray-700">Assumptions</p>
        <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-gray-600">
          {assumptions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </div>
    </PanelSection>
  );
}

export default function ResultsTab() {
  const { state, addCase, deleteCase, selectCase } = useProject();
  const [results, setResults] = useState<CaseResults | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [runFingerprint, setRunFingerprint] = useState<string | null>(null);

  const selected = state.cases.find((c) => c.id === state.selectedCaseId) ?? null;

  const createCase = () => {
    if (!state.profile) return;
    const n = state.cases.length + 1;
    addCase(
      buildCaseFromProfile(state.profile.result, state.profile.input, state.borings, `Case ${n}`),
    );
    setResults(null);
    setRunError(null);
    setRunFingerprint(null);
  };

  const run = () => {
    if (!selected) return;
    try {
      setResults(runCase(selected));
      setRunError(null);
    } catch (e) {
      setResults(null);
      setRunError(
        e instanceof CaseError ? `(${e.code}) ${e.message}` : `Run failed: ${String(e)}`,
      );
    }
    setRunFingerprint(JSON.stringify(selected));
  };

  const exportReport = () => {
    if (!selected || !results || inputsStale) return;
    const generatedAt = new Date().toISOString();
    const html = buildReportHtml({
      projectName: state.projectName,
      generatedAt,
      appNote: 'Microtunnel design tool',
      case: selected,
      results,
      borings: state.borings,
      crossings: state.crossings,
    });
    downloadHtml(reportFilename(selected.name, generatedAt), html);
  };

  const inputsStale = selected !== null && runFingerprint !== null && JSON.stringify(selected) !== runFingerprint;
  const profileStale =
    selected !== null &&
    state.profile !== null &&
    profileFingerprint(state.profile.input, state.profile.result.stations) !==
      selected.profileFingerprint;

  return (
    <div>
      <PanelSection title={`Calculation cases (${state.cases.length})`}>
        <button
          type="button"
          disabled={!state.profile}
          title={state.profile ? 'Build a case from the current profile' : 'Build a profile first'}
          className="w-full rounded bg-brand-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          onClick={createCase}
        >
          New case from profile
        </button>
        {!state.profile && (
          <p className="mt-1 text-[11px] text-amber-800">Build a profile first — cases need it.</p>
        )}
        {state.cases.length > 0 && (
          <ul className="mt-2 space-y-1">
            {state.cases.map((c) => (
              <li
                key={c.id}
                className={`flex items-center justify-between rounded border p-2 ${
                  state.selectedCaseId === c.id ? 'border-brand-600' : 'border-gray-200'
                }`}
              >
                <button
                  type="button"
                  className="text-left"
                  onClick={() => {
                    selectCase(c.id);
                    setResults(null);
                    setRunError(null);
                    setRunFingerprint(null);
                  }}
                >
                  <span className="text-sm font-medium text-gray-800">{c.name}</span>
                  <span className="num block text-[11px] text-gray-500">
                    {c.segments.length} {c.segments.length === 1 ? 'segment' : 'segments'} ·{' '}
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </button>
                <button
                  type="button"
                  className="text-xs text-red-700 underline"
                  onClick={() => {
                    if (window.confirm(`Delete case ${c.name}?`)) {
                      deleteCase(c.id);
                      setResults(null);
                      setRunError(null);
                      setRunFingerprint(null);
                    }
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>

      {selected && (
        <>
          {profileStale && (
            <div className="mx-3 mb-2 rounded border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-800">
              The profile changed since this case was built — covers and face stations are from
              the old profile. Create a new case to refresh.
            </div>
          )}
          <CaseEditor key={selected.id} c={selected} />
          <div className="p-3">
            <button
              type="button"
              className="w-full rounded bg-brand-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
              onClick={run}
            >
              Run all three engines
            </button>
            <button
              type="button"
              disabled={!results || inputsStale}
              title={
                !results
                  ? 'Run the engines first'
                  : inputsStale
                    ? 'Inputs changed — run again before exporting'
                    : 'Download a self-contained HTML calculation report'
              }
              className="mt-2 w-full rounded border border-brand-600 px-2 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
              onClick={exportReport}
            >
              Export report (HTML)
            </button>
            {inputsStale && results && (
              <p className="mt-1 text-[11px] text-amber-800">
                Inputs changed since the last run — run again for current results.
              </p>
            )}
          </div>
          {runError && (
            <div className="mx-3 mb-2 rounded border border-red-300 bg-red-50 p-2 text-[11px] text-red-800">
              <p className="font-semibold">Cannot run</p>
              <p className="whitespace-pre-line">{runError}</p>
            </div>
          )}
          {results && !inputsStale && (
            <>
              <JackingSection r={results.jacking} />
              <FaceSection r={results.face} />
              <SettlementSection c={selected} r={results.settlement} />
              <PanelSection title="Assumptions">
                <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-gray-600">
                  {REPORT_ASSUMPTIONS.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </PanelSection>
            </>
          )}
        </>
      )}

      {!selected && state.cases.length === 0 && (
        <EmptyState
          title="No calculation cases yet"
          hint="Define a calc case from the profile to run the jacking, face-pressure, and settlement engines."
        />
      )}
    </div>
  );
}
