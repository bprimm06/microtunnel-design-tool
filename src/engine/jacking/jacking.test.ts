/**
 * Jacking engine tests — ASCE 36-15 §13.4 / §13.3 / §16.5.
 * REF-01 expected values: scripts/gen_reference.py (independent implementation).
 */
import { describe, expect, it } from 'vitest';
import { archingSigmaNPsf, computeJackingForce, effectiveMuPrime, faceComponentKips } from './jacking';
import { REF01_EXPECTED, REF01_INPUTS } from './reference-cases';
import type { JackingInputs } from './types';

const E = REF01_EXPECTED;
const TOL_KIPS = 1e-3;

function closeTo(actual: number, expected: number, tol = TOL_KIPS) {
  expect(Math.abs(actual - expected)).toBeLessThan(tol);
}

describe('REF-01 reference drive', () => {
  const R = computeJackingForce(REF01_INPUTS);

  it('computes per-segment face components (FP = (K·σ\'v + u)·A_head, §13.4)', () => {
    R.rows.forEach((row, i) => closeTo(row.faceKips, E.segFaceKips[i] as number));
  });

  it('computes per-segment skin friction for all three modes', () => {
    R.rows.forEach((row, i) => {
      closeTo(row.fricLowKips, E.segFricLowKips[i] as number);
      closeTo(row.fricBaseKips, E.segFricBaseKips[i] as number);
      closeTo(row.fricHighKips, E.segFricHighKips[i] as number);
    });
  });

  it('accumulates JF = FP + ΣFR with face and restart multipliers', () => {
    R.rows.forEach((row, i) => {
      closeTo(row.totalLowKips, E.segTotalLowKips[i] as number);
      closeTo(row.totalBaseKips, E.segTotalBaseKips[i] as number);
      closeTo(row.totalHighKips, E.segTotalHighKips[i] as number);
    });
  });

  it('reports drive maximums', () => {
    closeTo(R.maxFaceKips, E.maxFaceKips);
    closeTo(R.maxHighKips, E.maxHighKips);
    closeTo(R.maxBaseKips, E.maxBaseKips);
    closeTo(R.maxFricRateHighKpf, E.maxFricRateHighKpf);
    expect(R.driveLengthFt).toBe(E.driveLengthFt);
    expect(R.alignmentStatus).toBe('OK');
  });

  it('screens intermediate jacking stations', () => {
    closeTo(R.ijs.firstStationFt, E.ijsFirstStationFt);
    closeTo(R.ijs.spacingFt, E.ijsSpacingFt);
    expect(R.ijs.count).toBe(E.ijsCount);
    expect(R.ijs.screen).toBe('IJS OR REDESIGN REQUIRED');
  });

  it('flags pushback restraint as not provided (§13.4)', () => {
    closeTo(R.pushback.pushbackKips, E.pushbackKips);
    expect(R.pushback.status).toBe('RESTRAINT NOT PROVIDED');
    expect(R.warnings.some((w) => w.includes('brake/clamp'))).toBe(true);
  });

  it('computes utilization per §16.5 and flags exceedance', () => {
    const pipe = R.capacities[0];
    expect(pipe).toBeDefined();
    closeTo(pipe?.utilHigh ?? NaN, E.pipeUtilHigh, 1e-6);
    expect(pipe?.status).toBe('EXCEEDS CAPACITY');
  });

  it('exposes arching diagnostics on the arching segment', () => {
    const arch = R.rows[1];
    expect(arch).toBeDefined();
    closeTo(arch?.sigmaNPsf ?? NaN, E.archingSigmaNPsf, 1e-2);
    closeTo(arch?.muPrimeUsed ?? NaN, E.archingMuPrime, 1e-5);
  });
});

describe('ASCE 36-15 behaviors', () => {
  it('arching σ\'n is well below total-overburden stress (§13.3 — overburden overestimates)', () => {
    // REF-01 seg 2 overburden σ'v at axis ≈ 1998 psf; arching gives ≈ 456 psf.
    const sigmaN = archingSigmaNPsf(4, 128 - 62.4, 0, 0.45, 30, 18);
    expect(sigmaN).toBeLessThan(1998);
    closeTo(sigmaN, E.archingSigmaNPsf, 1e-2);
  });

  it('μ\' = tan(residual φ\') reduced for lubrication (§13.4)', () => {
    closeTo(effectiveMuPrime(30, 0.8), Math.tan((30 * Math.PI) / 180) * 0.8, 1e-9);
    closeTo(effectiveMuPrime(30, 1), Math.tan((30 * Math.PI) / 180), 1e-9);
  });

  it('active-earth face is below at-rest face (conservative default, §13.4)', () => {
    const k0Face = faceComponentKips(49.5, 0.45, 1750.6, 374.4);
    const kaFace = faceComponentKips(49.5, 0.3, 1750.6, 374.4);
    expect(kaFace).toBeLessThan(k0Face);
  });

  it('marks rows INPUT REQUIRED on missing cover', () => {
    const inputs: JackingInputs = {
      ...REF01_INPUTS,
      segments: [{ ...REF01_INPUTS.segments[0], coverFt: undefined } as JackingInputs['segments'][number]],
    };
    const R = computeJackingForce(inputs);
    expect(R.rows[0]?.status).toBe('INPUT REQUIRED');
    expect(R.alignmentStatus).toBe('INPUT REQUIRED');
  });

  it('marks rows ERROR when end station does not exceed start', () => {
    const seg = { ...REF01_INPUTS.segments[0], endFt: 0 } as JackingInputs['segments'][number];
    const R = computeJackingForce({ ...REF01_INPUTS, segments: [seg] });
    expect(R.rows[0]?.status).toBe('ERROR');
  });

  it('marks rows REVIEW for a curve without a curve factor (§13.4)', () => {
    const seg = { ...REF01_INPUTS.segments[0], radiusFt: 500, curveFactor: 1 } as JackingInputs['segments'][number];
    const R = computeJackingForce({ ...REF01_INPUTS, segments: [seg] });
    expect(R.rows[0]?.status).toBe('REVIEW');
    expect(R.alignmentStatus).toBe('REVIEW');
  });

  it('passes pushback when restraint covers the face thrust (§13.4)', () => {
    const R = computeJackingForce({ ...REF01_INPUTS, pushbackRestraintKips: 50 });
    expect(R.pushback.status).toBe('OK');
    const R2 = computeJackingForce({ ...REF01_INPUTS, pushbackRestraintKips: 20 });
    expect(R2.pushback.status).toBe('EXCEEDS RESTRAINT');
  });

  it('requires φ\'r > 0 for arching mode (§13.4 cohesive note)', () => {
    const seg = {
      ...REF01_INPUTS.segments[1], phiResidualDeg: 0,
    } as JackingInputs['segments'][number];
    const R = computeJackingForce({ ...REF01_INPUTS, segments: [seg] });
    expect(R.rows[0]?.status).toBe('INPUT REQUIRED');
  });
});
