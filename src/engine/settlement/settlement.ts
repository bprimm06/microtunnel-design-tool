/**
 * Settlement module — Microtunnel Design Tool.
 *
 * Peck Gaussian-trough method (ASCE 36-15 §13.5 "Evaluation of Settlement Risks"):
 *   Vs   = VL% × Aexc                      (lost ground per foot of drive)
 *   i    = K · z0                           (trough width parameter)
 *   Smax = Vs / (i·√(2π))                   (centerline settlement)
 *   S(x) = Smax · exp(−x²/(2i²))            (transverse trough)
 *   max slope = Smax/(i·√e), occurring at x = i
 *
 * Pure functions only: (inputs) → (results). No DOM, no network.
 */
import type {
  Receptor,
  ReceptorResult,
  ReceptorStatus,
  SettlementInputs,
  SettlementResults,
  SettlementSegment,
  SettlementSegmentResult,
  SettlementStatus,
  TroughKEntry,
} from './types';

const SQRT2PI = Math.sqrt(2 * Math.PI);
const SQRT_E = Math.sqrt(Math.E);

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Transverse settlement at offset x, inches (Peck Gaussian trough). */
export function troughSettlementIn(xFt: number, sMaxIn: number, iFt: number): number {
  return sMaxIn * Math.exp(-(xFt * xFt) / (2 * iFt * iFt));
}

/** Transverse slope at offset x, ft/ft. sMaxFt in feet. */
export function troughSlopeRatio(xFt: number, sMaxFt: number, iFt: number): number {
  return Math.abs(troughSettlementIn(xFt, sMaxFt, iFt) * (xFt / (iFt * iFt)));
}

/** Maximum transverse slope = Smax/(i·√e), at x = i. sMaxFt in feet. */
export function maxTroughSlope(sMaxFt: number, iFt: number): number {
  return sMaxFt / (iFt * SQRT_E);
}

function lookupK(library: TroughKEntry[] | undefined, cls: string): number {
  const hit = library?.find((e) => e.cls === cls);
  return hit ? hit.k : NaN;
}

function classify(
  sMaxIn: number,
  settleRatio: number,
  slopeRatio: number,
  marginalFactor: number,
): { status: SettlementStatus; note: string } {
  if (!isFiniteNum(sMaxIn)) return { status: 'INPUT REQUIRED', note: 'missing required input' };
  if (settleRatio > 1 || slopeRatio > 1)
    return { status: 'EXCEEDS LIMIT', note: 'settlement or slope exceeds limit' };
  if (settleRatio > 1 / marginalFactor || slopeRatio > 1 / marginalFactor)
    return { status: 'MARGINAL', note: `within 1/${marginalFactor} of a limit` };
  return { status: 'OK', note: 'within limits' };
}

function evaluateSegment(
  seg: SettlementSegment,
  idx: number,
  inputs: SettlementInputs,
  aExcFt2: number,
  marginalFactor: number,
): SettlementSegmentResult {
  const nan = {
    idx, startFt: seg.startFt, endFt: seg.endFt, coverFt: NaN, kParam: NaN,
    z0Ft: NaN, iFt: NaN, vsFt2PerFt: NaN, sMaxIn: NaN, maxSlope: NaN,
    slopeDenom: NaN, halfWidthFt: NaN, settleRatio: NaN, slopeRatio: NaN,
    status: 'INPUT REQUIRED' as SettlementStatus, statusNote: 'missing required input',
  };
  const kParam = seg.kParam ?? lookupK(inputs.kLibrary, seg.groundCls);
  const vlPct = seg.volumeLossPct ?? inputs.volumeLossPct;
  const dpFt = inputs.pipeODIn / 12;
  if (
    !isFiniteNum(seg.startFt) || !isFiniteNum(seg.endFt) || seg.endFt <= seg.startFt ||
    !isFiniteNum(seg.coverFt) || !isFiniteNum(kParam) || kParam <= 0 ||
    !isFiniteNum(vlPct) || vlPct <= 0 || !isFiniteNum(aExcFt2) || !isFiniteNum(dpFt)
  ) {
    return nan;
  }
  const coverFt = seg.coverFt as number;
  const z0Ft = coverFt + dpFt / 2;
  const iFt = (kParam as number) * z0Ft;
  const vs = ((vlPct as number) / 100) * aExcFt2;
  const sMaxFt = vs / (iFt * SQRT2PI);
  const sMaxIn = sMaxFt * 12;
  const maxSlope = maxTroughSlope(sMaxFt, iFt);
  const slopeLimit = isFiniteNum(inputs.slopeLimitDenom) && (inputs.slopeLimitDenom as number) > 0
    ? 1 / (inputs.slopeLimitDenom as number) : NaN;
  const settleRatio = isFiniteNum(inputs.settleLimitIn) && inputs.settleLimitIn > 0
    ? sMaxIn / inputs.settleLimitIn : NaN;
  const slopeRatio = isFiniteNum(slopeLimit) && slopeLimit > 0 ? maxSlope / slopeLimit : NaN;
  const c = classify(sMaxIn, settleRatio, slopeRatio, marginalFactor);
  return {
    ...nan,
    coverFt, kParam: kParam as number, z0Ft, iFt, vsFt2PerFt: vs,
    sMaxIn, maxSlope, slopeDenom: maxSlope > 0 ? 1 / maxSlope : NaN,
    halfWidthFt: 2.5 * iFt, settleRatio, slopeRatio,
    status: c.status, statusNote: c.note,
  };
}

function evaluateReceptor(
  rc: Receptor,
  inputs: SettlementInputs,
  segResults: SettlementSegmentResult[],
  aExcFt2: number,
  dpFt: number,
  marginalFactor: number,
): ReceptorResult {
  const base = {
    name: rc.name, stationFt: rc.stationFt, offsetFt: Math.abs(rc.offsetFt),
    limitIn: rc.limitIn ?? inputs.settleLimitIn, segIdx: -1,
    coverFt: NaN, iFt: NaN, sMaxLocalIn: NaN,
    settleIn: NaN, slope: NaN, slopeDenom: NaN, ratio: NaN,
    status: 'INPUT REQUIRED' as ReceptorStatus,
  };
  if (!rc.name?.trim() || !isFiniteNum(rc.stationFt) || !isFiniteNum(rc.offsetFt)) return base;
  const seg = segResults.find(
    (s) => rc.stationFt >= s.startFt && rc.stationFt <= s.endFt && isFiniteNum(s.iFt),
  );
  if (!seg) return { ...base, status: 'OUTSIDE DRIVE' };
  // Receptor reads the segment trough at its own station; cover is the segment
  // worst-case cover (a surveyed profile refines this at U3/U6).
  const off = Math.abs(rc.offsetFt);
  const settleIn = troughSettlementIn(off, seg.sMaxIn, seg.iFt);
  const slope = troughSlopeRatio(off, seg.sMaxIn / 12, seg.iFt);
  const lim = rc.limitIn ?? inputs.settleLimitIn;
  const ratio = isFiniteNum(lim) && lim > 0 ? settleIn / lim : NaN;
  const status: ReceptorStatus =
    !isFiniteNum(ratio) ? 'INPUT REQUIRED'
    : ratio > 1 ? 'EXCEEDS LIMIT'
    : ratio > 1 / marginalFactor ? 'MARGINAL'
    : 'OK';
  return {
    ...base, segIdx: seg.idx, coverFt: seg.coverFt, iFt: seg.iFt,
    sMaxLocalIn: seg.sMaxIn, settleIn, slope,
    slopeDenom: slope > 0 ? 1 / slope : NaN, ratio, status,
  };
}

/**
 * Peck settlement evaluation for a drive.
 * Never throws on incomplete input — rows carry INPUT REQUIRED.
 */
export function computeSettlement(inputs: SettlementInputs): SettlementResults {
  const warnings: string[] = [];
  const marginalFactor = inputs.marginalFactor ?? 1.25;

  const deFt = isFiniteNum(inputs.cutterODIn) && inputs.cutterODIn > 0 ? inputs.cutterODIn / 12 : NaN;
  const dpFt = isFiniteNum(inputs.pipeODIn) && inputs.pipeODIn > 0 ? inputs.pipeODIn / 12 : NaN;
  const aExcFt2 = isFiniteNum(deFt) ? (Math.PI * deFt * deFt) / 4 : NaN;
  const annulusVolumeLossPct =
    isFiniteNum(deFt) && isFiniteNum(dpFt) && deFt > 0 ? ((deFt * deFt - dpFt * dpFt) / (deFt * deFt)) * 100 : NaN;

  if (!isFiniteNum(inputs.volumeLossPct) || inputs.volumeLossPct <= 0)
    warnings.push('Volume loss must be greater than zero.');
  if (!isFiniteNum(deFt))
    warnings.push('Cutter OD is required to set the excavated area.');
  if (!isFiniteNum(inputs.settleLimitIn) || inputs.settleLimitIn <= 0)
    warnings.push('A settlement limit is required.');
  if (isFiniteNum(inputs.volumeLossPct) && isFiniteNum(annulusVolumeLossPct) &&
      inputs.volumeLossPct < annulusVolumeLossPct)
    warnings.push(
      `Volume loss (${inputs.volumeLossPct}%) is below the geometric overcut annulus ` +
      `(${annulusVolumeLossPct.toFixed(2)}%) — likely unconservative.`,
    );

  const segments = inputs.segments
    .filter((s) => s.include)
    .map((seg, i) => evaluateSegment(seg, i + 1, inputs, aExcFt2, marginalFactor));

  let govIdx = -1;
  segments.forEach((s, i) => {
    if (isFiniteNum(s.sMaxIn) && (govIdx === -1 || s.sMaxIn > (segments[govIdx] as SettlementSegmentResult).sMaxIn))
      govIdx = i;
  });
  const gov = govIdx >= 0 ? (segments[govIdx] as SettlementSegmentResult) : undefined;

  const receptors = (inputs.receptors ?? []).map((rc) =>
    evaluateReceptor(rc, inputs, segments, aExcFt2, dpFt, marginalFactor),
  );

  const trough: { xFt: number; settleIn: number }[] = [];
  if (gov && isFiniteNum(gov.iFt) && gov.iFt > 0) {
    for (let k = -60; k <= 60; k++) {
      const x = k * ((gov.iFt * 3) / 60);
      trough.push({ xFt: x, settleIn: troughSettlementIn(x, gov.sMaxIn, gov.iFt) });
    }
  }

  const alignmentStatus: SettlementStatus =
    !segments.length || segments.some((s) => s.status === 'INPUT REQUIRED')
      ? 'INPUT REQUIRED'
      : segments.some((s) => s.status === 'EXCEEDS LIMIT')
        ? 'EXCEEDS LIMIT'
        : segments.some((s) => s.status === 'MARGINAL')
          ? 'MARGINAL'
          : 'OK';

  return {
    segments,
    excavatedAreaFt2: aExcFt2,
    annulusVolumeLossPct,
    govIdx,
    maxSettleIn: gov ? gov.sMaxIn : NaN,
    maxSlope: gov ? gov.maxSlope : NaN,
    receptors,
    trough,
    alignmentStatus,
    warnings,
  };
}
