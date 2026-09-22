import { describe, it, expect } from 'vitest';
import { buildProfile } from '../geo/profile';
import { buildCaseFromProfile } from './buildCase';
import { runCase, validateCase } from './runCase';
import { CaseError } from './types';
import type { CalcCase } from './types';
import type { ProfileInput } from '../geo/types';
import type { Boring } from '../geotech/types';

/**
 * Integration: U4b hand-reference profile (stations 0–400 ft, ground 100–96 ft,
 * invert (0,80)→(400,76), pipe OD 6 ft → cover 14 ft and depth 20 ft everywhere).
 * Face hand-check: axis = 14 + 72/24 = 17 ft; σ'v = 120×17 = 2040 psf (no GW);
 * target = 0.5×2040 = 1020 psf; min-stable = 0.33×2040 = 673.2 psf;
 * blowout guard = 1.0×2040 = 2040 psf.
 */
function referenceCase(): CalcCase {
  const stations = [0, 100, 200, 300, 400].map((c) => ({
    chainageFt: c,
    lat: 30,
    lon: -97,
    groundElevFt: 100 - c * 0.01,
  }));
  const input: ProfileInput = {
    controlPoints: [
      { stationFt: 0, invertElevFt: 80 },
      { stationFt: 400, invertElevFt: 76 },
    ],
    pipeODFt: 6,
  };
  const profile = buildProfile(stations, input);
  const borings: Boring[] = [
    {
      id: 'b1', name: 'B-1', lat: 30, lon: -97, stationFt: 200, offsetFt: 25,
      depthFt: 40, depthSource: 'rule', depthDerivation: 'rule', strata: [],
    },
  ];
  const c = buildCaseFromProfile(profile, input, borings, 'REF');
  return {
    ...c,
    globals: { ...c.globals, cutterODIn: 74, volumeLossPct: 1.5, settleLimitIn: 1 },
    segments: c.segments.map((s) => ({
      ...s,
      groundCls: 'test-clay',
      gammaPcf: 120,
      k0: 0.5,
      ka: 0.33,
      gwAboveAxisFt: 0,
      kParam: 0.5,
    })),
    groundClasses: [{ cls: 'test-clay', fLowPsf: 100, fBasePsf: 200, fHighPsf: 300 }],
  };
}

describe('buildCaseFromProfile', () => {
  it('builds a single segment with min cover and pre-filled ODs', () => {
    const c = referenceCase();
    expect(c.segments).toHaveLength(1);
    expect(c.segments[0]!.coverFt).toBe(14);
    expect(c.globals.pipeODIn).toBe(72);
    expect(c.faceStations.length).toBeGreaterThan(0);
    expect(c.receptors).toHaveLength(1);
    expect(c.receptors[0]).toMatchObject({ name: 'B-1', stationFt: 200, offsetFt: 25 });
    expect(c.groundClasses).toHaveLength(1); // filled by test helper
  });
});

describe('runCase', () => {
  it('matches hand-calculated face pressures on the reference profile', () => {
    const r = runCase(referenceCase());
    const st = r.face.stations[0]!;
    expect(st.targetPsf).toBeCloseTo(1020, 6);
    expect(st.minStablePsf).toBeCloseTo(673.2, 6);
    expect(st.maxBlowoutPsf).toBeCloseTo(2040, 6);
    expect(st.status).toBe('OK');
    expect(r.face.governingTargetPsf).toBeCloseTo(1020, 6);
  });

  it('produces ordered jacking bands and finite settlement', () => {
    const r = runCase(referenceCase());
    expect(r.jacking.maxHighKips).toBeGreaterThanOrEqual(r.jacking.maxBaseKips);
    expect(r.jacking.maxBaseKips).toBeGreaterThanOrEqual(r.jacking.maxLowKips);
    expect(r.jacking.maxBaseKips).toBeGreaterThan(0);
    expect(Number.isFinite(r.settlement.maxSettleIn)).toBe(true);
    expect(r.settlement.receptors).toHaveLength(1);
  });
});

describe('validateCase', () => {
  it('rejects missing required inputs with MISSING_REQUIRED', () => {
    const c = referenceCase();
    c.segments[0]!.gammaPcf = undefined;
    expect(() => validateCase(c)).toThrow(
      expect.objectContaining({ code: 'MISSING_REQUIRED' }),
    );
    expect(() => runCase(c)).toThrow(CaseError);
  });

  it('rejects a case with no included segments', () => {
    const c = referenceCase();
    c.segments = [];
    expect(() => validateCase(c)).toThrow(
      expect.objectContaining({ code: 'NO_SEGMENTS' }),
    );
  });
});
