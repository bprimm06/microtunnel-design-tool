/**
 * Overpass API access. Pure query/corridor builders + a thin fetch wrapper.
 * Queries run client-side (the app is a static build); overpass-api.de serves
 * CORS `*`, so browser fetch works.
 */
import { buffer, simplify, lineString } from '@turf/turf';
import type { Station } from '../geo/types';
import { OsmError } from './types';
import type { OverpassResponse } from './types';

export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
export const FETCH_TIMEOUT_MS = 60_000;
/** Default corridor half-width, ft. User-settable; a display default, not engineering. */
export const DEFAULT_CORRIDOR_HALF_WIDTH_FT = 150;

/**
 * Corridor polygon around the alignment as an Overpass `poly:"lat lon …"`
 * filter string. Buffer in meters, then simplify to keep the query small.
 */
export function corridorPolyFilter(stations: Station[], halfWidthFt: number): string {
  if (stations.length < 2) {
    throw new OsmError('NO_ALIGNMENT', 'Need at least two alignment stations for a corridor.');
  }
  const line = lineString(stations.map((s) => [s.lon, s.lat]));
  const buffered = buffer(line, (halfWidthFt * 0.3048), { units: 'meters' });
  if (!buffered) {
    throw new OsmError('NO_ALIGNMENT', 'Could not build a corridor polygon.');
  }
  const simple = simplify(buffered, { tolerance: 0.00005, highQuality: false });
  const ring = simple.geometry.coordinates[0] as [number, number][];
  return ring.map(([lon, lat]) => `${lat.toFixed(6)} ${lon.toFixed(6)}`).join(' ');
}

/** Build the Overpass QL query for the five feature classes. */
export function buildOverpassQuery(polyFilter: string): string {
  const selectors = [
    '["highway"]',
    '["railway"]',
    '["waterway"]',
    '["building"]',
    '["power"="line"]',
    '["man_made"="pipeline"]',
  ];
  const parts = selectors.map((sel) => `way(poly:"${polyFilter}")${sel};`).join('\n  ');
  return `[out:json][timeout:60];\n(\n  ${parts}\n);\nout geom;`;
}

/** GET the query (Overpass accepts GET; avoids POST body issues on some networks). */
export async function fetchOverpass(query: string): Promise<OverpassResponse> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, {
      signal: ctrl.signal,
    });
    if (res.status === 429) {
      throw new OsmError('RATE_LIMITED', 'Overpass is rate-limiting us (429). Wait a minute and retry.');
    }
    if (res.status === 504 || res.status === 509) {
      throw new OsmError('TIMEOUT', 'Overpass timed out on this corridor — try a narrower corridor.');
    }
    if (!res.ok) {
      throw new OsmError('NETWORK', `Overpass request failed (HTTP ${res.status}).`);
    }
    const json = (await res.json()) as Partial<OverpassResponse>;
    if (!json || !Array.isArray(json.elements)) {
      throw new OsmError('BAD_RESPONSE', 'Overpass returned an unexpected response shape.');
    }
    return json as OverpassResponse;
  } catch (e) {
    if (e instanceof OsmError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new OsmError('TIMEOUT', 'Overpass query timed out after 60 s — try a narrower corridor.');
    }
    throw new OsmError('NETWORK', `Overpass request failed: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    clearTimeout(timer);
  }
}
