import { describe, it, expect } from 'vitest';
import {
  buildNWIEnvelope,
  buildNWIQueryString,
  parseNWIFeatures,
  fetchNWI,
  NwiError,
} from './nwi';
import { detectWetlandCrossings, mergeCrossings } from './crossings';
import type { Station } from '../geo/types';
import type { Crossing } from './types';

function stations(): Station[] {
  return [0, 1, 2, 3, 4].map((i) => ({
    chainageFt: i * 100,
    lat: 40.7,
    lon: -73.98 + i * 0.001,
    groundElevFt: 10,
  }));
}

function nwiGeoJSON() {
  // Polygon straddling the alignment near lon -73.978 (station ~200 ft),
  // plus a far-away polygon that must not produce a crossing.
  return {
    type: 'FeatureCollection',
    features: [
      {
        properties: {
          'Wetlands.OBJECTID': 42,
          'Wetlands.ATTRIBUTE': 'PEM1A',
          'Wetlands.WETLAND_TYPE': 'Freshwater Emergent Wetland',
          'Wetlands.ACRES': 3.25,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.9785, 40.6995],
              [-73.9775, 40.6995],
              [-73.9775, 40.7005],
              [-73.9785, 40.7005],
              [-73.9785, 40.6995],
            ],
          ],
        },
      },
      {
        properties: {
          'Wetlands.OBJECTID': 43,
          'Wetlands.ATTRIBUTE': 'PFO1A',
          'Wetlands.WETLAND_TYPE': 'Freshwater Forested/Shrub Wetland',
          'Wetlands.ACRES': 1.0,
        },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [-74.5, 40.9],
                [-74.49, 40.9],
                [-74.49, 40.91],
                [-74.5, 40.91],
                [-74.5, 40.9],
              ],
            ],
          ],
        },
      },
      {
        // Degenerate: no usable geometry — must be skipped.
        properties: { 'Wetlands.OBJECTID': 44, 'Wetlands.ATTRIBUTE': 'PEM1A' },
        geometry: { type: 'Polygon', coordinates: [] },
      },
    ],
  };
}

describe('buildNWIEnvelope', () => {
  it('expands the alignment bbox by the half-width', () => {
    const e = buildNWIEnvelope(stations(), 150);
    expect(e.xmin).toBeLessThan(-73.98);
    expect(e.xmax).toBeGreaterThan(-73.976);
    expect(e.ymin).toBeLessThan(40.7);
    expect(e.ymax).toBeGreaterThan(40.7);
  });
  it('throws on empty stations or bad half-width', () => {
    expect(() => buildNWIEnvelope([], 150)).toThrow(NwiError);
    expect(() => buildNWIEnvelope(stations(), 0)).toThrow(NwiError);
    expect(() => buildNWIEnvelope(stations(), NaN)).toThrow(NwiError);
  });
});

describe('buildNWIQueryString', () => {
  it('produces an ArcGIS envelope query', () => {
    const qs = buildNWIQueryString(stations(), 150);
    expect(qs).toContain('esriGeometryEnvelope');
    expect(qs).toContain('f=geojson');
    expect(qs).toContain('Wetlands.ATTRIBUTE');
  });
});

describe('parseNWIFeatures', () => {
  it('parses polygons and multipolygons, skips degenerate geometry', () => {
    const feats = parseNWIFeatures(nwiGeoJSON());
    expect(feats).toHaveLength(2);
    expect(feats[0]).toMatchObject({
      objectId: 42,
      attribute: 'PEM1A',
      wetlandType: 'Freshwater Emergent Wetland',
      acres: 3.25,
    });
    expect(feats[0]!.rings).toHaveLength(1);
    expect(feats[1]!.rings).toHaveLength(1);
  });
  it('falls back gracefully on missing attributes', () => {
    const feats = parseNWIFeatures({ features: [{ properties: {}, geometry: undefined }] });
    expect(feats).toHaveLength(0);
  });
});

describe('detectWetlandCrossings', () => {
  it('station-references an intersecting NWI polygon', () => {
    const feats = parseNWIFeatures(nwiGeoJSON());
    const crossings = detectWetlandCrossings(feats, stations());
    expect(crossings).toHaveLength(1);
    const c = crossings[0]!;
    expect(c.kind).toBe('wetland');
    expect(c.id).toBe('nwi/42');
    expect(c.name).toBe('Freshwater Emergent Wetland');
    expect(c.detail).toContain('NWI PEM1A');
    expect(c.detail).toContain('3.3 ac');
    expect(c.detail).toContain('field verify');
    // Polygon spans lon -73.9785..-73.9775 → stations ~150..250 ft.
    expect(c.stationFt).toBeGreaterThanOrEqual(100);
    expect(c.stationFt).toBeLessThanOrEqual(300);
  });
});

describe('mergeCrossings', () => {
  it('merges lists sorted and dedupes same kind+name within 100 ft', () => {
    const a: Crossing = {
      id: 'way/1', kind: 'road', name: 'Main St', detail: '', stationFt: 500,
      offsetFt: 0, lat: 0, lon: 0, osmType: 'way', osmId: 1,
    };
    const b: Crossing = { ...a, id: 'way/2', stationFt: 540 };
    const c: Crossing = { ...a, id: 'nwi/9', kind: 'wetland', name: 'Freshwater Emergent Wetland', stationFt: 200 };
    const merged = mergeCrossings([[a, b], [c]]);
    expect(merged.map((m) => m.stationFt)).toEqual([200, 500]);
  });
});

describe('fetchNWI', () => {
  it('fetches and parses with an injected fetch', async () => {
    const fake = async () =>
      new Response(JSON.stringify(nwiGeoJSON()), { status: 200 });
    const feats = await fetchNWI(stations(), 150, fake as typeof fetch);
    expect(feats).toHaveLength(2);
  });
  it('throws NwiError on network failure', async () => {
    const fake = async () => {
      throw new Error('boom');
    };
    await expect(fetchNWI(stations(), 150, fake as typeof fetch)).rejects.toThrow(NwiError);
  });
  it('throws NwiError on HTTP error', async () => {
    const fake = async () => new Response('nope', { status: 500 });
    await expect(fetchNWI(stations(), 150, fake as typeof fetch)).rejects.toThrow(NwiError);
  });
});
