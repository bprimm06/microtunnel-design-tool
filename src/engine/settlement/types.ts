/**
 * Settlement module types — Microtunnel Design Tool.
 * Peck Gaussian-trough method, ASCE 36-15 §13.5. Units in field names.
 */

export type SettlementStatus = 'OK' | 'MARGINAL' | 'EXCEEDS LIMIT' | 'INPUT REQUIRED';
export type ReceptorStatus = SettlementStatus | 'OUTSIDE DRIVE';

/** Trough-width parameter library entry (K in i = K·z0). K is always an input. */
export interface TroughKEntry {
  cls: string;
  k: number;
}

export interface SettlementSegment {
  startFt: number;
  endFt: number;
  groundCls: string;
  /**
   * Crown cover, ft — use the MINIMUM cover within the segment (worst case),
   * matching surveyed-profile practice. Required.
   */
  coverFt?: number;
  /** Trough width parameter override; else looked up from kLibrary. */
  kParam?: number;
  /** Volume-loss % override; else the global volumeLossPct. */
  volumeLossPct?: number;
  include: boolean;
}

export interface Receptor {
  name: string;
  stationFt: number;
  /** Transverse offset from tunnel centerline, ft (absolute value used). */
  offsetFt: number;
  /** Settlement limit, in — defaults to the global settleLimitIn. */
  limitIn?: number;
}

export interface SettlementInputs {
  cutterODIn: number;
  pipeODIn: number;
  /** Ground volume loss, percent of excavated area. */
  volumeLossPct: number;
  /** Settlement limit, inches. */
  settleLimitIn: number;
  /** Slope limit denominator N in 1:N. Optional. */
  slopeLimitDenom?: number;
  segments: SettlementSegment[];
  kLibrary?: TroughKEntry[];
  receptors?: Receptor[];
  /** Marginal band divisor. Default 1.25 (ported from reference implementation). */
  marginalFactor?: number;
}

export interface SettlementSegmentResult {
  idx: number;
  startFt: number;
  endFt: number;
  coverFt: number;
  kParam: number;
  /** Depth from surface to tunnel axis, ft. */
  z0Ft: number;
  /** Trough width parameter i = K·z0, ft. */
  iFt: number;
  /** Settlement volume per foot of drive, ft²/ft. */
  vsFt2PerFt: number;
  sMaxIn: number;
  /** Maximum transverse slope (at x = i), ft/ft. */
  maxSlope: number;
  slopeDenom: number;
  /** Practical trough half-width 2.5i, ft. */
  halfWidthFt: number;
  settleRatio: number;
  slopeRatio: number;
  status: SettlementStatus;
  statusNote: string;
}

export interface ReceptorResult {
  name: string;
  stationFt: number;
  offsetFt: number;
  limitIn: number;
  segIdx: number;
  coverFt: number;
  iFt: number;
  sMaxLocalIn: number;
  settleIn: number;
  slope: number;
  slopeDenom: number;
  ratio: number;
  status: ReceptorStatus;
}

export interface SettlementResults {
  segments: SettlementSegmentResult[];
  excavatedAreaFt2: number;
  /** Geometric volume loss of the overcut annulus alone, % — VL below this warns. */
  annulusVolumeLossPct: number;
  govIdx: number;
  maxSettleIn: number;
  maxSlope: number;
  receptors: ReceptorResult[];
  /** Transverse trough at the governing segment, ±3i. */
  trough: { xFt: number; settleIn: number }[];
  alignmentStatus: SettlementStatus;
  warnings: string[];
}
