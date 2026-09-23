/**
 * Assumptions disclosed with every calculation run and every exported report.
 * Single source of truth — ResultsTab and the report builder both use this.
 */
import type { CalcCase } from './types';
import type { SettlementResults } from '../engine/settlement/types';

export const REPORT_ASSUMPTIONS: string[] = [
  'Segment cover = minimum cover within the segment range (auto-filled, editable).',
  'Face stations come from the profile; soil parameters are inherited from the containing segment.',
  'Tabulated friction and trough-K libraries are project geotechnical inputs — they start empty.',
  'Blowout guard is a heuristic (factor × overburden) — TODO(source needed), not an ASCE 36-15 formula.',
  'Face operating target uses the at-rest (K0) basis — conservative vs the active-earth minimum.',
  'Google Earth elevations are GE-derived — field verify.',
  'OSM crossings are OSM-derived — field verify.',
  'Reference cases REF-01, FP-01, and ST-01 are verified against independent Python — user hand-calculation countersign pending.',
];

const f2 = (v: number) => v.toFixed(2);

/**
 * Settlement-section assumptions populated from the actual case inputs and
 * engine results — the values the run used, not generic boilerplate.
 */
export function settlementAssumptions(c: CalcCase, r: SettlementResults): string[] {
  const g = c.globals;
  const lines: string[] = [];
  lines.push(
    'Method: Peck Gaussian trough (ASCE 36-15 §13.5) — Smax = Vs/(i√(2π)), i = K·z0, S(x) = Smax·e^(−x²/2i²); max transverse slope Smax/(i√e) at x = i.',
  );
  const machine = g.mtbmModel
    ? `${g.mtbmModel}${g.cutterHead ? `, ${g.cutterHead} cutting wheel` : ''}`
    : 'manual entry';
  lines.push(
    `Excavated area ${f2(r.excavatedAreaFt2)} ft² from ${f2(g.cutterODIn ?? 0)}-in cutter OD (${machine}).`,
  );
  const overrides = c.segments.filter((s) => s.include && s.volumeLossPct !== undefined);
  lines.push(
    `Volume loss ${f2(g.volumeLossPct ?? 0)}% of excavated area` +
      (overrides.length > 0
        ? ` (segment overrides: ${overrides
            .map((s) => `${s.startFt.toFixed(0)}–${s.endFt.toFixed(0)} ft @ ${f2(s.volumeLossPct!)}%`)
            .join('; ')})`
        : ' (no segment overrides)') +
      `; geometric annulus (overcut) loss ${f2(r.annulusVolumeLossPct)}% — a VL below that warns as unconservative.`,
  );
  const included = c.segments.filter((s) => s.include);
  const kDesc = r.segments.map((s, i) => {
    const cs = included[i];
    const basis =
      cs !== undefined && cs.kParam !== undefined
        ? 'override'
        : cs !== undefined && c.kLibrary.some((e) => e.cls === cs.groundCls)
          ? `kLibrary "${cs.groundCls}"`
          : 'engine default';
    return `sta ${s.startFt.toFixed(0)}–${s.endFt.toFixed(0)}: K=${f2(s.kParam)} (${basis}), i=${f2(s.iFt)} ft`;
  });
  lines.push(`Trough width i = K·z0 by segment — ${kDesc.join('; ')}.`);
  lines.push(
    `Settlement limit ${f2(g.settleLimitIn ?? 0)} in; slope limit 1:${g.slopeLimitDenom ?? '—'}; ` +
      `marginal band 1/${g.marginalFactor ?? 1.25}.`,
  );
  lines.push(
    `Cover = minimum cover within each segment (worst case); z0 = cover + pipeOD/2 = depth to tunnel axis.`,
  );
  if (g.mtbmId && g.mtbmId !== 'custom') {
    lines.push('Machine specs catalog-derived — verify with the manufacturer data sheet.');
  }
  return lines;
}

