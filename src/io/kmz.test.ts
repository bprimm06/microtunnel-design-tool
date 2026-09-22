import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { importFile } from './kmz';
import { ImportError } from './kmz-errors';

const KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
<Placemark><name>Drive A</name><LineString>
<coordinates>-97.0,30.0,100 -96.999,30.0,105 -96.999,30.001,110</coordinates>
</LineString></Placemark>
<Placemark><name>Short</name><LineString>
<coordinates>-97.5,30.5,90 -97.4999,30.5,91</coordinates>
</LineString></Placemark>
<Placemark><name>BH-1</name><Point><coordinates>-96.9995,30.0005,102</coordinates></Point></Placemark>
</Document></kml>`;

async function kmzBytes(kml: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('doc.kml', kml);
  return zip.generateAsync({ type: 'arraybuffer' });
}

const strBytes = (s: string) => new TextEncoder().encode(s).buffer;

describe('importFile', () => {
  it('round-trips a KMZ: longest LineString becomes the active alignment', async () => {
    const result = await importFile(await kmzBytes(KML), 'drive.kmz');
    expect(result.alignments).toHaveLength(2);
    // "Drive A" (~2x longer than "Short") is first
    expect(result.alignments[0]!.name).toBe('Drive A');
    const a = result.alignments[0]!;
    expect(a.source).toBe('kmz');
    expect(a.lengthFt).toBeGreaterThan(0);
    expect(a.stations[0]!.chainageFt).toBe(0);
    expect(a.stations[a.stations.length - 1]!.chainageFt).toBeCloseTo(a.lengthFt, 6);
    // elevations converted m -> ft and flagged GE
    expect(a.stations[0]!.groundElevFt).toBeCloseTo(100 * 3.28084, 6);
    expect(a.stations[0]!.elevSource).toBe('ge');
    expect(result.warnings.some((w) => /Multiple LineStrings/.test(w))).toBe(true);
  });

  it('accepts a plain .kml file', async () => {
    const result = await importFile(strBytes(KML), 'drive.kml');
    expect(result.alignments[0]!.source).toBe('kml');
    expect(result.waypoints).toHaveLength(1);
    expect(result.waypoints[0]).toMatchObject({
      name: 'BH-1',
      elevSource: 'ge',
    });
    expect(result.waypoints[0]!.elevFt).toBeCloseTo(102 * 3.28084, 6);
  });

  it('rejects garbage bytes with NOT_KMZ_OR_KML', async () => {
    await expect(importFile(strBytes('hello world'), 'drive.kmz')).rejects.toMatchObject({
      code: 'NOT_KMZ_OR_KML',
    });
  });

  it('rejects a zip with no KML inside', async () => {
    const zip = new JSZip();
    zip.file('readme.txt', 'nothing here');
    const buf = await zip.generateAsync({ type: 'arraybuffer' });
    await expect(importFile(buf, 'empty.kmz')).rejects.toMatchObject({
      code: 'NO_KML_IN_ARCHIVE',
    });
  });

  it('rejects KML with no LineString', async () => {
    const kml = `<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
      <Placemark><name>P</name><Point><coordinates>-97,30</coordinates></Point></Placemark>
      </Document></kml>`;
    await expect(importFile(await kmzBytes(kml), 'pts.kmz')).rejects.toMatchObject({
      code: 'NO_LINESTRING',
    });
  });

  it('skips degenerate LineStrings but keeps usable ones', async () => {
    const kml = `<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
      <Placemark><name>Bad</name><LineString><coordinates>-97,30</coordinates></LineString></Placemark>
      <Placemark><name>Good</name><LineString><coordinates>-97,30,100 -96.999,30,100</coordinates></LineString></Placemark>
      </Document></kml>`;
    const result = await importFile(await kmzBytes(kml), 'mix.kmz');
    expect(result.alignments).toHaveLength(1);
    expect(result.alignments[0]!.name).toBe('Good');
    expect(result.warnings.some((w) => /"Bad" skipped/.test(w))).toBe(true);
  });

  it('ImportError carries its code', () => {
    const e = new ImportError('NO_LINESTRING', 'x');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('NO_LINESTRING');
  });
});
