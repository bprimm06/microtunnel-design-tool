/**
 * OSM crossing types. Units in field names (feet); CRS WGS84 lat/lon.
 * OSM data is community-sourced — always labeled "OSM-derived — field verify."
 */

export type CrossingKind = 'road' | 'rail' | 'water' | 'building' | 'utility' | 'wetland' | 'levee';

export interface Crossing {
  id: string;
  kind: CrossingKind;
  /** "I-10", "Brays Bayou", "unnamed road". */
  name: string;
  /** Raw tag detail, e.g. "highway=motorway". */
  detail: string;
  stationFt: number;
  offsetFt: number;
  lat: number;
  lon: number;
  osmType: string;
  osmId: number;
}

export type OsmErrorCode =
  | 'NO_ALIGNMENT'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'BAD_RESPONSE';

export class OsmError extends Error {
  readonly code: OsmErrorCode;
  constructor(code: OsmErrorCode, message: string) {
    super(message);
    this.name = 'OsmError';
    this.code = code;
  }
}

/** Minimal Overpass JSON shapes we consume. */
export interface OverpassElement {
  type: 'way' | 'node' | 'relation';
  id: number;
  tags?: Record<string, string>;
  /** Present with `out geom` on ways. */
  geometry?: { lat: number; lon: number }[];
}

export interface OverpassResponse {
  elements: OverpassElement[];
}
