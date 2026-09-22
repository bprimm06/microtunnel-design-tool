/**
 * Settlement module tests — Peck Gaussian trough, ASCE 36-15 §13.5.
 * ST-01 expected values: scripts/gen_settlement_reference.py (independent).
 * Identity tests port the reference implementation's self-verification suite.
 */
import { describe, expect, it } from 'vitest';
import {
  computeSettlement,
  maxTroughSlope,
  troughSettlementIn,
  troughSlopeRatio,
} from './settlement';
import { ST01_EXPECTED, ST01_INPUTS } from './reference-cases';

const E = ST01_EXPECTED;
const TOL = 1e-4;

function closeTo(actual: number, expected: number, tol = TOL) {
  expect(Math.abs(actual - expected)).toBeLessThan(tol);
}

describe('ST-01 reference drive', () => {
  const R = computeSettlement(ST01_INPUTS);

  it('computes excavated area, lost volume, and annulus diagnostic', () => {
    closeTo(R.excavatedAreaFt2, E.excavatedAreaFt2, 1e-5);
    closeTo(R.annulusVolumeLossPct, E.annulusVolumeLossPct, 1e-3);
    R.segments.forEach((s) => closeTo(s.vsFt2PerFt, E.vsFt2PerFt, 1e-5));
  });

  it('warns when volume loss is below the geometric overcut annulus', () => {
    expect(R.warnings.some((w) => w.includes('overcut annulus'))).toBe(true);
  });

  it('computes per-segment trough parameters', () => {
    R.segments.forEach((s, i) => {
      closeTo(s.z0Ft, E.z0Ft[i] as number, 1e-9);
      closeTo(s.iFt, E.iFt[i] as number, 1e-9);
      closeTo(s.sMaxIn, E.sMaxIn[i] as number, 1e-5);
      closeTo(s.maxSlope, E.maxSlope[i] as number, 1e-7);
      expect(s.status).toBe('OK');
    });
  });

  it('identifies the governing segment', () => {
    expect(R.govIdx).toBe(E.govIdx);
    closeTo(R.maxSettleIn, E.maxSettleIn, 1e-5);
    expect(R.alignmentStatus).toBe('OK');
  });

  it('evaluates receptors on the trough', () => {
    const house = R.receptors[0];
    const gas = R.receptors[1];
    expect(house?.status).toBe('OK');
    closeTo(house?.settleIn ?? NaN, E.houseASettleIn, 1e-5);
    closeTo(house?.slope ?? NaN, E.houseASlope, 1e-7);
    closeTo(gas?.settleIn ?? NaN, E.gasMainSettleIn, 1e-5);
    closeTo(gas?.slope ?? NaN, E.gasMainSlope, 1e-7);
  });

  it('builds the transverse trough at the governing segment (±3i)', () => {
    expect(R.trough.length).toBe(121);
    const peak = R.trough.reduce((a, b) => (b.settleIn > a.settleIn ? b : a));
    closeTo(peak.settleIn, E.maxSettleIn, 1e-5);
    expect(Math.abs(peak.xFt)).toBeLessThan(1e-9);
  });
});

describe('trough mathematical identities (self-verification)', () => {
  const i = 7;
  const Vs = 0.200461;
  const sMax = Vs / (i * Math.sqrt(2 * Math.PI));

  it('S(0) = Smax and S(i)/Smax = e^-0.5', () => {
    closeTo(troughSettlementIn(0, sMax, i), sMax, 1e-12);
    closeTo(troughSettlementIn(i, sMax, i) / sMax, Math.exp(-0.5), 1e-12);
  });

  it('conserves volume: ∫trough dx = Vs (Simpson over ±5i)', () => {
    const n = 2000;
    const a = -5 * i;
    const b = 5 * i;
    const h = (b - a) / n;
    let sum = 0;
    for (let k = 0; k <= n; k++) {
      const x = a + k * h;
      const w = k === 0 || k === n ? 1 : k % 2 ? 4 : 2;
      sum += w * troughSettlementIn(x, sMax, i);
    }
    const area = (sum * h) / 3;
    expect(Math.abs(area - Vs) / Vs).toBeLessThan(1e-6);
  });

  it('slope peaks at x = i with value Smax/(i·√e)', () => {
    let best = { x: 0, v: 0 };
    for (let j = 0; j <= 4000; j++) {
      const x = (j * 4 * i) / 4000;
      const v = troughSlopeRatio(x, sMax, i);
      if (v > best.v) best = { x, v };
    }
    const closed = maxTroughSlope(sMax, i);
    expect(Math.abs(best.v - closed) / closed).toBeLessThan(1e-3);
    expect(Math.abs(best.x - i) / i).toBeLessThan(1e-3);
  });
});

describe('limit and input handling', () => {
  it('flags EXCEEDS LIMIT when settlement exceeds the limit', () => {
    const R = computeSettlement({ ...ST01_INPUTS, settleLimitIn: 0.1 });
    expect(R.segments[2]?.status).toBe('EXCEEDS LIMIT');
    expect(R.alignmentStatus).toBe('EXCEEDS LIMIT');
  });

  it('flags MARGINAL inside the 1/1.25 band', () => {
    // seg3 Smax 0.159944 in; limit 0.18 → ratio 0.889 > 0.8 → MARGINAL
    const R = computeSettlement({ ...ST01_INPUTS, settleLimitIn: 0.18 });
    expect(R.segments[2]?.status).toBe('MARGINAL');
    expect(R.alignmentStatus).toBe('MARGINAL');
  });

  it('marks segments INPUT REQUIRED on missing cover or K', () => {
    const R = computeSettlement({
      ...ST01_INPUTS,
      segments: [{ startFt: 0, endFt: 200, groundCls: 'unknown', include: true }],
    });
    expect(R.segments[0]?.status).toBe('INPUT REQUIRED');
    expect(R.alignmentStatus).toBe('INPUT REQUIRED');
  });

  it('marks receptors OUTSIDE DRIVE past the alignment', () => {
    const R = computeSettlement({
      ...ST01_INPUTS,
      receptors: [{ name: 'Far', stationFt: 9999, offsetFt: 0 }],
    });
    expect(R.receptors[0]?.status).toBe('OUTSIDE DRIVE');
  });

  it('reads K from the ground-class library when not overridden', () => {
    const R = computeSettlement({
      ...ST01_INPUTS,
      segments: [
        { startFt: 0, endFt: 200, groundCls: 'stiff clay', coverFt: 12, include: true },
      ],
      kLibrary: [{ cls: 'stiff clay', k: 0.5 }],
    });
    closeTo(R.segments[0]?.iFt ?? NaN, 7.0, 1e-9);
  });
});
