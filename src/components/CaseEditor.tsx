import { useState } from 'react';
import { useProject } from '../state/ProjectContext';
import { autoSplitSegments } from '../cases/buildCase';
import type { CalcCase, CaseSegment } from '../cases/types';
import type { FrictionMode, LateralBasis } from '../engine/jacking/types';
import { PanelSection } from './EmptyState';

function Num({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-xs text-gray-600">
      {label}
      {required && <span className="text-red-600"> *</span>}
      <input
        className="num mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
        value={value ?? ''}
        inputMode="decimal"
        onChange={(e) => {
          const v = e.target.value.trim();
          onChange(v === '' ? undefined : Number(v));
        }}
      />
    </label>
  );
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs text-gray-600">
      {label}
      <input
        className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function GlobalsForm({ c }: { c: CalcCase }) {
  const { updateCase } = useProject();
  const g = c.globals;
  const set = (patch: Partial<typeof g>) => updateCase({ ...c, globals: { ...g, ...patch } });

  return (
    <PanelSection title="Globals">
      <div className="grid grid-cols-2 gap-2">
        <Num label="Pipe OD (in)" value={g.pipeODIn} required onChange={(v) => set({ pipeODIn: v })} />
        <Num label="Cutter OD (in)" value={g.cutterODIn} required onChange={(v) => set({ cutterODIn: v })} />
        <label className="block text-xs text-gray-600">
          Face basis (jacking)
          <select
            className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            value={g.faceBasis}
            onChange={(e) => set({ faceBasis: e.target.value as LateralBasis })}
          >
            <option value="at-rest">at-rest (K0, conservative)</option>
            <option value="active">active (Ka)</option>
          </select>
        </label>
        <label className="block text-xs text-gray-600">
          Target basis (face)
          <select
            className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            value={g.targetBasis}
            onChange={(e) => set({ targetBasis: e.target.value as LateralBasis })}
          >
            <option value="at-rest">at-rest (K0, conservative)</option>
            <option value="active">active (Ka)</option>
          </select>
        </label>
        <Num label="Volume loss (%)" value={g.volumeLossPct} required onChange={(v) => set({ volumeLossPct: v })} />
        <Num label="Settlement limit (in)" value={g.settleLimitIn} required onChange={(v) => set({ settleLimitIn: v })} />
        <Num label="Blowout factor (–)" value={g.blowoutFactor} onChange={(v) => set({ blowoutFactor: v })} />
        <Num label="Warn utilization (–)" value={g.warnUtilization} onChange={(v) => set({ warnUtilization: v })} />
        <Num label="Restart mult low" value={g.restartLow} onChange={(v) => set({ restartLow: v })} />
        <Num label="Restart mult base" value={g.restartBase} onChange={(v) => set({ restartBase: v })} />
        <Num label="Restart mult high" value={g.restartHigh} onChange={(v) => set({ restartHigh: v })} />
        <Num label="Face mult low" value={g.faceMultLow} onChange={(v) => set({ faceMultLow: v })} />
        <Num label="Face mult base" value={g.faceMultBase} onChange={(v) => set({ faceMultBase: v })} />
        <Num label="Face mult high" value={g.faceMultHigh} onChange={(v) => set({ faceMultHigh: v })} />
        <Num label="MTBM min (psf)" value={g.mtbmMinPsf} onChange={(v) => set({ mtbmMinPsf: v })} />
        <Num label="MTBM max (psf)" value={g.mtbmMaxPsf} onChange={(v) => set({ mtbmMaxPsf: v })} />
        <Num label="IJS capacity (kips)" value={g.ijsCapacityKips} onChange={(v) => set({ ijsCapacityKips: v })} />
        <Num label="Pushback restraint (kips)" value={g.pushbackRestraintKips} onChange={(v) => set({ pushbackRestraintKips: v })} />
        <Num label="Slope limit 1:N" value={g.slopeLimitDenom} onChange={(v) => set({ slopeLimitDenom: v })} />
        <Num label="Marginal factor (–)" value={g.marginalFactor} onChange={(v) => set({ marginalFactor: v })} />
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={!!g.ijsPlanned}
          onChange={(e) => set({ ijsPlanned: e.target.checked })}
        />
        Intermediate jacking stations planned
      </label>
      <p className="mt-1 text-[11px] text-gray-500">
        Fields marked * are required — the case will not run without them.
      </p>
    </PanelSection>
  );
}

function SegmentAdvanced({ seg, onPatch }: { seg: CaseSegment; onPatch: (p: Partial<CaseSegment>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-2">
      {seg.frictionMode === 'tabulated' && (
        <>
          <Num label="f low (psf)" value={seg.fLowPsf} onChange={(v) => onPatch({ fLowPsf: v })} />
          <Num label="f base (psf)" value={seg.fBasePsf} onChange={(v) => onPatch({ fBasePsf: v })} />
          <Num label="f high (psf)" value={seg.fHighPsf} onChange={(v) => onPatch({ fHighPsf: v })} />
          <p className="col-span-2 text-[11px] text-gray-500">
            Leave blank to use the ground-class library below.
          </p>
        </>
      )}
      {seg.frictionMode === 'arching' && (
        <>
          <Num label="φ residual (deg)" value={seg.phiResidualDeg} onChange={(v) => onPatch({ phiResidualDeg: v })} />
          <Num label="Cohesion (psf)" value={seg.cohesionPsf} onChange={(v) => onPatch({ cohesionPsf: v })} />
          <Num label="Lubrication reduction" value={seg.lubricationReduction} onChange={(v) => onPatch({ lubricationReduction: v })} />
        </>
      )}
      {seg.frictionMode === 'buoyant' && (
        <>
          <Num label="Pipe buoyant wt (plf)" value={seg.pipeBuoyantWeightPlf} onChange={(v) => onPatch({ pipeBuoyantWeightPlf: v })} />
          <Num label="μ′" value={seg.muPrime} onChange={(v) => onPatch({ muPrime: v })} />
        </>
      )}
      <Num label="Curve factor (–)" value={seg.curveFactor} onChange={(v) => onPatch({ curveFactor: v })} />
      <Num label="Curve radius (ft)" value={seg.radiusFt} onChange={(v) => onPatch({ radiusFt: v })} />
      <Num label="Trough K override" value={seg.kParam} onChange={(v) => onPatch({ kParam: v })} />
      <Num label="Vol. loss override (%)" value={seg.volumeLossPct} onChange={(v) => onPatch({ volumeLossPct: v })} />
    </div>
  );
}

function SegmentsForm({ c }: { c: CalcCase }) {
  const { state, updateCase } = useProject();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [splitN, setSplitN] = useState('4');

  const updateSeg = (i: number, patch: Partial<CaseSegment>) =>
    updateCase({ ...c, segments: c.segments.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  const addSegment = () =>
    updateCase({
      ...c,
      segments: [
        ...c.segments,
        {
          startFt: c.stationStartFt,
          endFt: c.stationEndFt,
          groundCls: '',
          gwAboveAxisFt: 0,
          frictionMode: 'tabulated',
          include: true,
        },
      ],
    });

  const split = () => {
    const n = Math.max(2, Math.floor(Number(splitN) || 2));
    if (state.profile) {
      updateCase(autoSplitSegments(c, state.profile.result, n));
    } else {
      // Even split without profile cover re-derivation.
      const segments = c.segments.flatMap((seg) => {
        if (!seg.include) return [seg];
        const len = (seg.endFt - seg.startFt) / n;
        return Array.from({ length: n }, (_, i) => ({
          ...seg,
          startFt: seg.startFt + i * len,
          endFt: i === n - 1 ? seg.endFt : seg.startFt + (i + 1) * len,
        }));
      });
      updateCase({ ...c, segments });
    }
    setExpanded(null);
  };

  return (
    <PanelSection title={`Drive segments (${c.segments.length})`}>
      <div className="mb-2 flex items-center gap-2">
        <input
          className="num w-16 rounded border border-gray-300 px-2 py-1 text-sm"
          value={splitN}
          inputMode="numeric"
          aria-label="Split count"
          onChange={(e) => setSplitN(e.target.value)}
        />
        <button
          type="button"
          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
          onClick={split}
          title="Split included segments into N equal parts"
        >
          Auto-split
        </button>
        <button
          type="button"
          className="text-xs text-indigo-700 underline"
          onClick={addSegment}
        >
          + Add segment
        </button>
      </div>
      <div className="space-y-2">
        {c.segments.map((seg, i) => (
          <div key={i} className="rounded border border-gray-200 p-2">
            <div className="grid grid-cols-3 gap-2">
              <Num label="Start (ft)" value={seg.startFt} onChange={(v) => updateSeg(i, { startFt: v ?? 0 })} />
              <Num label="End (ft)" value={seg.endFt} onChange={(v) => updateSeg(i, { endFt: v ?? 0 })} />
              <Text label="Ground class" value={seg.groundCls} onChange={(v) => updateSeg(i, { groundCls: v })} />
              <Num label="γ (pcf)" value={seg.gammaPcf} required onChange={(v) => updateSeg(i, { gammaPcf: v })} />
              <Num label="K0" value={seg.k0} required onChange={(v) => updateSeg(i, { k0: v })} />
              <Num label="Ka" value={seg.ka} required onChange={(v) => updateSeg(i, { ka: v })} />
              <Num label="Cover (ft)" value={seg.coverFt} required onChange={(v) => updateSeg(i, { coverFt: v })} />
              <Num label="GW above axis (ft)" value={seg.gwAboveAxisFt} onChange={(v) => updateSeg(i, { gwAboveAxisFt: v })} />
              <label className="block text-xs text-gray-600">
                Friction mode
                <select
                  className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={seg.frictionMode}
                  onChange={(e) => updateSeg(i, { frictionMode: e.target.value as FrictionMode })}
                >
                  <option value="tabulated">tabulated</option>
                  <option value="arching">arching</option>
                  <option value="buoyant">buoyant</option>
                </select>
              </label>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={seg.include}
                  onChange={(e) => updateSeg(i, { include: e.target.checked })}
                />
                include
              </label>
              <button
                type="button"
                className="text-xs text-indigo-700 underline"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                {expanded === i ? 'Hide advanced' : 'Advanced'}
              </button>
              <button
                type="button"
                className="ml-auto text-xs text-red-700 underline"
                onClick={() =>
                  updateCase({ ...c, segments: c.segments.filter((_, j) => j !== i) })
                }
              >
                Remove
              </button>
            </div>
            {expanded === i && (
              <div className="mt-1">
                <SegmentAdvanced seg={seg} onPatch={(p) => updateSeg(i, p)} />
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-gray-500">
        Cover auto-fills as the minimum within the segment range — edit freely.
      </p>
    </PanelSection>
  );
}

function LibrariesForm({ c }: { c: CalcCase }) {
  const { updateCase } = useProject();
  return (
    <>
      <PanelSection title={`Friction library (${c.groundClasses.length})`}>
        <p className="mb-1 text-[11px] text-gray-500">
          Project geotechnical input — unit skin friction by ground class, psf.
        </p>
        {c.groundClasses.map((e, i) => (
          <div key={i} className="mb-1 grid grid-cols-[1fr_1fr_1fr_1fr_20px] gap-1">
            <input className="rounded border border-gray-300 px-1 py-1 text-xs" value={e.cls}
              aria-label="Ground class"
              onChange={(ev) => updateCase({ ...c, groundClasses: c.groundClasses.map((x, j) => j === i ? { ...x, cls: ev.target.value } : x) })} />
            {(['fLowPsf', 'fBasePsf', 'fHighPsf'] as const).map((k) => (
              <input key={k} className="num rounded border border-gray-300 px-1 py-1 text-xs"
                value={e[k] ?? ''} inputMode="decimal" aria-label={k}
                onChange={(ev) => updateCase({ ...c, groundClasses: c.groundClasses.map((x, j) => j === i ? { ...x, [k]: ev.target.value === '' ? undefined : Number(ev.target.value) } : x) })} />
            ))}
            <button type="button" className="text-gray-400 hover:text-red-700" title="Remove"
              onClick={() => updateCase({ ...c, groundClasses: c.groundClasses.filter((_, j) => j !== i) })}>×</button>
          </div>
        ))}
        <button type="button" className="text-xs text-indigo-700 underline"
          onClick={() => updateCase({ ...c, groundClasses: [...c.groundClasses, { cls: '', fLowPsf: 0, fBasePsf: 0, fHighPsf: 0 }] })}>
          + Add class
        </button>
      </PanelSection>
      <PanelSection title={`Trough-K library (${c.kLibrary.length})`}>
        <p className="mb-1 text-[11px] text-gray-500">
          Project geotechnical input — trough width parameter K by ground class.
        </p>
        {c.kLibrary.map((e, i) => (
          <div key={i} className="mb-1 grid grid-cols-[2fr_1fr_20px] gap-1">
            <input className="rounded border border-gray-300 px-1 py-1 text-xs" value={e.cls}
              aria-label="Ground class"
              onChange={(ev) => updateCase({ ...c, kLibrary: c.kLibrary.map((x, j) => j === i ? { ...x, cls: ev.target.value } : x) })} />
            <input className="num rounded border border-gray-300 px-1 py-1 text-xs"
              value={e.k ?? ''} inputMode="decimal" aria-label="K parameter"
              onChange={(ev) => updateCase({ ...c, kLibrary: c.kLibrary.map((x, j) => j === i ? { ...x, k: ev.target.value === '' ? undefined as unknown as number : Number(ev.target.value) } : x) })} />
            <button type="button" className="text-gray-400 hover:text-red-700" title="Remove"
              onClick={() => updateCase({ ...c, kLibrary: c.kLibrary.filter((_, j) => j !== i) })}>×</button>
          </div>
        ))}
        <button type="button" className="text-xs text-indigo-700 underline"
          onClick={() => updateCase({ ...c, kLibrary: [...c.kLibrary, { cls: '', k: 0.5 }] })}>
          + Add class
        </button>
      </PanelSection>
    </>
  );
}

function CapacitiesForm({ c }: { c: CalcCase }) {
  const { updateCase } = useProject();
  const caps = c.globals.capacities;
  return (
    <PanelSection title={`Capacities (${caps.length})`}>
      <p className="mb-1 text-[11px] text-gray-500">
        First entry should be the pipe/joint system allowable — it drives IJS math.
      </p>
      {caps.map((cap, i) => (
        <div key={i} className="mb-1 grid grid-cols-[2fr_1fr_1fr_20px] gap-1">
          <input className="rounded border border-gray-300 px-1 py-1 text-xs" value={cap.name}
            aria-label="Capacity name" placeholder="Name"
            onChange={(e) => updateCase({ ...c, globals: { ...c.globals, capacities: caps.map((x, j) => j === i ? { ...x, name: e.target.value } : x) } })} />
          <input className="num rounded border border-gray-300 px-1 py-1 text-xs"
            value={cap.capacityKips ?? ''} inputMode="decimal" aria-label="Capacity kips" placeholder="kips"
            onChange={(e) => updateCase({ ...c, globals: { ...c.globals, capacities: caps.map((x, j) => j === i ? { ...x, capacityKips: e.target.value === '' ? undefined : Number(e.target.value) } : x) } })} />
          <input className="rounded border border-gray-300 px-1 py-1 text-xs" value={cap.owner}
            aria-label="Owner" placeholder="Owner"
            onChange={(e) => updateCase({ ...c, globals: { ...c.globals, capacities: caps.map((x, j) => j === i ? { ...x, owner: e.target.value } : x) } })} />
          <button type="button" className="text-gray-400 hover:text-red-700" title="Remove"
            onClick={() => updateCase({ ...c, globals: { ...c.globals, capacities: caps.filter((_, j) => j !== i) } })}>×</button>
        </div>
      ))}
      <button type="button" className="text-xs text-indigo-700 underline"
        onClick={() => updateCase({ ...c, globals: { ...c.globals, capacities: [...caps, { name: '', owner: '' }] } })}>
        + Add capacity
      </button>
    </PanelSection>
  );
}

function ReceptorsForm({ c }: { c: CalcCase }) {
  const { updateCase } = useProject();
  return (
    <PanelSection title={`Receptors (${c.receptors.length})`}>
      {c.receptors.map((r, i) => (
        <div key={i} className="mb-1 grid grid-cols-[2fr_1fr_1fr_1fr_20px] gap-1">
          <input className="rounded border border-gray-300 px-1 py-1 text-xs" value={r.name}
            aria-label="Receptor name"
            onChange={(e) => updateCase({ ...c, receptors: c.receptors.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} />
          <input className="num rounded border border-gray-300 px-1 py-1 text-xs"
            value={r.stationFt} inputMode="decimal" aria-label="Station ft"
            onChange={(e) => updateCase({ ...c, receptors: c.receptors.map((x, j) => j === i ? { ...x, stationFt: Number(e.target.value) || 0 } : x) })} />
          <input className="num rounded border border-gray-300 px-1 py-1 text-xs"
            value={r.offsetFt} inputMode="decimal" aria-label="Offset ft"
            onChange={(e) => updateCase({ ...c, receptors: c.receptors.map((x, j) => j === i ? { ...x, offsetFt: Number(e.target.value) || 0 } : x) })} />
          <input className="num rounded border border-gray-300 px-1 py-1 text-xs"
            value={r.limitIn ?? ''} inputMode="decimal" aria-label="Limit in" placeholder="in"
            onChange={(e) => updateCase({ ...c, receptors: c.receptors.map((x, j) => j === i ? { ...x, limitIn: e.target.value === '' ? undefined : Number(e.target.value) } : x) })} />
          <button type="button" className="text-gray-400 hover:text-red-700" title="Remove"
            onClick={() => updateCase({ ...c, receptors: c.receptors.filter((_, j) => j !== i) })}>×</button>
        </div>
      ))}
      <button type="button" className="text-xs text-indigo-700 underline"
        onClick={() => updateCase({ ...c, receptors: [...c.receptors, { name: `R-${c.receptors.length + 1}`, stationFt: c.stationStartFt, offsetFt: 0 }] })}>
        + Add receptor
      </button>
    </PanelSection>
  );
}

export default function CaseEditor({ c }: { c: CalcCase }) {
  return (
    <div>
      <GlobalsForm c={c} />
      <SegmentsForm c={c} />
      <CapacitiesForm c={c} />
      <LibrariesForm c={c} />
      <ReceptorsForm c={c} />
    </div>
  );
}
