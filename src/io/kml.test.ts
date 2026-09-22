import { describe, it, expect } from 'vitest';
import { parseKml, parseCoordinates } from './kml';

const SAMPLE_KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Test Drive</name>
    <Folder>
      <name>Alignment</name>
      <Placemark>
        <name>Drive A</name>
        <LineString>
          <coordinates>-97.0,30.0,100 -96.999,30.0,105 -96.999,30.001,110</coordinates>
        </LineString>
      </Placemark>
      <Placemark>
        <name>BH-1</name>
        <Point><coordinates>-96.9995,30.0005,102</coordinates></Point>
      </Placemark>
    </Folder>
    <Placemark>
      <name>Alternate</name>
      <MultiGeometry>
        <LineString><coordinates>-97.1,30.1,90 -97.099,30.1</coordinates></LineString>
        <Point><coordinates>-97.05,30.05</coordinates></Point>
      </MultiGeometry>
    </Placemark>
  </Document>
</kml>`;

describe('parseCoordinates', () => {
  it('parses lon,lat,alt tuples', () => {
    const v = parseCoordinates('-97.0,30.0,100 -96.999,30.0');
    expect(v).toHaveLength(2);
    expect(v[0]).toEqual({ lon: -97.0, lat: 30.0, altM: 100 });
    expect(v[1]).toEqual({ lon: -96.999, lat: 30.0 });
  });

  it('rejects out-of-range coordinates', () => {
    expect(() => parseCoordinates('200,30')).toThrow(/out of range/);
    expect(() => parseCoordinates('-97,95')).toThrow(/out of range/);
  });

  it('rejects malformed tuples', () => {
    expect(() => parseCoordinates('abc')).toThrow(/Malformed|Non-numeric/);
  });
});

describe('parseKml', () => {
  it('extracts LineStrings and Points through nested folders', () => {
    const { lineStrings, points } = parseKml(SAMPLE_KML);
    expect(lineStrings).toHaveLength(2);
    // Traversal emits document-level placemarks before folder contents;
    // look up by name rather than position.
    const driveA = lineStrings.find((l) => l.name === 'Drive A')!;
    const alternate = lineStrings.find((l) => l.name === 'Alternate')!;
    expect(driveA.vertices).toHaveLength(3);
    expect(driveA.vertices[0]).toEqual({ lon: -97.0, lat: 30.0, altM: 100 });
    // second vertex has no altitude
    expect(alternate.vertices[1]).toEqual({ lon: -97.099, lat: 30.1 });

    expect(points).toHaveLength(2);
    const bh1 = points.find((p) => p.name === 'BH-1')!;
    expect(bh1).toMatchObject({ lon: -96.9995, lat: 30.0005, altM: 102 });
    const altPt = points.find((p) => p.name === 'Alternate')!;
    expect(altPt).toMatchObject({ lon: -97.05, lat: 30.05 });
    expect(altPt.altM).toBeUndefined();
  });

  it('throws KML_PARSE_ERROR on invalid XML', () => {
    expect(() => parseKml('<<< not xml')).toThrow(/parse failed/i);
  });
});
