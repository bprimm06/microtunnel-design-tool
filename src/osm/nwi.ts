/**
 * NWI wetlands fetch: USFWS National Wetlands Inventory via the USGS-hosted
 * ArcGIS REST service. Pure builders + a thin fetch wrapper.
 *
 * Source: https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer
 * NWI data is community/aerial-imagery derived — always "NWI-derived — field verify."
 */
import type { Station } from '../geo/types';

export const NWI_QUERY_URL =
  'https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/0/query';

/** Fields we request — GeoJSON keys come back qualified (e.g. "Wetlands.ATTRIBUTE"). */
const NWI_OUT_FIELDS = ['Wetlands.ATTRIBUTE', 'Wetlands.WETLAND_TYPE', 'Wetlands.ACRES'].join(',');

export type NwiErrorCode = 'NO_ALIGNMENT' | 'NETWORK' | 'TIMEOUT' | 'BAD_RESPONSE';

export class NwiError extends Error {
  readonly code: NwiErrorCode;
  constructor(code: NwiErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'NwiError';
  }
}

export interface NWIFeature {
  objectId: number;
  attribute: string;
  wetlandType: string;
  acres: number;
  /** Outer rings of each polygon, [lon, lat] pairs. */
  rings: [number, number][][];
}

interface NWIGeoJSON {
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
export function buildNWIEnvelope(
  stations: Station[],
  halfWidthFt: number,
): { xmin: number; ymin: number; xmax: number; ymax: number } {
  if (stations.length === 0) throw new NwiError('NO_ALIGNMENT', 'No alignment stations.');
  if (!Number.isFinite(halfWidthFt) || halfWidthFt <= 0) {
    throw new NwiError('BAD_RESPONSE', 'Corridor half-width must be a positive number.');
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

export function buildNWIQueryString(
  stations: Station[],
  halfWidthFt: number,
): string {
  const e = buildNWIEnvelope(stations, halfWidthFt);
  const params = new URLSearchParams({
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
    outFields: NWI_OUT_FIELDS,
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
  });
  return params.toString();
}

function ringOf(coords: unknown): [number, number][] | null {
  if (!Array.isArray(coords) || coords.length < 4) return null;
  const ring: [number, number][] = [];
  for (const pt of coords) {
    if (!Array.isArray(pt) || typeof pt[0] !== 'number' || typeof pt[1] !== 'number') return null;
    ring.push([pt[0], pt[1]]);
  }
  return ring;
}

/** Parse NWI GeoJSON into features. Pure — no network. */
export function parseNWIFeatures(data: NWIGeoJSON): NWIFeature[] {
  const out: NWIFeature[] = [];
  for (const f of data.features ?? []) {
    const p = f?.properties ?? {};
    const g = f?.geometry;
    if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) continue;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    const rings: [number, number][][] = [];
    if (Array.isArray(polys)) {
      for (const poly of polys) {
        if (!Array.isArray(poly) || poly.length === 0) continue;
        const ring = ringOf(poly[0]);
        if (ring) rings.push(ring);
      }
    }
    if (rings.length === 0) continue;
    const objectId = num(p['Wetlands.OBJECTID'] ?? p['OBJECTID']);
    out.push({
      objectId,
      attribute: str(p['Wetlands.ATTRIBUTE']) || 'unknown',
      wetlandType: str(p['Wetlands.WETLAND_TYPE']) || 'wetland',
      acres: num(p['Wetlands.ACRES']),
      rings,
    });
  }
  return out;
}

export async function fetchNWI(
  stations: Station[],
  halfWidthFt: number,
  fetchFn: typeof fetch = fetch,
): Promise<NWIFeature[]> {
  const qs = buildNWIQueryString(stations, halfWidthFt);
  let res: Response;
  try {
    res = await fetchFn(`${NWI_QUERY_URL}?${qs}`, { signal: AbortSignal.timeout(45000) });
  } catch (e) {
    throw new NwiError(
      'NETWORK',
      `NWI request failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (!res.ok) throw new NwiError('NETWORK', `NWI service returned HTTP ${res.status}.`);
  let data: NWIGeoJSON;
  try {
    data = (await res.json()) as NWIGeoJSON;
  } catch {
    throw new NwiError('BAD_RESPONSE', 'NWI service returned an unreadable response.');
  }
  if (!data || !Array.isArray(data.features)) {
    throw new NwiError('BAD_RESPONSE', 'NWI service returned an unexpected response shape.');
  }
  return parseNWIFeatures(data);
}
