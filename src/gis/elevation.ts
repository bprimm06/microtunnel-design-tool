/**
 * USGS 3DEP ground elevations. Network lives here (like src/osm/overpass.ts);
 * the calc engines stay pure — fetched values enter as ordinary station
 * ground tagged '3dep' ("3DEP-derived — field verify").
 *
 * 3DEP (https://www.usgs.gov/3d-elevation-program) is the USGS national
 * elevation dataset: ~10 m (1/3 arc-second) over CONUS, orthometric heights
 * in NAVD88. The Elevation Point Query Service needs no key and serves
 * CORS `*`, so browser fetch works from the static build.
 */
export const EPQS_URL = 'https://epqs.nationalmap.gov/v1/json';
export const FETCH_TIMEOUT_MS = 15_000;
/** Politeness gap between point queries — the service is free and shared. */
export const REQUEST_GAP_MS = 250;

export class GisError extends Error {
  readonly code: 'GIS_NETWORK' | 'GIS_TIMEOUT' | 'GIS_RATE_LIMITED' | 'GIS_NO_DATA';
  constructor(code: GisError['code'], message: string) {
    super(message);
    this.name = 'GisError';
    this.code = code;
  }
}

/** Pure URL builder — the one thing unit tests can pin without network. */
export function buildEpqsUrl(lat: number, lon: number): string {
  const q = new URLSearchParams({
    x: String(lon),
    y: String(lat),
    units: 'Feet',
    wkid: '4326',
    includeDate: 'false',
  });
  return `${EPQS_URL}?${q.toString()}`;
}

/** Extract the elevation (feet, NAVD88) from an EPQS JSON payload. */
export function parseEpqsResponse(json: unknown): number {
  const value = (json as { value?: unknown } | null)?.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new GisError('GIS_NO_DATA', '3DEP returned no elevation for this location (outside coverage?).');
  }
  return value;
}

/** Single-point 3DEP query, feet NAVD88. Throws GisError. */
export async function fetchElevationFt(lat: number, lon: number): Promise<number> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(buildEpqsUrl(lat, lon), { signal: ctrl.signal });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new GisError('GIS_TIMEOUT', '3DEP query timed out — check the connection and retry.');
      }
      throw new GisError('GIS_NETWORK', `3DEP query failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (res.status === 429) {
      throw new GisError('GIS_RATE_LIMITED', '3DEP is rate-limiting us (429). Wait a minute and retry.');
    }
    if (!res.ok) {
      throw new GisError('GIS_NETWORK', `3DEP query failed with HTTP ${res.status}.`);
    }
    return parseEpqsResponse(await res.json());
  } finally {
    clearTimeout(timer);
  }
}

export interface StationPoint {
  chainageFt: number;
  lat: number;
  lon: number;
}

export interface GroundFetchResult {
  chainageFt: number;
  /** Set on success; absent when this station failed. */
  elevFt?: number;
  /** Human-readable reason when this station failed. */
  error?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch 3DEP ground for every station, sequentially with a politeness gap.
 * A failing station does not stop the run — its error is reported per
 * station so the user can retry or enter that value by hand.
 */
export async function fetchGroundForStations(
  stations: StationPoint[],
  onProgress?: (done: number, total: number) => void,
): Promise<GroundFetchResult[]> {
  const results: GroundFetchResult[] = [];
  for (let i = 0; i < stations.length; i++) {
    const s = stations[i]!;
    try {
      results.push({ chainageFt: s.chainageFt, elevFt: await fetchElevationFt(s.lat, s.lon) });
    } catch (e) {
      results.push({
        chainageFt: s.chainageFt,
        error: e instanceof GisError ? e.message : String(e),
      });
    }
    onProgress?.(i + 1, stations.length);
    if (i < stations.length - 1) await sleep(REQUEST_GAP_MS);
  }
  return results;
}
