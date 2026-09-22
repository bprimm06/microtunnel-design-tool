/**
 * KMZ/KML file import — I/O layer. Accepts raw file bytes, returns a fully
 * stationed ImportResult. Throws ImportError with stable codes on bad input.
 */
import JSZip from 'jszip';
import { parseKml } from './kml';
import { buildAlignment } from '../geo/stationing';
import { M_TO_FT } from '../geo/stationing';
import type { AlignmentGeometry, ImportResult, KmlWaypoint } from '../geo/types';
import { ImportError } from './kmz-errors';

function isZip(data: Uint8Array): boolean {
  return data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04;
}

function looksLikeKmlText(data: Uint8Array): boolean {
  const head = new TextDecoder().decode(data.slice(0, 200)).trimStart();
  return head.startsWith('<');
}

async function extractKmlText(data: Uint8Array, filename: string): Promise<string> {
  if (isZip(data) || filename.toLowerCase().endsWith('.kmz')) {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(data);
    } catch {
      throw new ImportError('NOT_KMZ_OR_KML', `"${filename}" is not a readable KMZ archive.`);
    }
    const names = Object.keys(zip.files).filter((n) => !zip.files[n]!.dir);
    const kmlName =
      names.find((n) => n.toLowerCase().endsWith('doc.kml')) ??
      names.find((n) => n.toLowerCase().endsWith('.kml'));
    if (!kmlName) {
      throw new ImportError('NO_KML_IN_ARCHIVE', `"${filename}" contains no .kml file.`);
    }
    return zip.files[kmlName]!.async('string');
  }
  if (filename.toLowerCase().endsWith('.kml') || looksLikeKmlText(data)) {
    return new TextDecoder().decode(data);
  }
  throw new ImportError(
    'NOT_KMZ_OR_KML',
    `"${filename}" is neither a KMZ archive nor KML text.`,
  );
}

export async function importFile(data: ArrayBuffer, filename: string): Promise<ImportResult> {
  const bytes = new Uint8Array(data);
  const xml = await extractKmlText(bytes, filename);
  const source = isZip(bytes) || filename.toLowerCase().endsWith('.kmz') ? 'kmz' : 'kml';
  const parsed = parseKml(xml);

  if (parsed.lineStrings.length === 0) {
    throw new ImportError('NO_LINESTRING', `"${filename}" contains no LineString geometry.`);
  }

  const warnings: string[] = [];
  const built: { alignment: AlignmentGeometry; warnings: string[] }[] = [];
  for (const ls of parsed.lineStrings) {
    if (ls.vertices.length < 2) {
      warnings.push(`LineString "${ls.name}" skipped — fewer than 2 vertices.`);
      continue;
    }
    try {
      const b = buildAlignment(ls.name, ls.vertices, source);
      built.push(b);
      warnings.push(...b.warnings.map((w) => `"${ls.name}": ${w}`));
    } catch (e) {
      if (e instanceof ImportError) {
        warnings.push(`LineString "${ls.name}" skipped — ${e.message}`);
      } else {
        throw e;
      }
    }
  }
  if (built.length === 0) {
    throw new ImportError('NO_LINESTRING', `"${filename}" has no usable LineString geometry.`);
  }

  // Longest LineString is the active alignment; the rest are alternates.
  built.sort((a, b) => b.alignment.lengthFt - a.alignment.lengthFt);
  const alignments = built.map((b) => b.alignment);
  if (alignments.length > 1) {
    warnings.push(
      `Multiple LineStrings found — longest ("${alignments[0]!.name}") loaded as the active alignment.`,
    );
  }

  const waypoints: KmlWaypoint[] = parsed.points.map((p) => ({
    name: p.name,
    lat: p.lat,
    lon: p.lon,
    ...(p.altM !== undefined ? { elevFt: p.altM * M_TO_FT, elevSource: 'ge' as const } : {}),
  }));
  if (waypoints.length > 0) {
    warnings.push(
      `${waypoints.length} point(s) imported as candidate borings — boring placement arrives in a later unit.`,
    );
  }

  return { alignments, waypoints, warnings };
}
