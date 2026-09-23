/**
 * Stationing — pure geospatial core. Builds a chainaged station table from
 * KML vertices. Distances are geodesic (Turf); meters → feet uses the exact
 * 3.28084 factor (1 ft = 0.3048 m by definition).
 */
import { distance, along, lineString } from '@turf/turf';
import type { AlignmentGeometry, GroundSource, KmlVertex, Station } from './types';
import { ImportError } from '../io/kmz-errors';

export const M_TO_FT = 3.28084;
export const DEFAULT_STATION_INTERVAL_FT = 25;

function vertexDistanceFt(a: KmlVertex, b: KmlVertex): number {
  return distance([a.lon, a.lat], [b.lon, b.lat], { units: 'meters' }) * M_TO_FT;
}

/** Cumulative chainage (feet) at each vertex. Exported for reference testing. */
export function computeVertexChainages(vertices: KmlVertex[]): number[] {
  const chainage: number[] = [0];
  for (let i = 1; i < vertices.length; i++) {
    chainage.push(chainage[i - 1]! + vertexDistanceFt(vertices[i - 1]!, vertices[i]!));
  }
  return chainage;
}

export interface StationBuild {
  stations: Station[];
  lengthFt: number;
  warnings: string[];
}

/**
 * Build stations at a fixed chainage interval along the vertex path.
 * Chainage 0 at the first vertex; the final vertex is always a station.
 *
 * groundSource 'kmz': working ground comes from KML vertex altitudes
 * (elevSource 'ge'), and the KMZ value is also retained as geGroundElevFt.
 * groundSource 'manual': stations get no ground — the user enters surveyed
 * elevations in the profile table.
 */
export function buildStations(
  vertices: KmlVertex[],
  intervalFt: number = DEFAULT_STATION_INTERVAL_FT,
  groundSource: GroundSource = 'kmz',
): StationBuild {
  if (vertices.length < 2) {
    throw new ImportError('EMPTY_LINESTRING', 'LineString has fewer than 2 vertices.');
  }
  if (!(intervalFt > 0)) {
    throw new ImportError('INVALID_COORDINATE', `Station interval must be positive, got ${intervalFt}.`);
  }

  // Cumulative chainage at each vertex.
  const vertexChainage = computeVertexChainages(vertices);
  const lengthFt = vertexChainage[vertexChainage.length - 1]!;
  if (lengthFt <= 0) {
    throw new ImportError('EMPTY_LINESTRING', 'LineString has zero length.');
  }

  // Chainages for densified stations.
  const chainages: number[] = [0];
  let c = intervalFt;
  while (c < lengthFt) {
    chainages.push(c);
    c += intervalFt;
  }
  if (chainages[chainages.length - 1]! < lengthFt) chainages.push(lengthFt);

  const line = lineString(vertices.map((v) => [v.lon, v.lat]));
  const valued = vertices
    .map((v, i) => ({ chainage: vertexChainage[i]!, altM: v.altM }))
    .filter((p) => p.altM !== undefined) as { chainage: number; altM: number }[];

  const warnings: string[] = [];
  const missingElev = vertices.some((v) => v.altM === undefined);
  if (groundSource === 'manual') {
    warnings.push(
      'Ground source: manual entry — enter surveyed ground elevations in the Profile tab station table.',
    );
  } else if (valued.length === 0) {
    warnings.push('No vertex altitudes found — stations have no ground elevation (GE-derived — field verify).');
  } else if (missingElev) {
    warnings.push('Some vertices lack altitude — elevations interpolated between valued neighbors.');
  }

  function elevAt(chainage: number): { groundElevFt?: number } {
    if (valued.length === 0) return {};
    const first = valued[0]!;
    const last = valued[valued.length - 1]!;
    if (chainage <= first.chainage) return { groundElevFt: first.altM * M_TO_FT };
    if (chainage >= last.chainage) return { groundElevFt: last.altM * M_TO_FT };
    for (let i = 1; i < valued.length; i++) {
      const prev = valued[i - 1]!;
      const next = valued[i]!;
      if (chainage <= next.chainage) {
        const t = (chainage - prev.chainage) / (next.chainage - prev.chainage);
        return { groundElevFt: (prev.altM + t * (next.altM - prev.altM)) * M_TO_FT };
      }
    }
    return {};
  }

  const stations: Station[] = chainages.map((chainage) => {
    const pt = along(line, chainage / M_TO_FT, { units: 'meters' });
    const [lon, lat] = pt.geometry.coordinates as [number, number];
    const st: Station = { chainageFt: chainage, lat, lon };
    if (groundSource === 'kmz') {
      const { groundElevFt } = elevAt(chainage);
      if (groundElevFt !== undefined) {
        st.groundElevFt = groundElevFt;
        st.geGroundElevFt = groundElevFt;
        st.elevSource = 'ge';
      }
    }
    return st;
  });

  return { stations, lengthFt, warnings };
}

export function buildAlignment(
  name: string,
  vertices: KmlVertex[],
  source: 'kmz' | 'kml',
  intervalFt: number = DEFAULT_STATION_INTERVAL_FT,
  groundSource: GroundSource = 'kmz',
): { alignment: AlignmentGeometry; warnings: string[] } {
  const { stations, lengthFt, warnings } = buildStations(vertices, intervalFt, groundSource);
  return { alignment: { name, stations, lengthFt, source }, warnings };
}

/**
 * Set (or clear) one station's working ground elevation. A typed value marks
 * the station user-entered (elevSource 'survey'); clearing restores the
 * retained KMZ value where one exists, otherwise leaves the station without
 * ground. Pure — the caller rebuilds the profile.
 */
export function setStationGround(
  stations: Station[],
  chainageFt: number,
  groundElevFt: number | undefined,
): Station[] {
  return stations.map((s) => {
    if (s.chainageFt !== chainageFt) return s;
    if (groundElevFt === undefined || !Number.isFinite(groundElevFt)) {
      if (s.geGroundElevFt !== undefined) {
        return { ...s, groundElevFt: s.geGroundElevFt, elevSource: 'ge' as const };
      }
      // No KMZ value to fall back to — drop the working ground entirely.
      const cleared: Station = { chainageFt: s.chainageFt, lat: s.lat, lon: s.lon };
      return cleared;
    }
    return { ...s, groundElevFt, elevSource: 'survey' as const };
  });
}

/**
 * Reset every station's working ground to its retained KMZ-derived value.
 * Stations imported without KMZ altitudes are left untouched. Pure.
 */
export function restoreGeGround(stations: Station[]): Station[] {
  return stations.map((s) =>
    s.geGroundElevFt !== undefined
      ? { ...s, groundElevFt: s.geGroundElevFt, elevSource: 'ge' as const }
      : s,
  );
}
