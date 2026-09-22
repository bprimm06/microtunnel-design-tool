/**
 * Face-pressure module types — Microtunnel Design Tool.
 * ASCE 36-15 §13.4 basis. All units US customary; units live in field names.
 */

export type LateralBasis = 'at-rest' | 'active';
export type StationStatus = 'OK' | 'REVIEW' | 'ERROR' | 'INPUT REQUIRED';

/** One station along the drive where face pressure is evaluated. */
export interface FaceStation {
  /** Station along alignment, ft. */
  stationFt: number;
  /** Crown cover, ft. Required. */
  coverFt?: number;
  /** Groundwater head above tunnel axis, ft. Default 0. */
  gwAboveAxisFt?: number;
  /** Total unit weight of ground, pcf. Required. */
  gammaPcf?: number;
  /** At-rest lateral earth pressure coefficient. Required. */
  k0?: number;
  /** Active lateral earth pressure coefficient. Required. */
  ka?: number;
}

export interface FaceInputs {
  pipeODIn: number;
  cutterODIn: number;
  /** Lateral basis for the operating target: 'at-rest' (K0, default, conservative). */
  targetBasis: LateralBasis;
  stations: FaceStation[];
  /**
   * Blowout/heave guard factor × total overburden at axis.
   * HEURISTIC — TODO(source needed): ASCE 36-15 states no blowout formula.
   * Confirm with the project geotechnical engineer. Default 1.0.
   */
  blowoutFactor?: number;
  /** MTBM deliverable pressure limits, psf. Optional; checked when provided. */
  mtbmMinPsf?: number;
  mtbmMaxPsf?: number;
}

export interface FaceStationResult {
  stationFt: number;
  coverFt: number;
  status: StationStatus;
  statusNote: string;
  uPsf: number;
  sigmaVEffPsf: number;
  sigmaVTotalPsf: number;
  /** Minimum stable face pressure = u + Ka·σ'v (§13.4). */
  minStablePsf: number;
  /** Recommended operating target = u + K·σ'v (K per targetBasis, §13.4). */
  targetPsf: number;
  /** Blowout guard = blowoutFactor × σv,total (heuristic, TODO(source needed)). */
  maxBlowoutPsf: number;
  /** Target face force, kips — ties to the U7 jacking FP component. */
  targetForceKips: number;
}

export interface FaceResults {
  stations: FaceStationResult[];
  alignmentStatus: StationStatus;
  /** Governing (maximum) target pressure and where it occurs. */
  governingTargetPsf: number;
  governingStationFt: number;
  warnings: string[];
}
