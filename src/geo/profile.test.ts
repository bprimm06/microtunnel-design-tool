import { describe, it, expect } from 'vitest';
import { buildProfile, invertAt, ProfileError } from './profile';
import type { ProfileInput, Station } from './types';

/**
 * Hand-calculated reference case.
 *
 * Stations: 0+00..4+00, ground falling 1 ft per 100 ft (100 → 96 ft).
 * Control points: (0, 80.0), (400, 76.0) → grade −1.0%.
 *   invert(s) = 80 − 0.01·s   (hand: 80.0, 79.0, 78.0, 77.0, 76.0)
 * Pipe OD = 6 ft → crown = invert + 6.
 *   cover = ground − crown = 14.0 ft at every station (hand)
 *   depth = ground − invert = 20.0 ft at every station (hand)
 */
function refStations(): Station[] {
  return [0, 100, 200, 300, 400].map((c, i) => ({
    chainageFt: c,
    lat: 30 + i * 0.001,
    lon: -97,
    groundElevFt: 100 - i,
    elevSource: 'survey' as const,
  }));
}

const REF_INPUT: ProfileInput = {
  controlPoints: [
    { stationFt: 0, invertElevFt: 80 },
    { stationFt: 400, invertElevFt: 76 },
  ],
  pipeODFt: 6,
};

describe('buildProfile reference case', () => {
  it('matches the hand calculation', () => {
    const { stations, warnings } = buildProfile(refStations(), REF_INPUT);
    expect(warnings).toHaveLength(0);
    const expected = [
      { inv: 80, cover: 14, depth: 20 },
      { inv: 79, cover: 14, depth: 20 },
      { inv: 78, cover: 14, depth: 20 },
      { inv: 77, cover: 14, depth: 20 },
      { inv: 76, cover: 14, depth: 20 },
    ];
    expect(stations).toHaveLength(5);
    stations.forEach((s, i) => {
      expect(s.invertElevFt).toBeCloseTo(expected[i]!.inv, 9);
      expect(s.crownElevFt).toBeCloseTo(expected[i]!.inv + 6, 9);
      expect(s.coverFt).toBeCloseTo(expected[i]!.cover, 9);
      expect(s.depthToInvertFt).toBeCloseTo(expected[i]!.depth, 9);
    });
  });

  it('invertAt interpolates and clamps', () => {
    const cps = REF_INPUT.controlPoints;
    expect(invertAt(0, cps)).toBe(80);
    expect(invertAt(200, cps)).toBe(78);
    expect(invertAt(400, cps)).toBe(76);
    expect(invertAt(-50, cps)).toBe(80); // clamped flat
    expect(invertAt(500, cps)).toBe(76); // clamped flat
  });
});

describe('buildProfile edge cases', () => {
  it('single control point gives a flat invert', () => {
    const { stations, warnings } = buildProfile(refStations(), {
      controlPoints: [{ stationFt: 0, invertElevFt: 80 }],
      pipeODFt: 6,
    });
    expect(stations.every((s) => s.invertElevFt === 80)).toBe(true);
    expect(warnings.some((w) => w.code === 'CLAMPED_CONTROL_POINT')).toBe(true);
  });

  it('warns on negative cover and names the worst station', () => {
    const { warnings } = buildProfile(refStations(), {
      controlPoints: [
        { stationFt: 0, invertElevFt: 95 }, // crown 101 > ground 100 → cover −1
        { stationFt: 400, invertElevFt: 76 },
      ],
      pipeODFt: 6,
    });
    const neg = warnings.find((w) => w.code === 'NEGATIVE_COVER')!;
    expect(neg).toBeDefined();
    expect(neg.stationFt).toBe(0);
    expect(neg.message).toContain('-1.0 ft');
  });

  it('warns on shallow cover below one pipe OD', () => {
    const { warnings } = buildProfile(refStations(), {
      controlPoints: [
        { stationFt: 0, invertElevFt: 89 }, // crown 95, cover 5 < OD 6
        { stationFt: 400, invertElevFt: 76 },
      ],
      pipeODFt: 6,
    });
    const sh = warnings.find((w) => w.code === 'SHALLOW_COVER')!;
    expect(sh).toBeDefined();
    expect(sh.stationFt).toBe(0);
  });

  it('leaves cover/depth undefined where ground is unknown', () => {
    const stations = refStations();
    delete stations[2]!.groundElevFt;
    const { stations: out, warnings } = buildProfile(stations, REF_INPUT);
    expect(out[2]!.coverFt).toBeUndefined();
    expect(out[2]!.depthToInvertFt).toBeUndefined();
    expect(out[2]!.invertElevFt).toBeCloseTo(78, 9); // invert still resolved
    expect(warnings.some((w) => w.code === 'MISSING_GROUND_ELEV')).toBe(true);
  });

  it('rejects invalid inputs with named codes', () => {
    expect(() => buildProfile([], REF_INPUT)).toThrowError(ProfileError);
    expect(() => buildProfile([], REF_INPUT)).toThrow(
      expect.objectContaining({ code: 'NO_STATIONS' }),
    );
    expect(() =>
      buildProfile(refStations(), { controlPoints: [], pipeODFt: 6 }),
    ).toThrow(expect.objectContaining({ code: 'NO_CONTROL_POINTS' }));
    expect(() =>
      buildProfile(refStations(), {
        controlPoints: [
          { stationFt: 0, invertElevFt: 80 },
          { stationFt: 0, invertElevFt: 79 },
        ],
        pipeODFt: 6,
      }),
    ).toThrow(expect.objectContaining({ code: 'DUPLICATE_CONTROL_STATION' }));
    expect(() =>
      buildProfile(refStations(), {
        controlPoints: [
          { stationFt: 200, invertElevFt: 78 },
          { stationFt: 0, invertElevFt: 80 },
        ],
        pipeODFt: 6,
      }),
    ).toThrow(expect.objectContaining({ code: 'CONTROL_NOT_SORTED' }));
    expect(() =>
      buildProfile(refStations(), { controlPoints: [{ stationFt: 0, invertElevFt: 80 }], pipeODFt: 0 }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_PIPE_OD' }));
  });
});
