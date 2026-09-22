/**
 * OSM → crossings: tag classification, alignment intersection, station
 * referencing, and dedupe. Pure — no network.
 */
import {
  booleanIntersects,
  centroid,
  lineIntersect,
  lineString,
  polygon,
} from '@turf/turf';
import type { Feature, LineString as LineStringGeom, Polygon as PolygonGeom } from 'geojson';
import type { Station } from '../geo/types';
import { projectToAlignment } from '../geotech/borings';
import type { Crossing, CrossingKind, OverpassElement } from './types';
import type { NWIFeature } from './nwi';

/** Station window for merging duplicate ways (dual carriageways, split ways). */
export const DEDUPE_WINDOW_FT = 100;

interface Classified {
  kind: CrossingKind;
  name: string;
  detail: string;
}

/** Classify an Overpass element from its tags. Null when not a crossing class. */
export function classifyElement(el: OverpassElement): Classified | null {
  const tags = el.tags ?? {};
  const pick = (key: string, kind: CrossingKind, fallback: string): Classified | null => {
    const v = tags[key];
    if (!v) return null;
    return {
      kind,
      name: tags.name || tags.ref || fallback,
      detail: `${key}=${v}`,
    };
  };
  return (
    pick('highway', 'road', 'unnamed road') ??
    pick('railway', 'rail', 'unnamed railway') ??
    pick('waterway', 'water', 'unnamed waterway') ??
    (tags.building
      ? { kind: 'building', name: tags.name || 'building', detail: `building=${tags.building}` }
      : null) ??
    (tags.power === 'line'
      ? { kind: 'utility', name: tags.name || 'power line', detail: 'power=line' }
      : null) ??
    (tags.man_made === 'pipeline'
      ? { kind: 'utility', name: tags.name || 'pipeline', detail: 'man_made=pipeline' }
      : null)
  );
}

function alignmentLine(stations: Station[]): Feature<LineStringGeom> {
  return lineString(stations.map((s) => [s.lon, s.lat]));
}

/** First (lowest-station) intersection of an OSM line with the alignment. */
function firstLineHit(
  coords: [number, number][],
  align: Feature<LineStringGeom>,
  stations: Station[],
): { lat: number; lon: number; stationFt: number; offsetFt: number } | null {
  if (coords.length < 2) return null;
  const hits = lineIntersect(lineString(coords), align);
  if (hits.features.length === 0) return null;
  let best: { lat: number; lon: number; stationFt: number; offsetFt: number } | null = null;
  for (const f of hits.features) {
    const c = f.geometry.coordinates;
    if (c.length < 2) continue;
    const lon = c[0] as number;
    const lat = c[1] as number;
    const p = projectToAlignment(lat, lon, stations);
    if (!best || p.stationFt < best.stationFt) {
      best = { lat, lon, stationFt: p.stationFt, offsetFt: p.offsetFt };
    }
  }
  return best;
}

/** Building (closed way): boundary hits, else centroid projection. */
function buildingHit(
  coords: [number, number][],
  align: Feature<LineStringGeom>,
  stations: Station[],
): { lat: number; lon: number; stationFt: number; offsetFt: number } | null {
  if (coords.length < 4) return null;
  const ring = [...coords];
  const first = ring[0]!;
  const lastPt = ring[ring.length - 1]!;
  if (first[0] !== lastPt[0] || first[1] !== lastPt[1]) ring.push(first);
  const poly = polygon([ring]) as Feature<PolygonGeom>;
  if (!booleanIntersects(align, poly)) return null;
  const boundary = firstLineHit(ring, align, stations);
  if (boundary) return boundary;
  const cc = centroid(poly).geometry.coordinates;
  if (cc.length < 2) return null;
  const clon = cc[0] as number;
  const clat = cc[1] as number;
  const p = projectToAlignment(clat, clon, stations);
  return { lat: clat, lon: clon, stationFt: p.stationFt, offsetFt: p.offsetFt };
}

/**
 * Detect wetland crossings from NWI polygon features: boundary hits, else
 * centroid projection — same treatment as buildings. Sorted by station;
 * dedupe (100 ft, same kind+name) is left to the caller via mergeCrossings.
 */
export function detectWetlandCrossings(
  features: NWIFeature[],
  stations: Station[],
): Crossing[] {
  const align = alignmentLine(stations);
  const found: Crossing[] = [];
  for (const f of features) {
    let hit: { lat: number; lon: number; stationFt: number; offsetFt: number } | null = null;
    for (const ring of f.rings) {
      hit = buildingHit(ring, align, stations);
      if (hit) break;
    }
    if (!hit) continue;
    found.push({
      id: `nwi/${f.objectId}`,
      kind: 'wetland',
      name: f.wetlandType,
      detail: `NWI ${f.attribute} · ${f.acres.toFixed(1)} ac — field verify`,
      stationFt: hit.stationFt,
      offsetFt: hit.offsetFt,
      lat: hit.lat,
      lon: hit.lon,
      osmType: 'nwi',
      osmId: f.objectId,
    });
  }
  found.sort((a, b) => a.stationFt - b.stationFt);
  return found;
}

/** Merge crossing lists, sort by station, dedupe same kind+name within 100 ft. */
export function mergeCrossings(lists: Crossing[][]): Crossing[] {
  const found = lists.flat().sort((a, b) => a.stationFt - b.stationFt);
  const deduped: Crossing[] = [];
  for (const c of found) {
    const prev = deduped[deduped.length - 1];
    if (
      prev &&
      prev.kind === c.kind &&
      prev.name === c.name &&
      Math.abs(c.stationFt - prev.stationFt) <= DEDUPE_WINDOW_FT
    ) {
      continue;
    }
    deduped.push(c);
  }
  return deduped;
}
/**
 * Detect crossings: classify each element, intersect with the alignment,
 * reference to station, drop non-hits, dedupe.
 */
export function detectCrossings(
  elements: OverpassElement[],
  stations: Station[],
): Crossing[] {
  const align = alignmentLine(stations);
  const found: Crossing[] = [];
  for (const el of elements) {
    if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) continue;
    const cls = classifyElement(el);
    if (!cls) continue;
    const coords = el.geometry.map((g) => [g.lon, g.lat] as [number, number]);
    const hit =
      cls.kind === 'building'
        ? buildingHit(coords, align, stations)
        : firstLineHit(coords, align, stations);
    if (!hit) continue;
    found.push({
      id: `${el.type}/${el.id}`,
      kind: cls.kind,
      name: cls.name,
      detail: cls.detail,
      stationFt: hit.stationFt,
      offsetFt: hit.offsetFt,
      lat: hit.lat,
      lon: hit.lon,
      osmType: el.type,
      osmId: el.id,
    });
  }
  return mergeCrossings([found]);
}
