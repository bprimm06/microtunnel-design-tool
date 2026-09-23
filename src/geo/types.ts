/**
 * Geospatial types — first slice of the U2 data model.
 * CRS: WGS84 lat/lon internally. Units: US customary (feet) in field names.
 */

/** Provenance of an elevation value. */
export type ElevSource = 'ge' | 'survey' | '3dep' | 'unknown';

/** Ground-elevation source chosen at KMZ/KML import. UI setting only — not serialized. */
export type GroundSource = 'kmz' | 'manual';

export interface GeoPoint {
  lat: number;
  lon: number;
  /** Ground elevation, feet. */
  elevFt?: number;
  elevSource?: ElevSource;
}

/** A raw alignment vertex as extracted from KML (altitude still in meters). */
export interface KmlVertex {
  lon: number;
  lat: number;
  /** Altitude as written in the KML, meters. */
  altM?: number;
}

export interface Station {
  /** Chainage from alignment start, feet. */
  chainageFt: number;
  lat: number;
  lon: number;
  /** Ground-surface elevation, feet. */
  groundElevFt?: number;
  elevSource?: ElevSource;
  /**
   * KMZ/Google-Earth-derived ground elevation, feet. Retained at import even
   * when the working ground is overridden — enables one-click restore.
   */
  geGroundElevFt?: number;
}

export interface AlignmentGeometry {
  name: string;
  stations: Station[];
  /** Total length, feet. */
  lengthFt: number;
  source: 'kmz' | 'kml';
}

export interface KmlWaypoint extends GeoPoint {
  name: string;
}

export interface ImportResult {
  alignments: AlignmentGeometry[];
  waypoints: KmlWaypoint[];
  warnings: string[];
}

/** A designer-defined vertical-alignment control point. */
export interface ProfileControlPoint {
  /** Chainage along the alignment, feet. */
  stationFt: number;
  /** Tunnel invert elevation at this station, feet. */
  invertElevFt: number;
}

export interface ProfileInput {
  controlPoints: ProfileControlPoint[];
  /** Pipe outside diameter, feet (crown = invert + OD). */
  pipeODFt: number;
}

/** A station with the tunnel vertical alignment resolved. */
export interface ProfileStation extends Station {
  /** Tunnel invert elevation, feet. */
  invertElevFt: number;
  /** Tunnel crown elevation (invert + OD), feet. */
  crownElevFt: number;
  /** Cover: ground − crown, feet. Undefined where ground is unknown. */
  coverFt?: number;
  /** Depth: ground − invert, feet. Undefined where ground is unknown. */
  depthToInvertFt?: number;
}

export type ProfileWarningCode =
  | 'CLAMPED_CONTROL_POINT'
  | 'NEGATIVE_COVER'
  | 'SHALLOW_COVER'
  | 'MISSING_GROUND_ELEV';

export interface ProfileWarning {
  code: ProfileWarningCode;
  message: string;
  /** Chainage of the worst-affected station, when applicable. */
  stationFt?: number;
}

export interface ProfileResult {
  stations: ProfileStation[];
  warnings: ProfileWarning[];
}
