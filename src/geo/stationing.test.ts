import { describe, it, expect } from 'vitest';
import {
  buildStations,
  computeVertexChainages,
  restoreGeGround,
  setStationGround,
  setStationsGround,
  M_TO_FT,
} from './stationing';
import type { KmlVertex, Station } from './types';

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

  it('treats all-zero altitudes as clamped-to-ground, not 0.0 ft elevations', () => {
    // Google Earth clamps drawn paths to the terrain and exports altitude 0
    // on every vertex — those zeros are not elevations.
    const verts: KmlVertex[] = [
      { lon: -97.0, lat: 30.0, altM: 0 },
      { lon: -96.999, lat: 30.0, altM: 0 },
    ];
    const { stations, warnings } = buildStations(verts, 100_000);
    expect(stations[0]!.groundElevFt).toBeUndefined();
    expect(stations[0]!.geGroundElevFt).toBeUndefined();
    expect(stations[0]!.elevSource).toBeUndefined();
    expect(warnings.some((w) => /clamped to ground/.test(w))).toBe(true);
    expect(warnings.some((w) => /3DEP/.test(w))).toBe(true);
  });

  it('keeps real zeros when mixed with nonzero altitudes', () => {
    const verts: KmlVertex[] = [
      { lon: -97.0, lat: 30.0, altM: 0 },
      { lon: -96.999, lat: 30.0, altM: 10 },
    ];
    const { stations, warnings } = buildStations(verts, 100_000);
    expect(stations[0]!.groundElevFt).toBeCloseTo(0, 6);
    expect(stations[0]!.elevSource).toBe('ge');
    expect(warnings.some((w) => /clamped/.test(w))).toBe(false);
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

  it('retains the KMZ value as geGroundElevFt alongside working ground', () => {
    const { stations } = buildStations(VERTICES, 100_000);
    expect(stations).toHaveLength(2);
    for (const s of stations) {
      expect(s.groundElevFt).toBeDefined();
      expect(s.geGroundElevFt).toBe(s.groundElevFt);
      expect(s.elevSource).toBe('ge');
    }
  });

  it('manual ground source leaves stations without ground', () => {
    const { stations, warnings } = buildStations(VERTICES, 100_000, 'manual');
    expect(stations).toHaveLength(2);
    for (const s of stations) {
      expect(s.groundElevFt).toBeUndefined();
      expect(s.geGroundElevFt).toBeUndefined();
      expect(s.elevSource).toBeUndefined();
    }
    expect(warnings.some((w) => /manual entry/i.test(w))).toBe(true);
  });
});

describe('setStationGround', () => {
  const base: Station[] = [
    { chainageFt: 0, lat: 30, lon: -97, groundElevFt: 328, geGroundElevFt: 328, elevSource: 'ge' },
    { chainageFt: 25, lat: 30, lon: -97 },
  ];

  it('marks a typed value as user-entered survey', () => {
    const out = setStationGround(base, 0, 330.5);
    expect(out[0]!.groundElevFt).toBe(330.5);
    expect(out[0]!.elevSource).toBe('survey');
    expect(out[0]!.geGroundElevFt).toBe(328); // KMZ value retained underneath
    expect(out[1]).toEqual(base[1]); // untouched
  });

  it('clearing restores the retained KMZ value', () => {
    const edited = setStationGround(base, 0, 330.5);
    const out = setStationGround(edited, 0, undefined);
    expect(out[0]!.groundElevFt).toBe(328);
    expect(out[0]!.elevSource).toBe('ge');
  });

  it('clearing without a KMZ value leaves the station without ground', () => {
    const edited = setStationGround(base, 25, 331);
    expect(edited[1]!.elevSource).toBe('survey');
    const out = setStationGround(edited, 25, undefined);
    expect(out[1]!.groundElevFt).toBeUndefined();
    expect(out[1]!.elevSource).toBeUndefined();
  });
});

describe('setStationsGround', () => {
  const base: Station[] = [
    { chainageFt: 0, lat: 30, lon: -97 },
    { chainageFt: 25, lat: 30, lon: -97, groundElevFt: 330, elevSource: 'survey' },
    { chainageFt: 50, lat: 30, lon: -97 },
  ];

  it('sets ground on listed stations and tags the given provenance', () => {
    const out = setStationsGround(
      base,
      [
        { chainageFt: 0, groundElevFt: 328.1 },
        { chainageFt: 50, groundElevFt: 329.4 },
      ],
      '3dep',
    );
    expect(out[0]!.groundElevFt).toBe(328.1);
    expect(out[0]!.elevSource).toBe('3dep');
    expect(out[2]!.groundElevFt).toBe(329.4);
    expect(out[2]!.elevSource).toBe('3dep');
  });

  it('overwrites existing ground but leaves unlisted stations untouched', () => {
    const out = setStationsGround(base, [{ chainageFt: 25, groundElevFt: 331 }], '3dep');
    expect(out[1]!.groundElevFt).toBe(331);
    expect(out[1]!.elevSource).toBe('3dep');
    expect(out[0]).toEqual(base[0]);
    expect(out[2]).toEqual(base[2]);
  });

  it('ignores non-finite values', () => {
    const out = setStationsGround(base, [{ chainageFt: 0, groundElevFt: NaN }], '3dep');
    expect(out[0]).toEqual(base[0]);
  });
});

describe('restoreGeGround', () => {
  it('resets working ground to KMZ values and leaves others untouched', () => {
    const stations: Station[] = [
      { chainageFt: 0, lat: 30, lon: -97, groundElevFt: 330.5, geGroundElevFt: 328, elevSource: 'survey' },
      { chainageFt: 25, lat: 30, lon: -97, groundElevFt: 331, elevSource: 'survey' },
    ];
    const out = restoreGeGround(stations);
    expect(out[0]!.groundElevFt).toBe(328);
    expect(out[0]!.elevSource).toBe('ge');
    expect(out[1]!.groundElevFt).toBe(331); // no KMZ value — untouched
    expect(out[1]!.elevSource).toBe('survey');
  });
});
