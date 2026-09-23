import { describe, it, expect } from 'vitest';
import {
  parseProjectFile,
  projectFileName,
  serializeProject,
  toProjectFileData,
  ProjectFileError,
  PROJECT_FILE_VERSION,
  PROJECT_FILE_EXT,
} from './project-file';
import type { ProjectState } from '../state/ProjectContext';

function state(): ProjectState {
  return {
    projectName: 'Demo <Project>',
    alignment: {
      name: 'Drive A',
      lengthFt: 400,
      stations: [
        { chainageFt: 0, lat: 30, lon: -97, groundElevFt: 100 },
        { chainageFt: 400, lat: 30.001, lon: -96.996, groundElevFt: 96 },
      ],
    },
    waypoints: [],
    importWarnings: ['a warning'],
    profile: null,
    borings: [
      {
        id: 'b1', name: 'B-1', lat: 30, lon: -97, stationFt: 100, offsetFt: 25,
        depthFt: 40, depthSource: 'rule', depthDerivation: 'rule', strata: [],
      },
    ],
    placingBoring: false,
    selectedBoringId: null,
    cases: [],
    selectedCaseId: null,
    crossings: [
      { id: 'way/1', kind: 'road', name: 'Main St', detail: 'highway=primary',
        stationFt: 200, offsetFt: 0, lat: 30, lon: -97, osmType: 'way', osmId: 1 },
    ],
    layers: { alignment: true, borings: true, crossings: true, profile: true },
  } as unknown as ProjectState;
}

describe('project file round-trip', () => {
  it('serializes and parses back the durable slice', () => {
    const s = state();
    const parsed = parseProjectFile(serializeProject(s));
    expect(parsed).toEqual(toProjectFileData(s));
  });

  it('round-trips geGroundElevFt and elevSource on stations', () => {
    const s = state();
    s.alignment!.stations = [
      { chainageFt: 0, lat: 30, lon: -97, groundElevFt: 101.5, geGroundElevFt: 100, elevSource: 'survey' },
      { chainageFt: 400, lat: 30.001, lon: -96.996, groundElevFt: 96, geGroundElevFt: 96, elevSource: 'ge' },
    ];
    const parsed = parseProjectFile(serializeProject(s));
    expect(parsed.alignment!.stations[0]).toMatchObject({
      groundElevFt: 101.5,
      geGroundElevFt: 100,
      elevSource: 'survey',
    });
    expect(parsed.alignment!.stations[1]).toMatchObject({
      groundElevFt: 96,
      geGroundElevFt: 96,
      elevSource: 'ge',
    });
  });

  it('accepts legacy project files without geGroundElevFt', () => {
    const raw = JSON.parse(serializeProject(state())) as {
      alignment: { stations: Record<string, unknown>[] };
    };
    for (const st of raw.alignment.stations) delete st.geGroundElevFt;
    const parsed = parseProjectFile(JSON.stringify(raw));
    expect(parsed.alignment!.stations).toHaveLength(2);
  });

  it('stamps the schema version', () => {
    const raw = JSON.parse(serializeProject(state())) as { version: number };
    expect(raw.version).toBe(PROJECT_FILE_VERSION);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseProjectFile('not json')).toThrow(
      expect.objectContaining({ code: 'INVALID_JSON' }),
    );
    expect(() => parseProjectFile('not json')).toThrow(ProjectFileError);
  });

  it('rejects unsupported versions', () => {
    const raw = JSON.parse(serializeProject(state())) as Record<string, unknown>;
    raw.version = 999;
    expect(() => parseProjectFile(JSON.stringify(raw))).toThrow(
      expect.objectContaining({ code: 'UNSUPPORTED_VERSION' }),
    );
  });

  it('rejects bad shapes', () => {
    const raw = JSON.parse(serializeProject(state())) as Record<string, unknown>;
    const badName = { ...raw, projectName: 42 };
    expect(() => parseProjectFile(JSON.stringify(badName))).toThrow(
      expect.objectContaining({ code: 'INVALID_SCHEMA' }),
    );
    const badStations = {
      ...raw,
      alignment: { name: 'x', stations: [{ chainageFt: 0, lat: NaN, lon: -97 }] },
    };
    expect(() => parseProjectFile(JSON.stringify(badStations))).toThrow(
      expect.objectContaining({ code: 'INVALID_SCHEMA' }),
    );
    // NaN does not survive JSON — simulate with a string coordinate instead
    const badStations2 = {
      ...raw,
      alignment: { name: 'x', stations: [{ chainageFt: 0, lat: 'north', lon: -97 }] },
    };
    expect(() => parseProjectFile(JSON.stringify(badStations2))).toThrow(
      expect.objectContaining({ code: 'INVALID_SCHEMA' }),
    );
  });
});

describe('projectFileName', () => {
  it('builds a safe filename', () => {
    expect(projectFileName('Demo <Project>', '2026-09-22T18:00:00.000Z')).toBe(
      'demo-project-2026-09-22.mtunnel.json',
    );
  });

  it('keeps the extension within Chrome picker limits', () => {
    // Chrome's showSaveFilePicker/showOpenFilePicker reject extensions
    // longer than 16 characters.
    expect(PROJECT_FILE_EXT.length).toBeLessThanOrEqual(16);
  });
});
