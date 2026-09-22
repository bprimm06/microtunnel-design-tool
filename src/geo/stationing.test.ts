import { describe, it, expect } from 'vitest';
import { buildStations, computeVertexChainages, M_TO_FT } from './stationing';
import type { KmlVertex } from './types';

/**
 * Independent reference: plain haversine (no Turf). The implementation under
 * test uses Turf's distance/along — agreement within 0.5% validates both
 * the chainage math and the m→ft conversion.
 */
function haversineFt(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // mean earth radius, m
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a)) * M_TO_FT;
}

const VERTICES: KmlVertex[] = [
  { lon: -97.0, lat: 30.0, altM: 100 },
  { lon: -96.999, lat: 30.0, altM: 105 },
  { lon: -96.999, lat: 30.001, altM: 110 },
];

describe('buildStations', () => {
  it('matches an independent haversine reference within 0.5%', () => {
    const d1 = haversineFt(30.0, -97.0, 30.0, -96.999);
    const d2 = haversineFt(30.0, -96.999, 30.001, -96.999);

    // Vertex chainages (the raw path length, before densification).
    const vc = computeVertexChainages(VERTICES);
    expect(vc[0]).toBe(0);
    expect(Math.abs(vc[1]! - d1) / d1).toBeLessThan(0.005);
    expect(Math.abs(vc[2]! - (d1 + d2)) / (d1 + d2)).toBeLessThan(0.005);

    // Huge interval -> stations only at start and end.
    const { stations, lengthFt } = buildStations(VERTICES, 100_000);
    expect(stations).toHaveLength(2);
    expect(stations[0]!.chainageFt).toBe(0);
    expect(stations[1]!.chainageFt).toBeCloseTo(lengthFt, 6);
    expect(Math.abs(lengthFt - (d1 + d2)) / (d1 + d2)).toBeLessThan(0.005);

    // Sanity: ~316 ft per 0.001 deg lon at 30N, ~364 ft per 0.001 deg lat
    expect(d1).toBeGreaterThan(300);
    expect(d1).toBeLessThan(330);
    expect(d2).toBeGreaterThan(355);
    expect(d2).toBeLessThan(375);
  });

  it('densifies to the requested interval and always ends at the final vertex', () => {
    const { stations, lengthFt } = buildStations(VERTICES, 25);
    expect(stations.length).toBe(Math.floor(lengthFt / 25) + 2);
    for (let i = 1; i < stations.length - 1; i++) {
      expect(stations[i]!.chainageFt).toBeCloseTo(i * 25, 6);
    }
    const last = stations[stations.length - 1]!;
    expect(last.chainageFt).toBeCloseTo(lengthFt, 6);
    expect(last.lat).toBeCloseTo(30.001, 6);
    expect(last.lon).toBeCloseTo(-96.999, 6);
  });

  it('converts altitude m->ft, flags GE source, interpolates gaps', () => {
    const verts: KmlVertex[] = [
      { lon: -97.0, lat: 30.0, altM: 100 },
      { lon: -96.9995, lat: 30.0 }, // no altitude
      { lon: -96.999, lat: 30.0, altM: 110 },
    ];
    // Two equal halves: the middle vertex sits at exactly half the length,
    // so interval = length/2 lands a station exactly on it.
    const { lengthFt } = buildStations(verts, 100_000);
    const { stations, warnings } = buildStations(verts, lengthFt / 2);
    expect(stations).toHaveLength(3);
    expect(stations[0]!.groundElevFt).toBeCloseTo(100 * M_TO_FT, 6);
    expect(stations[0]!.elevSource).toBe('ge');
    // midpoint: linear interpolation between 100 and 110 m
    expect(stations[1]!.groundElevFt).toBeCloseTo(105 * M_TO_FT, 6);
    expect(stations[2]!.groundElevFt).toBeCloseTo(110 * M_TO_FT, 6);
    expect(warnings.some((w) => /interpolated/.test(w))).toBe(true);
  });

  it('warns when no vertex has altitude', () => {
    const verts: KmlVertex[] = [
      { lon: -97.0, lat: 30.0 },
      { lon: -96.999, lat: 30.0 },
    ];
    const { stations, warnings } = buildStations(verts, 100_000);
    expect(stations[0]!.groundElevFt).toBeUndefined();
    expect(warnings.some((w) => /No vertex altitudes/.test(w))).toBe(true);
  });

  it('rejects degenerate input with named errors', () => {
    expect(() => buildStations([], 25)).toThrow(/fewer than 2/);
    expect(() => buildStations([{ lon: -97, lat: 30 }], 25)).toThrow(/fewer than 2/);
    expect(() =>
      buildStations(
        [
          { lon: -97, lat: 30 },
          { lon: -97, lat: 30 },
        ],
        25,
      ),
    ).toThrow(/zero length/);
    expect(() => buildStations(VERTICES, 0)).toThrow(/positive/);
  });
});
