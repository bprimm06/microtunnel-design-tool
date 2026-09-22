import { describe, it, expect } from 'vitest';
import {
  buildNLDEnvelope,
  buildNLDQueryString,
  parseNLDLines,
  fetchNLD,
  NldError,
} from './nld';
import { detectLeveeCrossings } from './crossings';
import type { Station } from '../geo/types';

function stations(): Station[] {
  return [0, 1, 2, 3, 4].map((i) => ({
    chainageFt: i * 100,
    lat: 40.7,
    lon: -73.98 + i * 0.001,
    groundElevFt: 10,
  }));
}

function nldGeoJSON() {
  // Embankment polyline crossing the alignment near lon -73.978 (~200 ft),
  // plus a far-away polyline that must not produce a crossing.
  return {
    type: 'FeatureCollection',
    features: [
      {
        properties: {
          OBJECTID: 101,
          SEGMENT_ID: 'S-101',
          SEGMENT_NAME: 'Brooklyn Left Bank Levee',
          SYSTEM_ID: '5205000903',
          SYSTEM_NAME: 'Greenpoint Levee System',
          STATES: 'NY',
          SPONSORS: 'City of New York',
        },
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [
              [-73.9785, 40.6995],
              [-73.9775, 40.7005],
            ],
          ],
        },
      },
      {
        properties: {
          OBJECTID: 102,
          SEGMENT_ID: 'S-102',
          SEGMENT_NAME: 'Far Away Levee',
          SYSTEM_ID: '5205000999',
          SYSTEM_NAME: 'Elsewhere System',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-74.5, 40.9],
            [-74.49, 40.91],
          ],
        },
      },
      {
        // Degenerate: single-point line — must be skipped.
        properties: { OBJECTID: 103 },
        geometry: { type: 'LineString', coordinates: [[-73.978, 40.7]] },
      },
    ],
  };
}

describe('buildNLDEnvelope', () => {
  it('expands the alignment bbox by the half-width', () => {
    const e = buildNLDEnvelope(stations(), 150);
    expect(e.xmin).toBeLessThan(-73.98);
    expect(e.xmax).toBeGreaterThan(-73.976);
    expect(e.ymin).toBeLessThan(40.7);
    expect(e.ymax).toBeGreaterThan(40.7);
  });
  it('throws on empty stations or bad half-width', () => {
    expect(() => buildNLDEnvelope([], 150)).toThrow(NldError);
    expect(() => buildNLDEnvelope(stations(), 0)).toThrow(NldError);
    expect(() => buildNLDEnvelope(stations(), NaN)).toThrow(NldError);
  });
});

describe('buildNLDQueryString', () => {
  it('produces an ArcGIS envelope query against the Embankments layer', () => {
    const qs = buildNLDQueryString(stations(), 150);
    expect(qs).toContain('esriGeometryEnvelope');
    expect(qs).toContain('f=geojson');
    expect(qs).toContain('SYSTEM_NAME');
    expect(qs).toContain('where=1%3D1');
  });
});

describe('parseNLDLines', () => {
  it('parses polylines and skips degenerate geometry', () => {
    const lines = parseNLDLines(nldGeoJSON());
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      objectId: 101,
      segmentId: 'S-101',
      segmentName: 'Brooklyn Left Bank Levee',
      systemId: '5205000903',
      systemName: 'Greenpoint Levee System',
    });
    expect(lines[0]!.lines).toHaveLength(1);
    expect(lines[1]!.lines).toHaveLength(1);
  });
  it('falls back gracefully on missing attributes', () => {
    const lines = parseNLDLines({ features: [{ properties: {}, geometry: undefined }] });
    expect(lines).toHaveLength(0);
  });
});

describe('detectLeveeCrossings', () => {
  it('station-references an intersecting embankment polyline', () => {
    const lines = parseNLDLines(nldGeoJSON());
    const crossings = detectLeveeCrossings(lines, stations());
    expect(crossings).toHaveLength(1);
    const c = crossings[0]!;
    expect(c.kind).toBe('levee');
    expect(c.id).toBe('nld/101');
    expect(c.name).toBe('Brooklyn Left Bank Levee');
    expect(c.detail).toContain('NLD Greenpoint Levee System');
    expect(c.detail).toContain('seg S-101');
    expect(c.detail).toContain('field verify');
    // Polyline crosses lon -73.9785..-73.9775 → stations ~150..250 ft.
    expect(c.stationFt).toBeGreaterThanOrEqual(100);
    expect(c.stationFt).toBeLessThanOrEqual(300);
  });
  it('falls back to system name when the segment name is missing', () => {
    const lines = parseNLDLines({
      features: [
        {
          properties: {
            OBJECTID: 201,
            SYSTEM_ID: '5205000903',
            SYSTEM_NAME: 'Greenpoint Levee System',
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [-73.9785, 40.6995],
              [-73.9775, 40.7005],
            ],
          },
        },
      ],
    });
    const crossings = detectLeveeCrossings(lines, stations());
    expect(crossings).toHaveLength(1);
    expect(crossings[0]!.name).toBe('Greenpoint Levee System');
  });
});

describe('fetchNLD', () => {
  it('fetches and parses with an injected fetch', async () => {
    const fake = async () =>
      new Response(JSON.stringify(nldGeoJSON()), { status: 200 });
    const lines = await fetchNLD(stations(), 150, fake as typeof fetch);
    expect(lines).toHaveLength(2);
  });
  it('throws NldError on network failure', async () => {
    const fake = async () => {
      throw new Error('boom');
    };
    await expect(fetchNLD(stations(), 150, fake as typeof fetch)).rejects.toThrow(NldError);
  });
  it('throws NldError on HTTP error', async () => {
    const fake = async () => new Response('nope', { status: 500 });
    await expect(fetchNLD(stations(), 150, fake as typeof fetch)).rejects.toThrow(NldError);
  });
});
