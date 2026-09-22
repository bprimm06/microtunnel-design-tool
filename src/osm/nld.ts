/**
 * NLD levee fetch: USACE National Levee Database via the public ArcGIS REST
 * FeatureServer. Pure builders + a thin fetch wrapper.
 *
 * Source: https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/NLD2_PUBLIC_v1/FeatureServer
 * Layer 10 = Embankments (levee centerline segments, polylines).
 * NLD data is a national inventory — always "NLD-derived — field verify."
 */
import type { Station } from '../geo/types';

export const NLD_QUERY_URL =
  'https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/NLD2_PUBLIC_v1/FeatureServer/10/query';

/** Narrow explicit field list — never `*` (avoids the SE_ANNO_CAD_DATA blob). */
const NLD_OUT_FIELDS = [
  'OBJECTID',
  'SEGMENT_ID',
  'SEGMENT_NAME',
  'SYSTEM_ID',
  'SYSTEM_NAME',
  'STATES',
  'SPONSORS',
].join(',');

export type NldErrorCode = 'NO_ALIGNMENT' | 'NETWORK' | 'TIMEOUT' | 'BAD_RESPONSE';

export class NldError extends Error {
  readonly code: NldErrorCode;
  constructor(code: NldErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'NldError';
  }
}

export interface NLDLine {
  objectId: number;
  segmentId: string;
  segmentName: string;
  systemId: string;
  systemName: string;
  states: string;
  sponsors: string;
  /** Polyline coords, [lon, lat] pairs. */
  lines: [number, number][][];
}

interface NLDGeoJSON {
  type?: string;
  features?: {
    properties?: Record<string, unknown>;
    geometry?: { type?: string; coordinates?: unknown };
  }[];
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Bounding envelope of the alignment, expanded by halfWidthFt. Degrees. */
export function buildNLDEnvelope(
  stations: Station[],
  halfWidthFt: number,
): { xmin: number; ymin: number; xmax: number; ymax: number } {
  if (stations.length === 0) throw new NldError('NO_ALIGNMENT', 'No alignment stations.');
  if (!Number.isFinite(halfWidthFt) || halfWidthFt <= 0) {
    throw new NldError('BAD_RESPONSE', 'Corridor half-width must be a positive number.');
  }
  let xmin = Infinity;
  let ymin = Infinity;
  let xmax = -Infinity;
  let ymax = -Infinity;
  for (const s of stations) {
    xmin = Math.min(xmin, s.lon);
    xmax = Math.max(xmax, s.lon);
    ymin = Math.min(ymin, s.lat);
    ymax = Math.max(ymax, s.lat);
  }
  // Feet → degrees, latitude-scaled for longitude.
  const midLat = (ymin + ymax) / 2;
  const dLat = halfWidthFt / 364000;
  const dLon = halfWidthFt / (364000 * Math.max(0.2, Math.cos((midLat * Math.PI) / 180)));
  return { xmin: xmin - dLon, ymin: ymin - dLat, xmax: xmax + dLon, ymax: ymax + dLat };
}

export function buildNLDQueryString(
  stations: Station[],
  halfWidthFt: number,
): string {
  const e = buildNLDEnvelope(stations, halfWidthFt);
  const params = new URLSearchParams({
    where: '1=1',
    geometry: JSON.stringify({
      xmin: e.xmin,
      ymin: e.ymin,
      xmax: e.xmax,
      ymax: e.ymax,
      spatialReference: { wkid: 4326 },
    }),
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: NLD_OUT_FIELDS,
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
  });
  return params.toString();
}

function lineOf(coords: unknown): [number, number][] | null {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const line: [number, number][] = [];
  for (const pt of coords) {
    if (!Array.isArray(pt) || typeof pt[0] !== 'number' || typeof pt[1] !== 'number') return null;
    line.push([pt[0], pt[1]]);
  }
  return line;
}

/** Parse NLD GeoJSON into embankment lines. Pure — no network. */
export function parseNLDLines(data: NLDGeoJSON): NLDLine[] {
  const out: NLDLine[] = [];
  for (const f of data.features ?? []) {
    const p = f?.properties ?? {};
    const g = f?.geometry;
    if (!g || (g.type !== 'LineString' && g.type !== 'MultiLineString')) continue;
    const parts = g.type === 'LineString' ? [g.coordinates] : g.coordinates;
    const lines: [number, number][][] = [];
    if (Array.isArray(parts)) {
      for (const part of parts) {
        const line = lineOf(part);
        if (line) lines.push(line);
      }
    }
    if (lines.length === 0) continue;
    out.push({
      objectId: num(p['OBJECTID']),
      segmentId: str(p['SEGMENT_ID']),
      segmentName: str(p['SEGMENT_NAME']),
      systemId: str(p['SYSTEM_ID']),
      systemName: str(p['SYSTEM_NAME']),
      states: str(p['STATES']),
      sponsors: str(p['SPONSORS']),
      lines,
    });
  }
  return out;
}

export async function fetchNLD(
  stations: Station[],
  halfWidthFt: number,
  fetchFn: typeof fetch = fetch,
): Promise<NLDLine[]> {
  const qs = buildNLDQueryString(stations, halfWidthFt);
  let res: Response;
  try {
    res = await fetchFn(`${NLD_QUERY_URL}?${qs}`, { signal: AbortSignal.timeout(45000) });
  } catch (e) {
    throw new NldError(
      'NETWORK',
      `NLD request failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (!res.ok) throw new NldError('NETWORK', `NLD service returned HTTP ${res.status}.`);
  let data: NLDGeoJSON;
  try {
    data = (await res.json()) as NLDGeoJSON;
  } catch {
    throw new NldError('BAD_RESPONSE', 'NLD service returned an unreadable response.');
  }
  if (!data || !Array.isArray(data.features)) {
    throw new NldError('BAD_RESPONSE', 'NLD service returned an unexpected response shape.');
  }
  return parseNLDLines(data);
}
