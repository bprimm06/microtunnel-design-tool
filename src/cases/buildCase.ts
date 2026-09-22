/**
 * Build a calculation case from the current profile (+ borings as receptors).
 * Pure. Libraries start empty — tabulated friction and trough-K are project
 * geotechnical inputs, never invented here.
 */
import type { ProfileInput, ProfileResult } from '../geo/types';
import type { Boring } from '../geotech/types';
import type { CalcCase } from './types';

export function profileFingerprint(input: ProfileInput, stationCount: number): string {
  return JSON.stringify({
    pipeODFt: input.pipeODFt,
    controlPoints: input.controlPoints,
    stationCount,
  });
}

export function buildCaseFromProfile(
  profile: ProfileResult,
  input: ProfileInput,
  borings: Boring[],
  name: string,
): CalcCase {
  const stations = profile.stations;
  const first = stations[0]!;
  const last = stations[stations.length - 1]!;
  const covers = stations
    .map((s) => s.coverFt)
    .filter((c): c is number => c !== undefined && Number.isFinite(c));
  const minCover = covers.length ? Math.min(...covers) : NaN;

  const faceStations = stations
    .filter((s) => s.coverFt !== undefined && Number.isFinite(s.coverFt))
    .map((s) => ({ stationFt: s.chainageFt, coverFt: s.coverFt! }));

  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    profileFingerprint: profileFingerprint(input, stations.length),
    stationStartFt: first.chainageFt,
    stationEndFt: last.chainageFt,
    globals: {
      pipeODIn: input.pipeODFt * 12,
      cutterODIn: undefined, // required: actual MTBM cutter OD, must exceed pipe OD
      faceBasis: 'at-rest',
      targetBasis: 'at-rest',
      capacities: [],
      volumeLossPct: undefined, // required: project geotechnical input
      settleLimitIn: undefined, // required: project criterion
    },
    segments: [
      {
        startFt: first.chainageFt,
        endFt: last.chainageFt,
        groundCls: '',
        gammaPcf: undefined,
        k0: undefined,
        ka: undefined,
        gwAboveAxisFt: 0,
        coverFt: Number.isFinite(minCover) ? minCover : undefined,
        frictionMode: 'tabulated',
        include: true,
      },
    ],
    groundClasses: [],
    kLibrary: [],
    faceStations,
    receptors: borings.map((b) => ({
      name: b.name,
      stationFt: b.stationFt,
      offsetFt: b.offsetFt,
    })),
  };
}

/** Split every included segment into n equal parts (cover re-derived per part). */
export function autoSplitSegments(
  c: CalcCase,
  profile: ProfileResult,
  n: number,
): CalcCase {
  if (n < 2) return c;
  const coversOf = (a: number, b: number): number[] =>
    profile.stations
      .filter((s) => s.chainageFt >= a - 1e-9 && s.chainageFt <= b + 1e-9)
      .map((s) => s.coverFt)
      .filter((v): v is number => v !== undefined && Number.isFinite(v));
  const segments = c.segments.flatMap((seg) => {
    if (!seg.include) return [seg];
    const len = (seg.endFt - seg.startFt) / n;
    return Array.from({ length: n }, (_, i) => {
      const a = seg.startFt + i * len;
      const b = i === n - 1 ? seg.endFt : a + len;
      const covers = coversOf(a, b);
      return {
        ...seg,
        startFt: a,
        endFt: b,
        coverFt: covers.length ? Math.min(...covers) : seg.coverFt,
      };
    });
  });
  return { ...c, segments };
}
