/**
 * KML parsing — pure, DOM-free (fast-xml-parser) so it runs in Vitest/node.
 * Extracts Placemarks recursively through Document/Folder nesting.
 */
import { XMLParser } from 'fast-xml-parser';
import type { KmlVertex } from '../geo/types';
import { ImportError } from './kmz-errors';

export interface ParsedLineString {
  name: string;
  vertices: KmlVertex[];
}

export interface ParsedPoint {
  name: string;
  lon: number;
  lat: number;
  altM?: number;
}

export interface ParsedKml {
  lineStrings: ParsedLineString[];
  points: ParsedPoint[];
}

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false, // keep raw strings; we validate numbers ourselves
  trimValues: true,
});

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

/** Parse a KML coordinates string: "lon,lat,alt lon,lat,alt ..." (alt optional). */
export function parseCoordinates(text: string): KmlVertex[] {
  const vertices: KmlVertex[] = [];
  const tuples = text.trim().split(/\s+/).filter(Boolean);
  for (const tuple of tuples) {
    const parts = tuple.split(',');
    if (parts.length < 2) {
      throw new ImportError('INVALID_COORDINATE', `Malformed coordinate tuple: "${tuple}"`);
    }
    const lon = Number(parts[0]);
    const lat = Number(parts[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      throw new ImportError('INVALID_COORDINATE', `Non-numeric coordinate: "${tuple}"`);
    }
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      throw new ImportError('INVALID_COORDINATE', `Coordinate out of range: "${tuple}"`);
    }
    const v: KmlVertex = { lon, lat };
    if (parts.length >= 3 && parts[2] !== '' && Number.isFinite(Number(parts[2]))) {
      v.altM = Number(parts[2]);
    }
    vertices.push(v);
  }
  return vertices;
}

interface RawPlacemark {
  name?: string;
  Point?: { coordinates?: string };
  LineString?: { coordinates?: string };
  MultiGeometry?: {
    Point?: { coordinates?: string } | { coordinates?: string }[];
    LineString?: { coordinates?: string } | { coordinates?: string }[];
  };
}

function collectPlacemarks(node: unknown, out: RawPlacemark[]): void {
  if (node === null || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  for (const pm of asArray(obj['Placemark'] as RawPlacemark | RawPlacemark[] | undefined)) {
    out.push(pm);
  }
  for (const folder of asArray(obj['Folder'] as unknown)) {
    collectPlacemarks(folder, out);
  }
  // Document may nest directly under kml root or inside folders
  if (obj['Document'] !== undefined) collectPlacemarks(obj['Document'], out);
}

function placemarkName(pm: RawPlacemark, fallback: string): string {
  const n = typeof pm.name === 'string' ? pm.name.trim() : '';
  return n === '' ? fallback : n;
}

export function parseKml(xml: string): ParsedKml {
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch (e) {
    throw new ImportError(
      'KML_PARSE_ERROR',
      `KML XML parse failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  const root = (doc as Record<string, unknown>)?.['kml'] ?? doc;
  const placemarks: RawPlacemark[] = [];
  collectPlacemarks(root, placemarks);

  const lineStrings: ParsedLineString[] = [];
  const points: ParsedPoint[] = [];
  let unnamed = 0;
  const nextUnnamed = () => `unnamed-${++unnamed}`;

  for (const pm of placemarks) {
    const name = placemarkName(pm, nextUnnamed());

    for (const ls of asArray(pm.LineString)) {
      if (typeof ls?.coordinates !== 'string') continue;
      const vertices = parseCoordinates(ls.coordinates);
      if (vertices.length > 0) lineStrings.push({ name, vertices });
    }
    for (const pt of asArray(pm.Point)) {
      if (typeof pt?.coordinates !== 'string') continue;
      const [v] = parseCoordinates(pt.coordinates);
      if (v) points.push({ name, lon: v.lon, lat: v.lat, ...(v.altM !== undefined ? { altM: v.altM } : {}) });
    }
    const mg = pm.MultiGeometry;
    if (mg) {
      for (const ls of asArray(mg.LineString)) {
        if (typeof ls?.coordinates !== 'string') continue;
        const vertices = parseCoordinates(ls.coordinates);
        if (vertices.length > 0) lineStrings.push({ name, vertices });
      }
      for (const pt of asArray(mg.Point)) {
        if (typeof pt?.coordinates !== 'string') continue;
        const [v] = parseCoordinates(pt.coordinates);
        if (v) points.push({ name, lon: v.lon, lat: v.lat, ...(v.altM !== undefined ? { altM: v.altM } : {}) });
      }
    }
  }

  return { lineStrings, points };
}
