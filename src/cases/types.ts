/**
 * Calculation case types — named input sets that wire the profile/geotech
 * data into the U7 (jacking), U8 (face pressure), and U9 (settlement) engines.
 * Units live in field names (US customary).
 */
import type {
  FrictionMode,
  LateralBasis,
  CapacityCheck,
  GroundClassEntry,
} from '../engine/jacking/types';
import type { TroughKEntry, Receptor } from '../engine/settlement/types';

/** One drive segment — the shared subdivision all three engines map from. */
export interface CaseSegment {
  startFt: number;
  endFt: number;
  groundCls: string;
  /** Total unit weight of ground, pcf. Required. */
  gammaPcf?: number;
  /** At-rest lateral coefficient. Required. */
  k0?: number;
  /** Active lateral coefficient. Required (face min-stable uses Ka). */
  ka?: number;
  /** Groundwater head above tunnel axis, ft. Default 0. */
  gwAboveAxisFt?: number;
  /** Crown cover, ft. Auto = minimum cover in range; editable. Required. */
  coverFt?: number;
  frictionMode: FrictionMode;
  /* tabulated mode: unit skin friction (else looked up from groundClasses) */
  fLowPsf?: number;
  fBasePsf?: number;
  fHighPsf?: number;
  /* arching mode */
  phiResidualDeg?: number;
  cohesionPsf?: number;
  /** 0..1 multiplier on μ' for lubrication. Default 1. */
  lubricationReduction?: number;
  /* buoyant mode */
  pipeBuoyantWeightPlf?: number;
  muPrime?: number;
  /** Curve multiplier on friction, >= 1. Default 1. */
  curveFactor?: number;
  radiusFt?: number;
  /* settlement */
  /** Trough width parameter override; else kLibrary lookup. */
  kParam?: number;
  /** Volume-loss % override; else the global volumeLossPct. */
  volumeLossPct?: number;
  include: boolean;
}

/** Case-level globals shared by the engines. */
export interface CaseGlobals {
  pipeODIn?: number;
  /** Cutter OD must exceed pipe OD (face engine warns otherwise). Required. */
  cutterODIn?: number;
  faceBasis: LateralBasis;
  targetBasis: LateralBasis;
  restartLow?: number;
  restartBase?: number;
  restartHigh?: number;
  faceMultLow?: number;
  faceMultBase?: number;
  faceMultHigh?: number;
  capacities: CapacityCheck[];
  ijsCapacityKips?: number;
  ijsPlanned?: boolean;
  pushbackRestraintKips?: number;
  warnUtilization?: number;
  /**
   * Blowout guard factor × total overburden. HEURISTIC — TODO(source needed):
   * ASCE 36-15 states no blowout formula. Default 1.0.
   */
  blowoutFactor?: number;
  mtbmMinPsf?: number;
  mtbmMaxPsf?: number;
  /** Ground volume loss, % of excavated area. Required. */
  volumeLossPct?: number;
  /** Settlement limit, in. Required. */
  settleLimitIn?: number;
  slopeLimitDenom?: number;
  marginalFactor?: number;
}

/** Face-pressure station baked into the case; soil inherited from segments at run. */
export interface CaseFaceStation {
  stationFt: number;
  coverFt: number;
}

export interface CalcCase {
  id: string;
  name: string;
  createdAt: string;
  /** JSON of {pipeODFt, controls, stationCount} — stale banner when live profile differs. */
  profileFingerprint: string;
  stationStartFt: number;
  stationEndFt: number;
  globals: CaseGlobals;
  segments: CaseSegment[];
  /** Tabulated friction library — project geotechnical input, starts empty. */
  groundClasses: GroundClassEntry[];
  /** Trough-K library — project geotechnical input, starts empty. */
  kLibrary: TroughKEntry[];
  faceStations: CaseFaceStation[];
  receptors: Receptor[];
}

export type CaseErrorCode =
  | 'NO_SEGMENTS'
  | 'MISSING_REQUIRED'
  | 'NO_FACE_STATIONS';

export class CaseError extends Error {
  readonly code: CaseErrorCode;
  constructor(code: CaseErrorCode, message: string) {
    super(message);
    this.name = 'CaseError';
    this.code = code;
  }
}
