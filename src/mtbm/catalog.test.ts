/**
 * MTBM catalog integrity tests — catalog values are manufacturer data, so
 * these assert internal consistency (unit conversion, physical plausibility)
 * rather than engineering truth.
 */
import { describe, it, expect } from 'vitest';
import { MTBM_CATALOG, findMtbm, mtbmGroups } from './catalog';

describe('MTBM catalog', () => {
  it('has 20 Herrenknecht AVN entries with unique ids', () => {
    expect(MTBM_CATALOG.length).toBe(20);
    const ids = MTBM_CATALOG.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MTBM_CATALOG) {
      expect(m.manufacturer).toBe('Herrenknecht');
      expect(m.model.length).toBeGreaterThan(0);
      expect(m.source).toMatch(/verify against the current manufacturer data sheet/i);
    }
  });

  it('cutterOdIn is shieldOdMm converted at 25.4 mm/in', () => {
    for (const m of MTBM_CATALOG) {
      expect(m.cutterOdIn).toBeCloseTo(m.shieldOdMm / 25.4, 2);
      expect(m.cutterOdIn).toBeGreaterThan(0);
    }
  });

  it('shield OD is at least the pipe OD wherever both are listed', () => {
    for (const m of MTBM_CATALOG) {
      if (m.pipeOdMm !== undefined) {
        expect(m.shieldOdMm).toBeGreaterThanOrEqual(m.pipeOdMm);
      }
    }
  });

  it('torque and power are positive wherever listed', () => {
    for (const m of MTBM_CATALOG) {
      if (m.maxTorqueKNm !== undefined) expect(m.maxTorqueKNm).toBeGreaterThan(0);
      if (m.ratedPowerKw !== undefined) expect(m.ratedPowerKw).toBeGreaterThan(0);
      expect(m.cutterHeads).toEqual(['Soft ground', 'Mixed ground', 'Hard rock']);
    }
  });

  it('spot-checks known brochure values', () => {
    const m1200 = findMtbm('avn1200xc')!;
    expect(m1200.shieldOdMm).toBe(1295);
    expect(m1200.maxTorqueKNm).toBe(150);
    expect(m1200.ratedPowerKw).toBe(75);
    expect(m1200.cutterOdIn).toBeCloseTo(50.98, 1);
    const tc = findMtbm('avn1800tc')!;
    expect(tc.maxTorqueKNm).toBe(472);
    expect(tc.steerCylCount).toBe(4);
  });

  it('findMtbm returns undefined for custom/unknown ids', () => {
    expect(findMtbm('custom')).toBeUndefined();
    expect(findMtbm(undefined)).toBeUndefined();
    expect(findMtbm('nope')).toBeUndefined();
  });

  it('groups machines in catalog order', () => {
    const groups = mtbmGroups();
    expect(groups.map(([g]) => g)).toEqual([
      'AVN XC — small',
      'AVN XC — standard',
      'AVN TC',
    ]);
    expect(groups.reduce((n, [, ms]) => n + ms.length, 0)).toBe(20);
  });
});
