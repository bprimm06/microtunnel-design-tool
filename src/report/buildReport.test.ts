import { describe, it, expect } from 'vitest';
import { buildReportHtml, reportFilename } from './buildReport';
import type { ReportInput } from './types';
import type { CalcCase } from '../cases/types';
import type { CaseResults } from '../cases/runCase';

function input(overrides: Partial<ReportInput> = {}): ReportInput {
  const c: CalcCase = {
    id: 'case-1',
    name: 'Case <Alpha> & "Beta"',
    createdAt: '2026-09-22T12:00:00.000Z',
    profileFingerprint: 'abc123def456',
    stationStartFt: 0,
    stationEndFt: 400,
    globals: {
      pipeODIn: 72,
      cutterODIn: 75,
      faceBasis: 'at-rest',
      targetBasis: 'at-rest',
      volumeLossPct: 1.0,
      settleLimitIn: 1.0,
      blowoutFactor: 1.0,
      ijsPlanned: false,
      capacities: [],
    },
    segments: [
      {
        startFt: 0,
        endFt: 400,
        groundCls: 'clay',
        gammaPcf: 120,
        k0: 0.5,
        ka: 0.33,
        coverFt: 14,
        frictionMode: 'tabulated',
        include: true,
      },
    ],
    groundClasses: [],
    kLibrary: [],
    faceStations: [{ stationFt: 200, coverFt: 14 }],
    receptors: [{ name: 'House', stationFt: 200, offsetFt: 10, limitIn: 1 }],
  };
  const results: CaseResults = {
    jacking: {
      rows: [
        {
          idx: 0, startFt: 0, endFt: 400, lenFt: 400, coverFt: 14,
          frictionMode: 'tabulated', status: 'OK', statusNote: '',
          faceKips: 50, fricLowKips: 100, fricBaseKips: 150, fricHighKips: 200,
          cumLowKips: 100, cumBaseKips: 150, cumHighKips: 200,
          totalLowKips: 150, totalBaseKips: 200, totalHighKips: 250,
          sigmaNPsf: 1000, muPrimeUsed: 0.3,
        },
      ],
      driveLengthFt: 400,
      maxFaceKips: 50,
      maxFricRateHighKpf: 0.5,
      maxLowKips: 150,
      maxBaseKips: 200,
      maxHighKips: 250,
      govRowIdx: 0,
      alignmentStatus: 'OK',
      capacities: [
        { name: 'Jack frame', capacityKips: 500, owner: 'contractor', utilBase: 0.4, utilHigh: 0.5, status: 'OK' },
      ],
      ijs: { firstStationFt: 0, spacingFt: 0, count: 0, screen: 'not required' },
      pushback: { pushbackKips: 60, status: 'OK' },
      warnings: ['jacking warning one'],
    },
    face: {
      stations: [
        {
          stationFt: 200, coverFt: 14, status: 'OK', statusNote: '',
          uPsf: 0, sigmaVEffPsf: 2040, sigmaVTotalPsf: 2040,
          minStablePsf: 673, targetPsf: 1020, maxBlowoutPsf: 2040,
          targetForceKips: 31,
        },
      ],
      alignmentStatus: 'OK',
      governingTargetPsf: 1020,
      governingStationFt: 200,
      warnings: [],
    },
    settlement: {
      segments: [],
      excavatedAreaFt2: 30.7,
      annulusVolumeLossPct: 0.4,
      govIdx: 0,
      maxSettleIn: 0.5,
      maxSlope: 0.001,
      receptors: [
        {
          name: 'House', stationFt: 200, offsetFt: 10, limitIn: 1, segIdx: 0,
          coverFt: 14, iFt: 8, sMaxLocalIn: 0.5, settleIn: 0.4, slope: 0.0005,
          slopeDenom: 2000, ratio: 0.4, status: 'OK',
        },
      ],
      trough: [],
      alignmentStatus: 'OK',
      warnings: ['settlement warning one'],
    },
  };
  return {
    projectName: 'Test Project',
    generatedAt: '2026-09-22T17:00:00.000Z',
    appNote: 'test build',
    case: c,
    results,
    borings: [
      {
        id: 'b1', name: 'B-1', lat: 30, lon: -97, stationFt: 100, offsetFt: 25,
        depthFt: 40, depthSource: 'rule', depthDerivation: 'rule',
        strata: [{ topDepthFt: 0, bottomDepthFt: 40, description: 'clay' }],
      },
    ],
    crossings: [
      { id: 'way/1', kind: 'road', name: 'Main St', detail: 'highway=primary',
        stationFt: 200, offsetFt: 0, lat: 30, lon: -97, osmType: 'way', osmId: 1 },
    ],
    ...overrides,
  };
}

describe('buildReportHtml', () => {
  it('renders all nine sections with key values', () => {
    const html = buildReportHtml(input());
    for (const h of [
      'Drive summary', 'Inputs — globals', 'Inputs — drive segments',
      'Results — jacking force', 'Results — face pressure', 'Results — settlement',
      'Warnings', 'Borings', 'OSM crossings', 'Assumptions',
    ]) {
      expect(html).toContain(h);
    }
    expect(html).toContain('200'); // max base kips
    expect(html).toContain('1020'); // governing target psf
    expect(html).toContain('0.40'); // receptor settlement
    expect(html).toContain('jacking warning one');
    expect(html).toContain('settlement warning one');
    expect(html).toContain('Main St');
    expect(html).toContain('B-1');
    expect(html).toContain('field verify');
  });

  it('escapes user-controlled strings', () => {
    const html = buildReportHtml(input());
    expect(html).not.toContain('Case <Alpha>');
    expect(html).toContain('Case &lt;Alpha&gt; &amp; &quot;Beta&quot;');
  });

  it('handles empty optionals gracefully', () => {
    const html = buildReportHtml(
      input({ borings: [], crossings: [], results: {
        ...input().results,
        jacking: { ...input().results.jacking, warnings: [] },
        face: { ...input().results.face, warnings: [] },
        settlement: { ...input().results.settlement, warnings: [], receptors: [] },
      } }),
    );
    expect(html).toContain('No borings placed.');
    expect(html).toContain('No crossings detected.');
    expect(html).toContain('No receptors defined.');
    expect(html.match(/None\./g)!.length).toBeGreaterThanOrEqual(3);
  });
});

describe('reportFilename', () => {
  it('builds a safe filename', () => {
    expect(reportFilename('Case <Alpha> & "Beta"', '2026-09-22T17:00:00.000Z')).toBe(
      'microtunnel-report-case-alpha-beta-2026-09-22.html',
    );
    expect(reportFilename('!!!', '2026-09-22T17:00:00.000Z')).toBe(
      'microtunnel-report-case-2026-09-22.html',
    );
  });
});
