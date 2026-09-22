/**
 * Validate a calculation case and run the U7/U8/U9 engines. Pure.
 * Never runs with incomplete required inputs — throws CaseError first.
 */
import { computeJackingForce } from '../engine/jacking/jacking';
import type {
  DriveSegment,
  JackingInputs,
  JackingResults,
} from '../engine/jacking/types';
import { computeFacePressures } from '../engine/face-pressure/face-pressure';
import type { FaceInputs, FaceResults, FaceStation } from '../engine/face-pressure/types';
import { computeSettlement } from '../engine/settlement/settlement';
import type {
  SettlementInputs,
  SettlementResults,
  SettlementSegment,
} from '../engine/settlement/types';
import { CaseError } from './types';
import type { CalcCase, CaseSegment } from './types';

export interface CaseResults {
  jacking: JackingResults;
  face: FaceResults;
  settlement: SettlementResults;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Named validation — every failure names the segment and field. */
export function validateCase(c: CalcCase): void {
  const included = c.segments.filter((s) => s.include);
  if (included.length === 0) {
    throw new CaseError('NO_SEGMENTS', 'Case has no included drive segments.');
  }
  const g = c.globals;
  const missing: string[] = [];
  if (!isNum(g.pipeODIn) || g.pipeODIn <= 0) missing.push('globals: pipe OD (in) must be positive');
  if (!isNum(g.cutterODIn) || g.cutterODIn <= 0) missing.push('globals: cutter OD (in) must be positive');
  if (!isNum(g.volumeLossPct) || g.volumeLossPct <= 0)
    missing.push('globals: volume loss (%) must be positive');
  if (!isNum(g.settleLimitIn) || g.settleLimitIn <= 0)
    missing.push('globals: settlement limit (in) must be positive');
  included.forEach((s, i) => {
    const label = `segment ${i + 1} (${s.startFt.toFixed(0)}–${s.endFt.toFixed(0)} ft)`;
    if (!(s.endFt > s.startFt)) missing.push(`${label}: end must exceed start`);
    if (!isNum(s.gammaPcf) || s.gammaPcf <= 0) missing.push(`${label}: gamma (pcf) required`);
    if (!isNum(s.k0) || s.k0 <= 0) missing.push(`${label}: K0 required`);
    if (!isNum(s.ka) || s.ka <= 0) missing.push(`${label}: Ka required`);
    if (!isNum(s.coverFt) || s.coverFt < 0) missing.push(`${label}: cover (ft) required`);
  });
  if (c.faceStations.length === 0) {
    throw new CaseError('NO_FACE_STATIONS', 'Case has no face-pressure stations.');
  }
  if (missing.length > 0) {
    throw new CaseError('MISSING_REQUIRED', `Incomplete inputs:\n- ${missing.join('\n- ')}`);
  }
}

/** Soil for a station: the included segment containing it, else nearest included. */
function soilForStation(stationFt: number, segments: CaseSegment[]): CaseSegment {
  const included = segments.filter((s) => s.include);
  const hit = included.find((s) => stationFt >= s.startFt - 1e-9 && stationFt <= s.endFt + 1e-9);
  if (hit) return hit;
  let best = included[0]!;
  let bestD = Infinity;
  for (const s of included) {
    const mid = (s.startFt + s.endFt) / 2;
    const d = Math.abs(mid - stationFt);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

function toDriveSegment(s: CaseSegment): DriveSegment {
  return {
    startFt: s.startFt,
    endFt: s.endFt,
    groundCls: s.groundCls,
    gammaPcf: s.gammaPcf as number,
    coverFt: s.coverFt as number,
    gwAboveAxisFt: s.gwAboveAxisFt ?? 0,
    k0: s.k0 as number,
    ka: s.ka as number,
    frictionMode: s.frictionMode,
    fLowPsf: s.fLowPsf,
    fBasePsf: s.fBasePsf,
    fHighPsf: s.fHighPsf,
    phiResidualDeg: s.phiResidualDeg,
    cohesionPsf: s.cohesionPsf,
    lubricationReduction: s.lubricationReduction,
    pipeBuoyantWeightPlf: s.pipeBuoyantWeightPlf,
    muPrime: s.muPrime,
    curveFactor: s.curveFactor,
    radiusFt: s.radiusFt,
    include: s.include,
  };
}

export function runCase(c: CalcCase): CaseResults {
  validateCase(c);
  const g = c.globals;

  const jackingInputs: JackingInputs = {
    pipeODIn: g.pipeODIn as number,
    cutterODIn: g.cutterODIn as number,
    faceBasis: g.faceBasis,
    segments: c.segments.map(toDriveSegment),
    groundClasses: c.groundClasses,
    restartLow: g.restartLow,
    restartBase: g.restartBase,
    restartHigh: g.restartHigh,
    faceMultLow: g.faceMultLow,
    faceMultBase: g.faceMultBase,
    faceMultHigh: g.faceMultHigh,
    capacities: g.capacities,
    ijsCapacityKips: g.ijsCapacityKips,
    ijsPlanned: g.ijsPlanned,
    pushbackRestraintKips: g.pushbackRestraintKips,
    warnUtilization: g.warnUtilization,
  };

  const faceStations: FaceStation[] = c.faceStations.map((fs) => {
    const soil = soilForStation(fs.stationFt, c.segments);
    return {
      stationFt: fs.stationFt,
      coverFt: fs.coverFt,
      gwAboveAxisFt: soil.gwAboveAxisFt ?? 0,
      gammaPcf: soil.gammaPcf as number,
      k0: soil.k0 as number,
      ka: soil.ka as number,
    };
  });
  const faceInputs: FaceInputs = {
    pipeODIn: g.pipeODIn as number,
    cutterODIn: g.cutterODIn as number,
    targetBasis: g.targetBasis,
    stations: faceStations,
    blowoutFactor: g.blowoutFactor,
    mtbmMinPsf: g.mtbmMinPsf,
    mtbmMaxPsf: g.mtbmMaxPsf,
  };

  const settleSegments: SettlementSegment[] = c.segments.map((s) => ({
    startFt: s.startFt,
    endFt: s.endFt,
    groundCls: s.groundCls,
    coverFt: s.coverFt as number,
    kParam: s.kParam,
    volumeLossPct: s.volumeLossPct,
    include: s.include,
  }));
  const settlementInputs: SettlementInputs = {
    cutterODIn: g.cutterODIn as number,
    pipeODIn: g.pipeODIn as number,
    volumeLossPct: g.volumeLossPct as number,
    settleLimitIn: g.settleLimitIn as number,
    slopeLimitDenom: g.slopeLimitDenom,
    segments: settleSegments,
    kLibrary: c.kLibrary,
    receptors: c.receptors,
    marginalFactor: g.marginalFactor,
  };

  return {
    jacking: computeJackingForce(jackingInputs),
    face: computeFacePressures(faceInputs),
    settlement: computeSettlement(settlementInputs),
  };
}
