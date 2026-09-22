/**
 * Profile builder — pure geospatial core. Resolves the tunnel vertical
 * alignment (invert) at every station from designer control points and
 * derives crown, cover, and depth-to-invert.
 *
 * coverFt = groundElevFt − crownElevFt
 * depthToInvertFt = groundElevFt − invertElevFt
 */
import type {
  ProfileControlPoint,
  ProfileInput,
  ProfileResult,
  ProfileStation,
  ProfileWarning,
  Station,
} from './types';

export type ProfileErrorCode =
  | 'NO_STATIONS'
  | 'NO_CONTROL_POINTS'
  | 'DUPLICATE_CONTROL_STATION'
  | 'CONTROL_NOT_SORTED'
  | 'INVALID_PIPE_OD';

export class ProfileError extends Error {
  readonly code: ProfileErrorCode;
  constructor(code: ProfileErrorCode, message: string) {
    super(message);
    this.name = 'ProfileError';
    this.code = code;
  }
}

/** Invert elevation at any chainage: linear between control points, flat beyond. */
export function invertAt(chainageFt: number, controlPoints: ProfileControlPoint[]): number {
  const cps = controlPoints;
  if (chainageFt <= cps[0]!.stationFt) return cps[0]!.invertElevFt;
  const last = cps[cps.length - 1]!;
  if (chainageFt >= last.stationFt) return last.invertElevFt;
  for (let i = 1; i < cps.length; i++) {
    const prev = cps[i - 1]!;
    const next = cps[i]!;
    if (chainageFt <= next.stationFt) {
      const t = (chainageFt - prev.stationFt) / (next.stationFt - prev.stationFt);
      return prev.invertElevFt + t * (next.invertElevFt - prev.invertElevFt);
    }
  }
  return last.invertElevFt; // unreachable
}

function validateInput(stations: Station[], input: ProfileInput): void {
  if (stations.length === 0) {
    throw new ProfileError('NO_STATIONS', 'Profile needs at least one station.');
  }
  const cps = input.controlPoints;
  if (cps.length === 0) {
    throw new ProfileError('NO_CONTROL_POINTS', 'Define at least one invert control point.');
  }
  if (!(input.pipeODFt > 0)) {
    throw new ProfileError(
      'INVALID_PIPE_OD',
      `Pipe OD must be positive, got ${input.pipeODFt}.`,
    );
  }
  const seen = new Set<number>();
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i]!;
    if (!Number.isFinite(cp.stationFt) || !Number.isFinite(cp.invertElevFt)) {
      throw new ProfileError('NO_CONTROL_POINTS', `Control point ${i + 1} has invalid numbers.`);
    }
    if (seen.has(cp.stationFt)) {
      throw new ProfileError(
        'DUPLICATE_CONTROL_STATION',
        `Duplicate control station at ${cp.stationFt} ft.`,
      );
    }
    seen.add(cp.stationFt);
    if (i > 0 && cp.stationFt < cps[i - 1]!.stationFt) {
      throw new ProfileError(
        'CONTROL_NOT_SORTED',
        'Control points must be ordered by ascending station.',
      );
    }
  }
}

export function buildProfile(stations: Station[], input: ProfileInput): ProfileResult {
  validateInput(stations, input);
  const cps = input.controlPoints;
  const warnings: ProfileWarning[] = [];

  const firstStation = stations[0]!.chainageFt;
  const lastStation = stations[stations.length - 1]!.chainageFt;
  if (cps[0]!.stationFt > firstStation || cps[cps.length - 1]!.stationFt < lastStation) {
    warnings.push({
      code: 'CLAMPED_CONTROL_POINT',
      message:
        'A control point lies outside the station range — invert held flat beyond the outer control points.',
    });
  }

  let missingGround = 0;
  const profile: ProfileStation[] = stations.map((s) => {
    const invertElevFt = invertAt(s.chainageFt, cps);
    const crownElevFt = invertElevFt + input.pipeODFt;
    const ps: ProfileStation = { ...s, invertElevFt, crownElevFt };
    if (s.groundElevFt !== undefined) {
      ps.coverFt = s.groundElevFt - crownElevFt;
      ps.depthToInvertFt = s.groundElevFt - invertElevFt;
    } else {
      missingGround++;
    }
    return ps;
  });

  if (missingGround > 0) {
    warnings.push({
      code: 'MISSING_GROUND_ELEV',
      message: `${missingGround} station(s) lack ground elevation — cover and depth not computed there.`,
    });
  }

  const withCover = profile.filter((p) => p.coverFt !== undefined);
  const negatives = withCover.filter((p) => p.coverFt! < 0);
  if (negatives.length > 0) {
    const worst = negatives.reduce((a, b) => (a.coverFt! < b.coverFt! ? a : b));
    warnings.push({
      code: 'NEGATIVE_COVER',
      message: `Negative cover at ${negatives.length} station(s) — tunnel daylights (worst ${worst.coverFt!.toFixed(1)} ft).`,
      stationFt: worst.chainageFt,
    });
  }
  const shallow = withCover.filter((p) => p.coverFt! >= 0 && p.coverFt! < input.pipeODFt);
  if (shallow.length > 0) {
    const worst = shallow.reduce((a, b) => (a.coverFt! < b.coverFt! ? a : b));
    warnings.push({
      code: 'SHALLOW_COVER',
      // Heuristic project flag, not an ASCE 36-15 criterion.
      message: `Cover < 1 pipe OD at ${shallow.length} station(s) — review settlement/jacking assumptions (worst ${worst.coverFt!.toFixed(1)} ft).`,
      stationFt: worst.chainageFt,
    });
  }

  return { stations: profile, warnings };
}
