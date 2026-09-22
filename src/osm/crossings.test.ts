import { describe, it, expect } from 'vitest';
import { classifyElement, detectCrossings } from './crossings';
import { buildOverpassQuery, corridorPolyFilter } from './overpass';
import { OsmError } from './types';
import type { OverpassElement } from './types';
import type { Station } from '../geo/types';

function stations(): Station[] {
  return [0, 1, 2, 3, 4].map((i) => ({
    chainageFt: i * 100,
    lat: 30,
    lon: -97 + i * 0.001,
    groundElevFt: 100,
  }));
}

function way(id: number, tags: Record<string, string>, coords: [number, number][]): OverpassElement {
  return {
    type: 'way',
    id,
    tags,
    geometry: coords.map(([lon, lat]) => ({ lat, lon })),
  };
}

describe('classifyElement', () => {
  it('classifies all five kinds', () => {
    expect(classifyElement(way(1, { highway: 'motorway', ref: 'I-10' }, [[0, 0], [1, 1]]))).toMatchObject({
      kind: 'road', name: 'I-10', detail: 'highway=motorway',
    });
    expect(classifyElement(way(2, { railway: 'rail' }, [[0, 0], [1, 1]]))).toMatchObject({
      kind: 'rail', name: 'unnamed railway',
    });
    expect(classifyElement(way(3, { waterway: 'river', name: 'Brays Bayou' }, [[0, 0], [1, 1]]))).toMatchObject({
      kind: 'water', name: 'Brays Bayou',
    });
    expect(classifyElement(way(4, { building: 'yes' }, [[0, 0], [1, 1]]))).toMatchObject({
      kind: 'building',
    });
    expect(classifyElement(way(5, { power: 'line' }, [[0, 0], [1, 1]]))).toMatchObject({
      kind: 'utility', name: 'power line',
    });
    expect(classifyElement(way(6, { man_made: 'pipeline' }, [[0, 0], [1, 1]]))).toMatchObject({
      kind: 'utility', name: 'pipeline',
    });
  });

  it('returns null for unclassified elements', () => {
    expect(classifyElement(way(7, { natural: 'tree' }, [[0, 0], [1, 1]]))).toBeNull();
    expect(classifyElement(way(8, {}, [[0, 0], [1, 1]]))).toBeNull();
  });
});

describe('detectCrossings', () => {
  it('finds a perpendicular road at the right station with ~zero offset', () => {
    const els = [
      way(1, { highway: 'primary', name: 'Main St' }, [
        [-96.998, 29.999],
        [-96.998, 30.001],
      ]),
    ];
    const out = detectCrossings(els, stations());
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'road', name: 'Main St' });
    expect(out[0]!.stationFt).toBeCloseTo(200, 0);
    expect(out[0]!.offsetFt).toBeLessThan(1);
  });

  it('drops ways that never touch the alignment', () => {
    const els = [
      way(2, { waterway: 'canal', name: 'Ditch' }, [
        [-97.001, 30.001],
        [-96.996, 30.001],
      ]),
    ];
    expect(detectCrossings(els, stations())).toHaveLength(0);
  });

  it('merges dual-carriageway pairs within the dedupe window', () => {
    const els = [
      way(3, { highway: 'primary', name: 'Main St' }, [[-96.998, 29.999], [-96.998, 30.001]]),
      way(4, { highway: 'primary', name: 'Main St' }, [[-96.9979, 29.999], [-96.9979, 30.001]]),
      way(5, { highway: 'secondary', name: 'Oak Ave' }, [[-96.996, 29.999], [-96.996, 30.001]]),
    ];
    const out = detectCrossings(els, stations());
    expect(out.map((c) => c.name)).toEqual(['Main St', 'Oak Ave']);
  });

  it('detects a building straddling the alignment', () => {
    const els = [
      way(6, { building: 'yes', name: 'Warehouse' }, [
        [-96.9996, 29.9999],
        [-96.9994, 29.9999],
        [-96.9994, 30.0001],
        [-96.9996, 30.0001],
        [-96.9996, 29.9999],
      ]),
    ];
    const out = detectCrossings(els, stations());
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'building', name: 'Warehouse' });
    // West edge of the building (lon -96.9996) = first hit along the drive.
    expect(out[0]!.stationFt).toBeCloseTo(40, 0);
  });

  it('sorts crossings by station', () => {
    const els = [
      way(7, { highway: 'residential', name: 'B St' }, [[-96.996, 29.999], [-96.996, 30.001]]),
      way(8, { highway: 'residential', name: 'A St' }, [[-96.999, 29.999], [-96.999, 30.001]]),
    ];
    const out = detectCrossings(els, stations());
    expect(out.map((c) => c.name)).toEqual(['A St', 'B St']);
  });
});

describe('overpass query builders', () => {
  it('builds a corridor poly filter', () => {
    const poly = corridorPolyFilter(stations(), 150);
    expect(poly.length).toBeGreaterThan(20);
    expect(poly).toMatch(/^-?\d+\.\d+ -?\d+\.\d+/);
  });

  it('throws NO_ALIGNMENT for degenerate input', () => {
    expect(() => corridorPolyFilter([stations()[0]!], 150)).toThrow(
      expect.objectContaining({ code: 'NO_ALIGNMENT' }),
    );
    expect(() => corridorPolyFilter([stations()[0]!], 150)).toThrow(OsmError);
  });

  it('builds a QL query covering all selectors', () => {
    const q = buildOverpassQuery('30.0 -97.0 30.1 -97.0');
    for (const sel of ['["highway"]', '["railway"]', '["waterway"]', '["building"]', '["power"="line"]', '["man_made"="pipeline"]']) {
      expect(q).toContain(sel);
    }
    expect(q).toContain('out geom;');
    expect(q).toContain('poly:"30.0 -97.0 30.1 -97.0"');
  });
});
