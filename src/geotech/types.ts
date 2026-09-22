/**
 * Geotech types — borings and strata.
 * Units: feet in field names (US customary). CRS: WGS84 lat/lon.
 */

export interface Stratum {
  /** Depth below ground surface to top of layer, feet. */
  topDepthFt: number;
  /** Depth below ground surface to bottom of layer, feet. */
  bottomDepthFt: number;
  description: string;
}

export type BoringDepthSource = 'rule' | 'override' | 'manual';

export interface Boring {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Projected chainage on the alignment, feet. */
  stationFt: number;
  /** Transverse distance from the alignment, feet. */
  offsetFt: number;
  /** Ground elevation at the boring, feet (when known). */
  groundElevFt?: number;
  /** Termination depth below ground surface, feet. */
  depthFt: number;
  depthSource: BoringDepthSource;
  /** Human-readable derivation, e.g. "invert depth 34.2 ft + 20 ft = 54.2 ft @ 12+50". */
  depthDerivation: string;
  strata: Stratum[];
}

export type BoringErrorCode =
  | 'NO_ALIGNMENT'
  | 'NO_PROFILE'
  | 'INVALID_STRATA'
  | 'INVALID_DEPTH';

export class BoringError extends Error {
  readonly code: BoringErrorCode;
  constructor(code: BoringErrorCode, message: string) {
    super(message);
    this.name = 'BoringError';
    this.code = code;
  }
}
