/**
 * Jacking force engine — Microtunnel Design Tool.
 *
 * Implements ASCE 36-15 §13.4 "Evaluation of Jacking Forces":
 *   JF = FP + Σ FR
 * where JF = total jacking force, FP = face pressure component,
 * FR = frictional resistance per segment.
 *
 * FR = σ'n · μ' · Ac · L  (§13.4), with σ'n from arching theory (§13.3),
 * μ' = tan(residual φ') reduced for lubrication (§13.4).
 *
 * Pure functions only: (inputs) → (results). No DOM, no network.
 */
import type {
  CapacityCheck,
  CapacityResult,
  DriveSegment,
  GroundClassEntry,
  JackingInputs,
  JackingResults,
  RowStatus,
  SegmentResult,
} from './types';
import { axisDepthFt, GAMMA_W_PCF, porePressurePsf, sigmaVEffPsf } from '../common/soil-stress';

/**
 * Face pressure component FP (§13.4): "the product of the cross-sectional area of
 * the MTBM head and the sum of the groundwater pressure and effective earth
 * pressures." Actual face pressure is typically slightly greater than u + active
 * earth pressure; K0 (at-rest) is the conservative default.
 */
export function faceComponentKips(
  cutterODIn: number,
  lateralK: number,
  sigmaVEffPsf_: number,
  uPsf: number,
): number {
  const headAreaFt2 = Math.PI * Math.pow(cutterODIn / 24, 2);
  return ((lateralK * sigmaVEffPsf_ + uPsf) * headAreaFt2) / 1000;
}

/**
 * Terzaghi arching equation for the vertical stress above a trapdoor/tunnel (§13.3
 * "arching theory ... proportional to the pipe's outer diameter"; §13.3 endorses the
 * Marston formula "modified to include soil cohesion" — the Terzaghi form below is
 * the cohesion-inclusive arching equation from the tunneling literature):
 *   σ'v = B·(γ' − 2c/B) / (2·K·tanφ') · (1 − exp(−2·K·tanφ'·H/B))
 * B = pipe OD (trapdoor width), H = crown cover, γ' = effective unit weight.
 * Returns NaN when φ' ≤ 0 (purely cohesive undrained → use tabulated mode; §13.4).
 */
export function archingSigmaNPsf(
  pipeODFt: number,
  gammaEffPcf: number,
  cohesionPsf: number,
  lateralK: number,
  phiResidualDeg: number,
  coverFt: number,
): number {
  const tanPhi = Math.tan((phiResidualDeg * Math.PI) / 180);
  const denom = 2 * lateralK * tanPhi;
  if (!(denom > 1e-9)) return NaN;
  const a = (pipeODFt * (gammaEffPcf - (2 * cohesionPsf) / pipeODFt)) / denom;
  return a * (1 - Math.exp((-denom * coverFt) / pipeODFt));
}

/** Effective friction factor μ' = tan(residual φ') reduced for lubrication (§13.4). */
export function effectiveMuPrime(phiResidualDeg: number, lubricationReduction: number): number {
  return Math.tan((phiResidualDeg * Math.PI) / 180) * lubricationReduction;
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function lookupClass(classes: GroundClassEntry[], cls: string): GroundClassEntry | undefined {
  return classes.find((g) => g.cls === cls);
}

interface ModeFriction {
  fLowPsf: number;
  fBasePsf: number;
  fHighPsf: number;
  sigmaNPsf: number;
  muPrimeUsed: number;
  note: string;
}

/**
 * Unit skin friction (psf) and diagnostics for one segment, per its friction mode.
 * - tabulated: f from the ground-class library or per-segment override (existing
 *   "industry-recognized rational method" path, §13.4 reference list).
 * - arching: σ'n from arching theory × μ' (§13.3/§13.4).
 * - buoyant: buoyant pipe weight × μ' for very stiff/hard clay and rock (§13.4).
 */
function modeFriction(
  seg: DriveSegment,
  inputs: JackingInputs,
  coverFt: number,
  lateralK: number,
): ModeFriction {
  const pipeODFt = inputs.pipeODIn / 12;
  const lube = seg.lubricationReduction ?? 1;

  if (seg.frictionMode === 'arching') {
    const phi = seg.phiResidualDeg;
    if (!isFiniteNum(phi) || phi <= 0 || !isFiniteNum(seg.cohesionPsf)) {
      return { fLowPsf: NaN, fBasePsf: NaN, fHighPsf: NaN, sigmaNPsf: NaN, muPrimeUsed: NaN,
        note: "arching mode needs phiResidualDeg > 0 and cohesionPsf; use tabulated mode for cohesive undrained analysis (§13.4)" };
    }
    const gw = seg.gwAboveAxisFt ?? 0;
    const gammaEff = gw > 0 ? seg.gammaPcf - GAMMA_W_PCF : seg.gammaPcf;
    const sigmaN = archingSigmaNPsf(pipeODFt, gammaEff, seg.cohesionPsf as number, lateralK, phi, coverFt);
    const mu = effectiveMuPrime(phi, lube);
    const f = sigmaN * mu;
    return { fLowPsf: f, fBasePsf: f, fHighPsf: f, sigmaNPsf: sigmaN, muPrimeUsed: mu,
      note: `arching σ'n=${sigmaN.toFixed(0)} psf (§13.3), μ'=${mu.toFixed(3)} (§13.4)` };
  }

  if (seg.frictionMode === 'buoyant') {
    const w = seg.pipeBuoyantWeightPlf;
    const mu = seg.muPrime;
    if (!isFiniteNum(w) || !isFiniteNum(mu)) {
      return { fLowPsf: NaN, fBasePsf: NaN, fHighPsf: NaN, sigmaNPsf: NaN, muPrimeUsed: NaN,
        note: 'buoyant mode needs pipeBuoyantWeightPlf and muPrime (§13.4: very stiff/hard clay, rock)' };
    }
    // Convert line load × μ' into an equivalent unit skin friction for the FR form.
    const f = ((w * mu) / (Math.PI * pipeODFt));
    return { fLowPsf: f, fBasePsf: f, fHighPsf: f, sigmaNPsf: NaN, muPrimeUsed: mu,
      note: `buoyant pipe weight × μ' (§13.4)` };
  }

  // tabulated
  const entry = lookupClass(inputs.groundClasses, seg.groundCls);
  const fLow = seg.fLowPsf ?? entry?.fLowPsf;
  const fBase = seg.fBasePsf ?? entry?.fBasePsf;
  const fHigh = seg.fHighPsf ?? entry?.fHighPsf;
  return {
    fLowPsf: fLow ?? NaN, fBasePsf: fBase ?? NaN, fHighPsf: fHigh ?? NaN,
    sigmaNPsf: NaN, muPrimeUsed: NaN,
    note: seg.fLowPsf !== undefined || seg.fBasePsf !== undefined || seg.fHighPsf !== undefined
      ? 'per-segment friction override' : `ground class "${seg.groundCls}" library`,
  };
}

function validateSegment(
  seg: DriveSegment,
  prevEndFt: number | null,
  mf: ModeFriction,
): { status: RowStatus; note: string } {
  const missing =
    !isFiniteNum(seg.startFt) || !isFiniteNum(seg.endFt) ||
    !isFiniteNum(seg.gammaPcf) || !isFiniteNum(seg.coverFt) ||
    seg.groundCls.trim() === '';
  if (missing) return { status: 'INPUT REQUIRED', note: 'missing required segment input' };
  if (!((seg.endFt as number) > (seg.startFt as number)))
    return { status: 'ERROR', note: 'end station must exceed start station' };
  if (prevEndFt !== null && Math.abs((seg.startFt as number) - prevEndFt) > 1e-9)
    return { status: 'ERROR', note: `discontinuity: previous segment ended at ${prevEndFt}` };
  if (!isFiniteNum(mf.fLowPsf) || !isFiniteNum(mf.fBasePsf) || !isFiniteNum(mf.fHighPsf))
    return { status: 'INPUT REQUIRED', note: mf.note };
  if (mf.fLowPsf > mf.fBasePsf || mf.fBasePsf > mf.fHighPsf)
    return { status: 'ERROR', note: 'friction values must satisfy low ≤ base ≤ high' };
  if (isFiniteNum(seg.radiusFt) && (seg.radiusFt as number) > 0 && (seg.curveFactor ?? 1) <= 1)
    return { status: 'REVIEW', note: 'curve present but curveFactor ≤ 1 — confirm friction increase (§13.4)' };
  return { status: 'OK', note: mf.note };
}

/**
 * Full jacking-force evaluation for a drive: JF = FP + ΣFR (§13.4).
 * Never throws on incomplete input — affected rows carry INPUT REQUIRED/ERROR.
 */
export function computeJackingForce(inputs: JackingInputs): JackingResults {
  const warnings: string[] = [];
  const pipeODFt = inputs.pipeODIn / 12;
  const restartLow = inputs.restartLow ?? 1;
  const restartBase = inputs.restartBase ?? 1;
  const restartHigh = inputs.restartHigh ?? 1;
  const faceMultLow = inputs.faceMultLow ?? 1;
  const faceMultBase = inputs.faceMultBase ?? 1;
  const faceMultHigh = inputs.faceMultHigh ?? 1;
  const warnUtil = inputs.warnUtilization ?? 0.85;

  if (!isFiniteNum(inputs.pipeODIn) || !isFiniteNum(inputs.cutterODIn) || inputs.cutterODIn <= inputs.pipeODIn) {
    warnings.push('Pipe/cutter OD invalid: cutterOD must exceed pipeOD.');
  }

  const rows: SegmentResult[] = [];
  const segs = inputs.segments.filter((s) => s.include);
  let prevEnd: number | null = null;
  let cumLow = 0, cumBase = 0, cumHigh = 0;

  segs.forEach((seg, i) => {
    const lateralK = inputs.faceBasis === 'active' ? seg.ka : seg.k0;
    const mf = modeFriction(seg, inputs, seg.coverFt ?? NaN, lateralK ?? NaN);
    const v = validateSegment(seg, prevEnd, mf);

    const startFt = seg.startFt as number;
    const endFt = seg.endFt as number;
    const lenFt = isFiniteNum(startFt) && isFiniteNum(endFt) ? endFt - startFt : NaN;
    const coverFt = seg.coverFt as number;
    const gw = seg.gwAboveAxisFt ?? 0;
    const uPsf = porePressurePsf(gw);
    const axisFt = axisDepthFt(coverFt, inputs.pipeODIn);
    const sigmaV = sigmaVEffPsf(seg.gammaPcf, axisFt, uPsf);
    const faceKips = v.status === 'ERROR' || v.status === 'INPUT REQUIRED' || !isFiniteNum(lateralK)
      ? NaN
      : faceComponentKips(inputs.cutterODIn, lateralK as number, sigmaV, uPsf);

    const curve = seg.curveFactor ?? 1;
    const areaFt2PerFt = Math.PI * pipeODFt; // circumferential area per foot of drive
    let fricLowKips = NaN, fricBaseKips = NaN, fricHighKips = NaN;
    if ((v.status === 'OK' || v.status === 'REVIEW') && isFiniteNum(lenFt)) {
      // FR = σ'n · μ' · Ac · L (§13.4); tabulated f already embeds σ'n·μ'.
      fricLowKips = (mf.fLowPsf * areaFt2PerFt * lenFt * curve) / 1000;
      fricBaseKips = (mf.fBasePsf * areaFt2PerFt * lenFt * curve) / 1000;
      fricHighKips = (mf.fHighPsf * areaFt2PerFt * lenFt * curve) / 1000;
      cumLow += fricLowKips; cumBase += fricBaseKips; cumHigh += fricHighKips;
    }

    const total = (cum: number, fK: number, fMult: number, rMult: number) =>
      isFiniteNum(cum) && isFiniteNum(fK) ? (cum + fK * fMult) * rMult : NaN;

    rows.push({
      idx: i + 1, startFt, endFt, lenFt, coverFt,
      frictionMode: seg.frictionMode, status: v.status, statusNote: v.note,
      faceKips,
      fricLowKips, fricBaseKips, fricHighKips,
      cumLowKips: cumLow, cumBaseKips: cumBase, cumHighKips: cumHigh,
      totalLowKips: total(cumLow, faceKips, faceMultLow, restartLow),
      totalBaseKips: total(cumBase, faceKips, faceMultBase, restartBase),
      totalHighKips: total(cumHigh, faceKips, faceMultHigh, restartHigh),
      sigmaNPsf: mf.sigmaNPsf, muPrimeUsed: mf.muPrimeUsed,
    });
    if (isFiniteNum(endFt)) prevEnd = endFt;
  });

  const valid = rows.filter((r) => r.status === 'OK' || r.status === 'REVIEW');
  const maxOf = (f: (r: SegmentResult) => number) =>
    valid.length ? Math.max(...valid.map(f).filter(isFiniteNum)) : NaN;
  const maxLowKips = maxOf((r) => r.totalLowKips);
  const maxBaseKips = maxOf((r) => r.totalBaseKips);
  const maxHighKips = maxOf((r) => r.totalHighKips);
  const maxFaceKips = maxOf((r) => r.faceKips);
  const maxFricRateHighKpf = maxOf((r) =>
    isFiniteNum(r.lenFt) && (r.lenFt as number) > 0 ? (r.fricHighKips / (r.lenFt as number)) * restartHigh : NaN);
  const driveLengthFt = valid.length ? Math.max(...valid.map((r) => r.endFt).filter(isFiniteNum)) : NaN;
  let govRowIdx = -1;
  valid.forEach((r) => {
    if (govRowIdx === -1 || (isFiniteNum(r.totalHighKips) && r.totalHighKips > (rows[govRowIdx] as SegmentResult).totalHighKips))
      govRowIdx = rows.indexOf(r);
  });

  const alignmentStatus: RowStatus = !rows.length || rows.some((r) => r.status === 'ERROR' || r.status === 'INPUT REQUIRED')
    ? 'INPUT REQUIRED'
    : rows.some((r) => r.status === 'REVIEW') ? 'REVIEW' : 'OK';

  // Capacity checks (§16.5: FS = ultimate/yield axial capacity ÷ max anticipated JF).
  const capacities: CapacityResult[] = inputs.capacities.map((c: CapacityCheck) => {
    const utilBase = isFiniteNum(c.capacityKips) && (c.capacityKips as number) > 0 ? maxBaseKips / (c.capacityKips as number) : NaN;
    const utilHigh = isFiniteNum(c.capacityKips) && (c.capacityKips as number) > 0 ? maxHighKips / (c.capacityKips as number) : NaN;
    const status: CapacityResult['status'] = !isFiniteNum(c.capacityKips) || !isFiniteNum(utilHigh)
      ? 'INPUT REQUIRED'
      : utilHigh > 1 ? 'EXCEEDS CAPACITY' : utilHigh >= warnUtil ? 'ELEVATED UTILIZATION' : 'OK';
    return { ...c, utilBase, utilHigh, status };
  });

  // IJS screening (ported from reference implementation).
  const pipeAllowKips = inputs.capacities[0]?.capacityKips;
  const limitKips = isFiniteNum(pipeAllowKips) && isFiniteNum(inputs.ijsCapacityKips)
    ? Math.min(pipeAllowKips as number, inputs.ijsCapacityKips as number) : NaN;
  const maxFaceHighKips = isFiniteNum(maxFaceKips) ? maxFaceKips * faceMultHigh * restartHigh : NaN;
  const firstStationFt = isFiniteNum(limitKips) && isFiniteNum(maxFaceHighKips) && isFiniteNum(maxFricRateHighKpf) && maxFricRateHighKpf > 0
    ? Math.max(0, ((limitKips as number) - (maxFaceHighKips as number)) / (maxFricRateHighKpf as number)) : NaN;
  const spacingFt = isFiniteNum(limitKips) && isFiniteNum(maxFricRateHighKpf) && (maxFricRateHighKpf as number) > 0
    ? (limitKips as number) / (maxFricRateHighKpf as number) : NaN;
  const count = isFiniteNum(firstStationFt) && isFiniteNum(spacingFt) && isFiniteNum(driveLengthFt) && (spacingFt as number) > 0
    ? (driveLengthFt <= (firstStationFt as number) ? 0 : 1 + Math.ceil((driveLengthFt - (firstStationFt as number)) / (spacingFt as number)))
    : NaN;
  const ijsScreen = !isFiniteNum(maxHighKips) || maxHighKips === 0
    ? 'INPUT REQUIRED'
    : !isFiniteNum(limitKips) ? 'IJS CAPACITY NOT PROVIDED'
    : maxHighKips <= (limitKips as number) ? 'NO IJS LOAD TRIGGER' : 'IJS OR REDESIGN REQUIRED';

  // Pushback check (§13.4): face pressure can push the MTBM and pipe string back
  // into the shaft when the jacks are released — a pipe brake/clamp may be needed.
  const pushbackKips = maxFaceHighKips;
  const pushback: JackingResults['pushback'] =
    isFiniteNum(pushbackKips) && isFiniteNum(inputs.pushbackRestraintKips)
      ? {
          pushbackKips: pushbackKips as number,
          status: ((inputs.pushbackRestraintKips as number) >= (pushbackKips as number)
            ? 'OK'
            : 'EXCEEDS RESTRAINT'),
        }
      : {
          pushbackKips: isFiniteNum(pushbackKips) ? (pushbackKips as number) : NaN,
          status: 'RESTRAINT NOT PROVIDED',
        };
  if (pushback.status === 'RESTRAINT NOT PROVIDED') {
    warnings.push('Pipe brake/clamp restraint not provided — verify pushback resistance per ASCE 36-15 §13.4.');
  }
  if (inputs.faceBasis === 'at-rest') {
    warnings.push('Face component uses at-rest (K0) earth pressure — conservative vs the §13.4 active-earth reference.');
  }
  if (rows.some((r) => r.frictionMode === 'tabulated')) {
    warnings.push('Tabulated friction path uses empirical ground-class values — confirm against project geotech data.');
  }

  return {
    rows, driveLengthFt, maxFaceKips, maxFricRateHighKpf,
    maxLowKips, maxBaseKips, maxHighKips, govRowIdx, alignmentStatus,
    capacities,
    ijs: { firstStationFt, spacingFt, count, screen: ijsScreen },
    pushback,
    warnings,
  };
}
