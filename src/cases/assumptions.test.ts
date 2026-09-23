/**
 * Populated settlement assumptions — the lines must carry the actual case
 * inputs and engine results, not boilerplate.
 */
import { describe, it, expect } from 'vitest';
import { settlementAssumptions } from './assumptions';
import { computeSettlement } from '../engine/settlement/settlement';
import type { CalcCase } from './types';

function makeCase(): CalcCase {
  return {
    id: 't',
    name: 'Test',
    createdAt: '2026-09-22',
    profileFingerprint: 'fp',
    stationStartFt: 0,
    stationEndFt: 400,
    globals: {
      pipeODIn: 36,
      cutterODIn: 50.98,
      mtbmId: 'avn1200xc',
      mtbmModel: 'Herrenknecht AVN 1200 XC',
      cutterHead: 'Mixed ground',
      faceBasis: 'at-rest',
      targetBasis: 'at-rest',
      capacities: [],
      volumeLossPct: 1.0,
      settleLimitIn: 1.0,
      slopeLimitDenom: 200,
      marginalFactor: 1.25,
    },
    segments: [
      {
        startFt: 0, endFt: 200, groundCls: 'soft clay',
        gammaPcf: 120, k0: 0.6, ka: 0.4, coverFt: 15,
        frictionMode: 'tabulated', include: true,
      },
      {
        startFt: 200, endFt: 400, groundCls: 'sand',
        gammaPcf: 125, k0: 0.5, ka: 0.35, coverFt: 18,
        frictionMode: 'tabulated', kParam: 0.35, include: true,
      },
    ],
    groundClasses: [],
    kLibrary: [{ cls: 'soft clay', k: 0.5 }],
    faceStations: [],
    receptors: [],
  };
}

describe('settlementAssumptions', () => {
  it('populates method, machine, cutter OD, VL, K, and limits', () => {
    const c = makeCase();
    const r = computeSettlement({
      cutterODIn: 50.98,
      pipeODIn: 36,
      volumeLossPct: 1.0,
      settleLimitIn: 1.0,
      slopeLimitDenom: 200,
      marginalFactor: 1.25,
      segments: c.segments.map((s) => ({
        startFt: s.startFt, endFt: s.endFt, groundCls: s.groundCls,
        coverFt: s.coverFt, kParam: s.kParam, include: s.include,
      })),
      kLibrary: c.kLibrary,
    });
    const lines = settlementAssumptions(c, r);
    const text = lines.join('\n');
    expect(text).toMatch(/Peck Gaussian trough/);
    expect(text).toMatch(/ASCE 36-15 §13\.5/);
    expect(text).toMatch(/Herrenknecht AVN 1200 XC/);
    expect(text).toMatch(/Mixed ground cutting wheel/);
    expect(text).toMatch(/50\.98-in cutter OD/);
    expect(text).toMatch(new RegExp(`Excavated area ${r.excavatedAreaFt2.toFixed(2)} ft²`));
    expect(text).toMatch(/Volume loss 1\.00%/);
    expect(text).toMatch(/kLibrary "soft clay"/);
    expect(text).toMatch(/K=0\.35 \(override\)/);
    expect(text).toMatch(/Settlement limit 1\.00 in; slope limit 1:200/);
    expect(text).toMatch(/marginal band 1\/1\.25/);
    expect(text).toMatch(new RegExp(`annulus.*${r.annulusVolumeLossPct.toFixed(2)}%`));
    expect(text).toMatch(/catalog-derived — verify with the manufacturer data sheet/);
  });

  it('falls back to manual entry wording with no machine selected', () => {
    const c = makeCase();
    c.globals.mtbmId = undefined;
    c.globals.mtbmModel = undefined;
    c.globals.cutterHead = undefined;
    const r = computeSettlement({
      cutterODIn: 42,
      pipeODIn: 36,
      volumeLossPct: 1.0,
      settleLimitIn: 1.0,
      segments: c.segments.map((s) => ({
        startFt: s.startFt, endFt: s.endFt, groundCls: s.groundCls,
        coverFt: s.coverFt, include: s.include,
      })),
      kLibrary: c.kLibrary,
    });
    const text = settlementAssumptions(c, r).join('\n');
    expect(text).toMatch(/\(manual entry\)/);
    expect(text).not.toMatch(/catalog-derived/);
  });
});
