import { describe, it, expect } from 'vitest';
import {
  projectToAlignment,
  depthToInvertAt,
  groundElevAt,
  defaultBoringDepth,
  nextBoringName,
  validateStrata,
  validateDepth,
  BORING_DEPTH_RULE_FT,
} from './borings';
import { BoringError } from './types';
import type { ProfileStation, Station } from '../geo/types';

function stations(): Station[] {
  // Straight east-west line at lat 30: 0+00 .. 4+00 in ~105.7 ft thirds.
  return [0, 1, 2, 3, 4].map((i) => ({
    chainageFt: i * 100,
    lat: 30,
    lon: -97 + i * 0.001,
    groundElevFt: 100,
  }));
}

function profile(): ProfileStation[] {
  return stations().map((s) => ({
    ...s,
    invertElevFt: 80,
    crownElevFt: 86,
    coverFt: 14,
    depthToInvertFt: 20,
  }));
}

describe('projectToAlignment', () => {
  it('projects onto a straight alignment with correct station and offset', () => {
    // Point 0.0005 deg north of the midpoint vertex (2+00 ≈ lon -96.998).
    // 0.0005 deg lat ≈ 182 ft.
    const p = projectToAlignment(30.0005, -96.998, stations());
    expect(p.stationFt).toBeCloseTo(200, 0);
    expect(p.offsetFt).toBeGreaterThan(175);
    expect(p.offsetFt).toBeLessThan(190);
    expect(p.lat).toBeCloseTo(30, 5);
  });

  it('snaps an on-line point to ~zero offset', () => {
    const p = projectToAlignment(30, -96.9985, stations());
    expect(p.offsetFt).toBeLessThan(1);
    expect(p.stationFt).toBeCloseTo(150, 0);
  });

  it('throws NO_ALIGNMENT with no stations', () => {
    expect(() => projectToAlignment(30, -97, [])).toThrow(
      expect.objectContaining({ code: 'NO_ALIGNMENT' }),
    );
  });
});

describe('depthToInvertAt / groundElevAt', () => {
  it('interpolates between profile stations', () => {
    const prof = profile().map((s, i) => ({ ...s, depthToInvertFt: 20 + i * 2 }));
    expect(depthToInvertAt(150, prof)).toBeCloseTo(23, 9);
    expect(depthToInvertAt(0, prof)).toBe(20);
    expect(depthToInvertAt(400, prof)).toBe(28);
  });

  it('clamps beyond the profile ends', () => {
    expect(depthToInvertAt(-50, profile())).toBe(20);
    expect(depthToInvertAt(9999, profile())).toBe(20);
  });

  it('returns undefined when no station has the value', () => {
    const prof = profile().map((s) => ({ ...s, depthToInvertFt: undefined }));
    expect(depthToInvertAt(100, prof)).toBeUndefined();
    expect(groundElevAt(100, prof)).toBe(100); // ground still present
  });
});

describe('defaultBoringDepth', () => {
  it('applies the +20 ft rule with a derivation string', () => {
    const r = defaultBoringDepth(150, profile());
    expect(r).not.toBeNull();
    expect(r!.depthFt).toBe(20 + BORING_DEPTH_RULE_FT);
    expect(r!.derivation).toContain('invert depth 20.0 ft + 20 ft = 40.0 ft');
    expect(r!.derivation).toContain('@ 1+50');
  });

  it('returns null without a usable profile', () => {
    expect(defaultBoringDepth(150, null)).toBeNull();
    expect(defaultBoringDepth(150, [])).toBeNull();
    const noDepth = profile().map((s) => ({ ...s, depthToInvertFt: undefined }));
    expect(defaultBoringDepth(150, noDepth)).toBeNull();
  });
});

describe('nextBoringName', () => {
  it('skips taken names', () => {
    expect(nextBoringName([])).toBe('B-1');
    expect(nextBoringName([{ name: 'B-1' }, { name: 'B-2' }])).toBe('B-3');
    expect(nextBoringName([{ name: 'B-2' }])).toBe('B-1');
  });
});

describe('validateStrata / validateDepth', () => {
  it('accepts well-formed strata', () => {
    expect(() =>
      validateStrata(
        [
          { topDepthFt: 0, bottomDepthFt: 10, description: 'clay' },
          { topDepthFt: 10, bottomDepthFt: 40, description: 'sand' },
        ],
        40,
      ),
    ).not.toThrow();
  });

  it('rejects bad strata with INVALID_STRATA', () => {
    const bad: [string, Parameters<typeof validateStrata>[0]][] = [
      ['bottom above top', [{ topDepthFt: 10, bottomDepthFt: 5, description: '' }]],
      ['overlap', [
        { topDepthFt: 0, bottomDepthFt: 15, description: '' },
        { topDepthFt: 10, bottomDepthFt: 20, description: '' },
      ]],
      ['beyond boring depth', [{ topDepthFt: 0, bottomDepthFt: 50, description: '' }]],
      ['negative top', [{ topDepthFt: -2, bottomDepthFt: 5, description: '' }]],
      ['non-numeric', [{ topDepthFt: NaN, bottomDepthFt: 5, description: '' }]],
    ];
    for (const [label, s] of bad) {
      expect(() => validateStrata(s, 40), label).toThrow(
        expect.objectContaining({ code: 'INVALID_STRATA' }),
      );
    }
  });

  it('rejects non-positive depths', () => {
    expect(() => validateDepth(0)).toThrow(expect.objectContaining({ code: 'INVALID_DEPTH' }));
    expect(() => validateDepth(-5)).toThrow(expect.objectContaining({ code: 'INVALID_DEPTH' }));
    expect(() => validateDepth(NaN)).toThrow(BoringError);
  });
});
