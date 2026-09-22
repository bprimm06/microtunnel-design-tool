/**
 * Jacking engine types — Microtunnel Design Tool.
 * ASCE 36-15 basis. All units US customary; units live in field names.
 */

export type FrictionMode = 'tabulated' | 'arching' | 'buoyant';
export type LateralBasis = 'at-rest' | 'active';
export type RowStatus = 'OK' | 'REVIEW' | 'ERROR' | 'INPUT REQUIRED';

/** Ground-class friction library entry (tabulated mode). Unit skin friction, psf. */
export interface GroundClassEntry {
  cls: string;
  fLowPsf: number;
  fBasePsf: number;
  fHighPsf: number;
}

export interface DriveSegment {
  startFt: number;
  endFt: number;
  groundCls: string;
  /** Total unit weight of ground, pcf. */
  gammaPcf: number;
  /** Crown cover, ft. Required. */
  coverFt?: number;
  /** Groundwater head above tunnel axis, ft. Default 0. */
  gwAboveAxisFt?: number;
  /** At-rest lateral earth pressure coefficient. Required for face calc. */
  k0?: number;
  /** Active lateral earth pressure coefficient. Required when faceBasis = 'active'. */
  ka?: number;
  frictionMode: FrictionMode;
  /* tabulated mode: unit skin friction overrides (else from ground class) */
  fLowPsf?: number;
  fBasePsf?: number;
  fHighPsf?: number;
  /* arching mode (§13.3/§13.4) */
  phiResidualDeg?: number;
  cohesionPsf?: number;
  /** 0..1 multiplier on μ' for lubrication benefit (§13.4). Default 1. */
  lubricationReduction?: number;
  /* buoyant mode (§13.4: very stiff/hard clay, rock) */
  pipeBuoyantWeightPlf?: number;
  muPrime?: number;
  /** Curve multiplier on friction, >= 1 (§13.4). Default 1. */
  curveFactor?: number;
  /** Curve radius, ft — informational; triggers REVIEW when curveFactor <= 1. */
  radiusFt?: number;
  include: boolean;
}

export interface CapacityCheck {
  name: string;
  capacityKips?: number;
  owner: string;
}

export interface JackingInputs {
  pipeODIn: number;
  cutterODIn: number;
  /** 'at-rest' (K0, default, conservative) or 'active' (Ka) — §13.4. */
  faceBasis: LateralBasis;
  segments: DriveSegment[];
  groundClasses: GroundClassEntry[];
  /** Breakout/restart multipliers, engineering judgment. Default 1. */
  restartLow?: number;
  restartBase?: number;
  restartHigh?: number;
  /** Face-force multipliers. Default 1. */
  faceMultLow?: number;
  faceMultBase?: number;
  faceMultHigh?: number;
  /** First entry should be the pipe/joint system allowable (drives IJS math). */
  capacities: CapacityCheck[];
  ijsCapacityKips?: number;
  ijsPlanned?: boolean;
  /** Brake/clamp restraint against face-pressure pushback (§13.4). */
  pushbackRestraintKips?: number;
  /** Utilization warning threshold. Default 0.85. */
  warnUtilization?: number;
}

export interface SegmentResult {
  idx: number;
  startFt: number;
  endFt: number;
  lenFt: number;
  coverFt: number;
  frictionMode: FrictionMode;
  status: RowStatus;
  statusNote: string;
  /** Face pressure component for this segment, kips (§13.4). */
  faceKips: number;
  fricLowKips: number;
  fricBaseKips: number;
  fricHighKips: number;
  cumLowKips: number;
  cumBaseKips: number;
  cumHighKips: number;
  /** Totals incl. face × faceMult and restart multiplier, kips. */
  totalLowKips: number;
  totalBaseKips: number;
  totalHighKips: number;
  /** Diagnostic: normal stress used, psf. */
  sigmaNPsf: number;
  /** Diagnostic: effective friction factor used. */
  muPrimeUsed: number;
}

export interface CapacityResult extends CapacityCheck {
  utilBase: number;
  utilHigh: number;
  status: 'OK' | 'ELEVATED UTILIZATION' | 'EXCEEDS CAPACITY' | 'INPUT REQUIRED';
}

export interface JackingResults {
  rows: SegmentResult[];
  driveLengthFt: number;
  maxFaceKips: number;
  /** Governing high friction rate, kips/ft (incl. restart high). */
  maxFricRateHighKpf: number;
  maxLowKips: number;
  maxBaseKips: number;
  maxHighKips: number;
  govRowIdx: number;
  alignmentStatus: RowStatus;
  capacities: CapacityResult[];
  ijs: {
    firstStationFt: number;
    spacingFt: number;
    count: number;
    screen: string;
  };
  pushback: {
    pushbackKips: number;
    status: 'OK' | 'EXCEEDS RESTRAINT' | 'RESTRAINT NOT PROVIDED';
  };
  warnings: string[];
}
