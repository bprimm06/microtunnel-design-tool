/**
 * Boring geotech helpers — pure. Projection via Turf geodesic math;
 * meters → feet uses the exact 3.28084 factor.
 */
import { distance, lineString, nearestPointOnLine } from '@turf/turf';
import type { ProfileStation, Station } from '../geo/types';
import { BoringError } from './types';
import type { Boring, Stratum } from './types';

export const M_TO_FT = 3.28084;
/** Default boring termination: invert depth at projected station + this. */
export const BORING_DEPTH_RULE_FT = 20;

export interface Projection {
  stationFt: number;
  offsetFt: number;
  lat: number;
  lon: number;
}

/** Project a lat/lon onto the alignment: chainage + transverse offset.
 *
 * Chainage is interpolated from the stations' own `chainageFt` values at the
 * snapped location, so projection always agrees with the station table even
 * if chainage is not raw geodesic distance. Offset is the geodesic distance
 * from the point to the line.
 */
export function projectToAlignment(
  lat: number,
  lon: number,
  stations: Station[],
): Projection {
  if (stations.length === 0) {
    throw new BoringError('NO_ALIGNMENT', 'Cannot project a boring with no alignment stations.');
  }
  if (stations.length === 1) {
    const s = stations[0]!;
    return {
      stationFt: s.chainageFt,
      offsetFt: distance([s.lon, s.lat], [lon, lat], { units: 'meters' }) * M_TO_FT,
      lat: s.lat,
      lon: s.lon,
    };
  }
  const line = lineString(stations.map((s) => [s.lon, s.lat]));
  const snapped = nearestPointOnLine(line, [lon, lat], { units: 'meters' });
  const [slon, slat] = snapped.geometry.coordinates as [number, number];

  // Find the segment containing the snapped point: d1 + d2 ≈ segLen.
  let segIdx = 0;
  let bestErr = Infinity;
  for (let i = 0; i < stations.length - 1; i++) {
    const a = stations[i]!;
    const b = stations[i + 1]!;
    const d1 = distance([a.lon, a.lat], [slon, slat], { units: 'meters' });
    const d2 = distance([slon, slat], [b.lon, b.lat], { units: 'meters' });
    const seg = distance([a.lon, a.lat], [b.lon, b.lat], { units: 'meters' });
    const err = Math.abs(d1 + d2 - seg);
    if (err < bestErr) {
      bestErr = err;
      segIdx = i;
    }
  }
  const a = stations[segIdx]!;
  const b = stations[segIdx + 1]!;
  const d1 = distance([a.lon, a.lat], [slon, slat], { units: 'meters' });
  const seg = distance([a.lon, a.lat], [b.lon, b.lat], { units: 'meters' });
  const t = seg > 0 ? Math.min(1, Math.max(0, d1 / seg)) : 0;

  return {
    stationFt: a.chainageFt + t * (b.chainageFt - a.chainageFt),
    offsetFt: (snapped.properties.dist as number) * M_TO_FT,
    lat: slat,
    lon: slon,
  };
}

/** Invert depth (ground − invert) at any chainage by linear interpolation. */
export function depthToInvertAt(
  stationFt: number,
  profile: ProfileStation[],
): number | undefined {
  const withDepth = profile.filter((p) => p.depthToInvertFt !== undefined);
  if (withDepth.length === 0) return undefined;
  const first = withDepth[0]!;
  const last = withDepth[withDepth.length - 1]!;
  if (stationFt <= first.chainageFt) return first.depthToInvertFt;
  if (stationFt >= last.chainageFt) return last.depthToInvertFt;
  for (let i = 1; i < withDepth.length; i++) {
    const prev = withDepth[i - 1]!;
    const next = withDepth[i]!;
    if (stationFt <= next.chainageFt) {
      const t = (stationFt - prev.chainageFt) / (next.chainageFt - prev.chainageFt);
      return prev.depthToInvertFt! + t * (next.depthToInvertFt! - prev.depthToInvertFt!);
    }
  }
  return last.depthToInvertFt;
}

/** Ground elevation at any chainage by linear interpolation. */
export function groundElevAt(
  stationFt: number,
  profile: ProfileStation[],
): number | undefined {
  const withGround = profile.filter((p) => p.groundElevFt !== undefined);
  if (withGround.length === 0) return undefined;
  const first = withGround[0]!;
  const last = withGround[withGround.length - 1]!;
  if (stationFt <= first.chainageFt) return first.groundElevFt;
  if (stationFt >= last.chainageFt) return last.groundElevFt;
  for (let i = 1; i < withGround.length; i++) {
    const prev = withGround[i - 1]!;
    const next = withGround[i]!;
    if (stationFt <= next.chainageFt) {
      const t = (stationFt - prev.chainageFt) / (next.chainageFt - prev.chainageFt);
      return prev.groundElevFt! + t * (next.groundElevFt! - prev.groundElevFt!);
    }
  }
  return last.groundElevFt;
}

export interface RuleDepth {
  depthFt: number;
  derivation: string;
}

/**
 * Default boring depth from the +20 ft rule. Returns null when the profile
 * cannot supply an invert depth at the station (caller then requires manual depth).
 */
export function defaultBoringDepth(
  stationFt: number,
  profile: ProfileStation[] | null,
): RuleDepth | null {
  if (!profile || profile.length === 0) return null;
  const d = depthToInvertAt(stationFt, profile);
  if (d === undefined) return null;
  const depthFt = d + BORING_DEPTH_RULE_FT;
  return {
    depthFt,
    derivation:
      `invert depth ${d.toFixed(1)} ft + ${BORING_DEPTH_RULE_FT} ft = ${depthFt.toFixed(1)} ft` +
      ` @ ${formatStationShort(stationFt)}`,
  };
}

function formatStationShort(ft: number): string {
  const hundreds = Math.floor(ft / 100);
  const rem = Math.round(ft - hundreds * 100);
  return `${hundreds}+${String(rem).padStart(2, '0')}`;
}

/** Next auto-name: B-1, B-2, … skipping names already taken. */
export function nextBoringName(existing: Pick<Boring, 'name'>[]): string {
  const taken = new Set(existing.map((b) => b.name));
  let n = 1;
  while (taken.has(`B-${n}`)) n++;
  return `B-${n}`;
}

/**
 * Create a boring at a lat/lon: project to the alignment, apply the +20 ft
 * rule depth when a profile is available, otherwise manual depth.
 */
export function buildBoring(
  lat: number,
  lon: number,
  existing: Pick<Boring, 'name'>[],
  stations: Station[],
  profileStations: ProfileStation[] | null,
): Boring {
  const { stationFt, offsetFt } = projectToAlignment(lat, lon, stations);
  const rule = defaultBoringDepth(stationFt, profileStations);
  return {
    id: crypto.randomUUID(),
    name: nextBoringName(existing),
    lat,
    lon,
    stationFt,
    offsetFt,
    groundElevFt: profileStations ? groundElevAt(stationFt, profileStations) : undefined,
    depthFt: rule ? rule.depthFt : 0,
    depthSource: rule ? 'rule' : 'manual',
    depthDerivation: rule ? rule.derivation : 'No profile — enter depth manually.',
    strata: [],
  };
}

/** Validate a boring's depth value. */
export function validateDepth(depthFt: number): void {
  if (!Number.isFinite(depthFt) || depthFt <= 0) {
    throw new BoringError('INVALID_DEPTH', `Boring depth must be positive, got ${depthFt}.`);
  }
}

/** Validate strata: ordered, non-overlapping, within [0, depthFt]. Throws BoringError. */
export function validateStrata(strata: Stratum[], depthFt: number): void {
  const sorted = [...strata].sort((a, b) => a.topDepthFt - b.topDepthFt);
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]!;
    const label = `Stratum ${i + 1}${s.description ? ` (${s.description})` : ''}`;
    if (!Number.isFinite(s.topDepthFt) || !Number.isFinite(s.bottomDepthFt)) {
      throw new BoringError('INVALID_STRATA', `${label}: top and bottom must be numbers.`);
    }
    if (s.topDepthFt < 0) {
      throw new BoringError('INVALID_STRATA', `${label}: top cannot be above ground surface.`);
    }
    if (s.bottomDepthFt <= s.topDepthFt) {
      throw new BoringError('INVALID_STRATA', `${label}: bottom must be deeper than top.`);
    }
    if (s.bottomDepthFt > depthFt) {
      throw new BoringError(
        'INVALID_STRATA',
        `${label}: bottom (${s.bottomDepthFt} ft) exceeds boring depth (${depthFt} ft).`,
      );
    }
    if (i > 0 && s.topDepthFt < sorted[i - 1]!.bottomDepthFt) {
      throw new BoringError('INVALID_STRATA', `${label}: overlaps the previous stratum.`);
    }
  }
}
