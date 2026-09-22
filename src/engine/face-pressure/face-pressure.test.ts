/**
 * Face-pressure module tests — ASCE 36-15 §13.4.
 * FP-01 expected values: scripts/gen_face_reference.py (independent implementation).
 */
import { describe, expect, it } from 'vitest';
import {
  computeFacePressures,
  maxBlowoutPressurePsf,
  minStablePressurePsf,
  pressureToForceKips,
  targetPressurePsf,
} from './face-pressure';
import { FP01_EXPECTED, FP01_INPUTS } from './reference-cases';
import type { FaceInputs } from './types';

const E = FP01_EXPECTED;
const TOL = 1e-3;

function closeTo(actual: number, expected: number, tol = TOL) {
  expect(Math.abs(actual - expected)).toBeLessThan(tol);
}

describe('FP-01 reference stations', () => {
  const R = computeFacePressures(FP01_INPUTS);

  it('computes pore pressure and vertical stresses', () => {
    R.stations.forEach((s, i) => {
      closeTo(s.uPsf, E.uPsf[i] as number);
      closeTo(s.sigmaVEffPsf, E.sigmaVEffPsf[i] as number);
      closeTo(s.sigmaVTotalPsf, E.sigmaVTotalPsf[i] as number);
    });
  });

  it('computes the §13.4 operating window: min stable, target, blowout guard', () => {
    R.stations.forEach((s, i) => {
      closeTo(s.minStablePsf, E.minStablePsf[i] as number);
      closeTo(s.targetPsf, E.targetPsf[i] as number);
      closeTo(s.maxBlowoutPsf, E.maxBlowoutPsf[i] as number);
      expect(s.minStablePsf).toBeLessThan(s.targetPsf);
      expect(s.targetPsf).toBeLessThan(s.maxBlowoutPsf);
      expect(s.status).toBe('OK');
    });
  });

  it('converts target pressure to face force (ties to U7 FP)', () => {
    R.stations.forEach((s, i) => closeTo(s.targetForceKips, E.targetForceKips[i] as number));
  });

  it('identifies the governing station', () => {
    closeTo(R.governingTargetPsf, E.governingTargetPsf);
    expect(R.governingStationFt).toBe(E.governingStationFt);
    expect(R.alignmentStatus).toBe('OK');
  });

  it('carries the blowout-heuristic disclosure', () => {
    expect(R.warnings.some((w) => w.includes('TODO(source needed)'))).toBe(true);
  });
});

describe('ASCE 36-15 face behaviors', () => {
  it('minimum stable = u + Ka·σ\'v (§13.4)', () => {
    closeTo(minStablePressurePsf(374.4, 0.28, 1375.6), 759.568);
  });

  it('at-rest target is the conservative option vs active', () => {
    const k0 = targetPressurePsf(374.4, 0.45, 1375.6);
    const ka = targetPressurePsf(374.4, 0.28, 1375.6);
    expect(k0).toBeGreaterThan(ka);
  });

  it('blowout guard scales with the user factor (heuristic)', () => {
    closeTo(maxBlowoutPressurePsf(1750, 1.0), 1750);
    closeTo(maxBlowoutPressurePsf(1750, 0.8), 1400);
  });

  it('flags artesian window inversion as REVIEW', () => {
    // gw head above ground surface: u > γ·axis → σ'v = 0, pMin > pMax.
    const inputs: FaceInputs = {
      ...FP01_INPUTS,
      stations: [{ stationFt: 0, coverFt: 2, gwAboveAxisFt: 8, gammaPcf: 110, k0: 0.45, ka: 0.28 }],
    };
    const R = computeFacePressures(inputs);
    expect(R.stations[0]?.status).toBe('REVIEW');
    expect(R.stations[0]?.statusNote).toMatch(/artesian|inversion/);
    expect(R.alignmentStatus).toBe('REVIEW');
  });

  it('flags target outside MTBM deliverable limits', () => {
    const inputs: FaceInputs = { ...FP01_INPUTS, mtbmMaxPsf: 1500 };
    const R = computeFacePressures(inputs);
    // governing target 2205 psf > 1500 → stations 450 & 600 flagged
    expect(R.stations[4]?.status).toBe('REVIEW');
    expect(R.stations[4]?.statusNote).toMatch(/MTBM maximum/);
    expect(R.stations[0]?.status).toBe('OK');
  });

  it('marks stations INPUT REQUIRED on missing cover', () => {
    const inputs: FaceInputs = {
      ...FP01_INPUTS,
      stations: [{ stationFt: 0, gammaPcf: 125, k0: 0.45, ka: 0.28 }],
    };
    const R = computeFacePressures(inputs);
    expect(R.stations[0]?.status).toBe('INPUT REQUIRED');
    expect(R.alignmentStatus).toBe('INPUT REQUIRED');
  });

  it('pressureToForceKips matches the U7 face component form', () => {
    // U7 FP = (K·σ'v + u)·A/1000 = targetPressurePsf(u,K,σ'v)·A/1000
    const p = targetPressurePsf(374.4, 0.45, 1375.6);
    closeTo(pressureToForceKips(p, 49.5), (p * Math.PI * Math.pow(49.5 / 24, 2)) / 1000, 1e-9);
  });
});
