import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  buildEpqsUrl,
  fetchElevationFt,
  fetchGroundForStations,
  GisError,
  parseEpqsResponse,
} from './elevation';

describe('buildEpqsUrl', () => {
  it('builds a Feet/WGS84 point query', () => {
    const url = buildEpqsUrl(40.7, -73.99);
    expect(url).toContain('https://epqs.nationalmap.gov/v1/json?');
    expect(url).toContain('units=Feet');
    expect(url).toContain('wkid=4326');
    expect(url).toContain('x=-73.99');
    expect(url).toContain('y=40.7');
  });
});

describe('parseEpqsResponse', () => {
  it('extracts the elevation value', () => {
    expect(parseEpqsResponse({ value: 68.14 })).toBeCloseTo(68.14, 6);
  });
  it('throws GIS_NO_DATA on a null value (outside coverage)', () => {
    try {
      parseEpqsResponse({ value: null });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(GisError);
      expect((e as GisError).code).toBe('GIS_NO_DATA');
    }
  });
  it('throws GIS_NO_DATA on a malformed payload', () => {
    expect(() => parseEpqsResponse({})).toThrowError(GisError);
    expect(() => parseEpqsResponse(null)).toThrowError(GisError);
  });
});

describe('fetchElevationFt (mocked fetch)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ value: 68.14 }), { status: 200 })),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the parsed elevation', async () => {
    await expect(fetchElevationFt(40.7, -73.99)).resolves.toBeCloseTo(68.14, 6);
  });

  it('maps 429 to GIS_RATE_LIMITED', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('slow down', { status: 429 })));
    await expect(fetchElevationFt(40.7, -73.99)).rejects.toMatchObject({ code: 'GIS_RATE_LIMITED' });
  });

  it('maps a dead network to GIS_NETWORK', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    await expect(fetchElevationFt(40.7, -73.99)).rejects.toMatchObject({ code: 'GIS_NETWORK' });
  });
});

describe('fetchGroundForStations (mocked fetch)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports progress and keeps going past a failed station', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls++;
        if (calls === 2) return new Response(JSON.stringify({ value: null }), { status: 200 });
        return new Response(JSON.stringify({ value: 10 * calls }), { status: 200 });
      }),
    );
    const progress: [number, number][] = [];
    const results = await fetchGroundForStations(
      [
        { chainageFt: 0, lat: 40.7, lon: -73.99 },
        { chainageFt: 25, lat: 40.7001, lon: -73.99 },
        { chainageFt: 50, lat: 40.7002, lon: -73.99 },
      ],
      (done, total) => progress.push([done, total]),
    );
    expect(results).toHaveLength(3);
    expect(results[0]!.elevFt).toBeCloseTo(10, 6);
    expect(results[1]!.elevFt).toBeUndefined();
    expect(results[1]!.error).toMatch(/no elevation/i);
    expect(results[2]!.elevFt).toBeCloseTo(30, 6);
    expect(progress).toEqual([[1, 3], [2, 3], [3, 3]]);
  });
});
