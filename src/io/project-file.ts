/**
 * Project file save/open — one JSON document holding all durable project
 * state. Pure: serialize/parse/validate here, DOM and app state at the edges.
 */
import type { ProjectState } from '../state/ProjectContext';

export const PROJECT_FILE_VERSION = 1;
export const PROJECT_FILE_EXT = '.microtunnel.json';

export type ProjectFileErrorCode = 'INVALID_JSON' | 'UNSUPPORTED_VERSION' | 'INVALID_SCHEMA';

export class ProjectFileError extends Error {
  readonly code: ProjectFileErrorCode;
  constructor(code: ProjectFileErrorCode, message: string) {
    super(message);
    this.name = 'ProjectFileError';
    this.code = code;
  }
}

/** Durable project state — everything needed to restore the project. */
export interface ProjectFileData {
  projectName: string;
  alignment: ProjectState['alignment'];
  waypoints: ProjectState['waypoints'];
  importWarnings: string[];
  profile: ProjectState['profile'];
  borings: ProjectState['borings'];
  cases: ProjectState['cases'];
  selectedCaseId: string | null;
  crossings: ProjectState['crossings'];
}

interface ProjectFile extends ProjectFileData {
  version: number;
  savedAt: string;
  appNote: string;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isArr = (v: unknown): v is unknown[] => Array.isArray(v);

/** Extract the durable slice of live state. Transient UI is excluded. */
export function toProjectFileData(state: ProjectState): ProjectFileData {
  return {
    projectName: state.projectName,
    alignment: state.alignment,
    waypoints: state.waypoints,
    importWarnings: state.importWarnings,
    profile: state.profile,
    borings: state.borings,
    cases: state.cases,
    selectedCaseId: state.selectedCaseId,
    crossings: state.crossings,
  };
}

export function serializeProject(state: ProjectState): string {
  const file: ProjectFile = {
    version: PROJECT_FILE_VERSION,
    savedAt: new Date().toISOString(),
    appNote: 'Microtunnel design tool project file',
    ...toProjectFileData(state),
  };
  return JSON.stringify(file, null, 2);
}

function fail(field: string): never {
  throw new ProjectFileError('INVALID_SCHEMA', `Project file is invalid: bad or missing "${field}".`);
}

/** Parse + structurally validate a project file. Throws ProjectFileError. */
export function parseProjectFile(text: string): ProjectFileData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ProjectFileError('INVALID_JSON', 'File is not valid JSON.');
  }
  if (typeof raw !== 'object' || raw === null) return fail('root');
  const f = raw as Record<string, unknown>;

  if (f.version !== PROJECT_FILE_VERSION) {
    throw new ProjectFileError(
      'UNSUPPORTED_VERSION',
      `Unsupported project file version (${String(f.version)}); this app reads version ${PROJECT_FILE_VERSION}.`,
    );
  }
  if (!isStr(f.projectName)) return fail('projectName');

  const alignment = f.alignment;
  if (alignment !== null) {
    if (typeof alignment !== 'object' || alignment === null) return fail('alignment');
    const stations = (alignment as Record<string, unknown>).stations;
    if (!isArr(stations) || stations.length === 0) return fail('alignment.stations');
    for (const s of stations) {
      if (typeof s !== 'object' || s === null) return fail('alignment.stations[]');
      const st = s as Record<string, unknown>;
      if (!isNum(st.chainageFt) || !isNum(st.lat) || !isNum(st.lon)) {
        return fail('alignment.stations[]');
      }
    }
  }

  const profile = f.profile;
  if (profile !== null && (typeof profile !== 'object' || profile === null)) {
    return fail('profile');
  }

  for (const [key, check] of [
    ['waypoints', isArr],
    ['importWarnings', isArr],
    ['borings', isArr],
    ['cases', isArr],
    ['crossings', isArr],
  ] as const) {
    if (!check(f[key])) return fail(key);
  }
  if (f.selectedCaseId !== null && !isStr(f.selectedCaseId)) return fail('selectedCaseId');

  for (const b of f.borings as unknown[]) {
    const bb = b as Record<string, unknown>;
    if (!isNum(bb?.stationFt) || !isNum(bb?.lat) || !isNum(bb?.lon) || !isNum(bb?.depthFt)) {
      return fail('borings[]');
    }
  }
  for (const x of f.crossings as unknown[]) {
    const xx = x as Record<string, unknown>;
    if (!isNum(xx?.stationFt) || !isNum(xx?.lat) || !isNum(xx?.lon) || !isStr(xx?.kind)) {
      return fail('crossings[]');
    }
  }

  return {
    projectName: f.projectName as string,
    alignment: alignment as ProjectFileData['alignment'],
    waypoints: f.waypoints as ProjectFileData['waypoints'],
    importWarnings: (f.importWarnings as unknown[]).filter(isStr),
    profile: profile as ProjectFileData['profile'],
    borings: f.borings as ProjectFileData['borings'],
    cases: f.cases as ProjectFileData['cases'],
    selectedCaseId: f.selectedCaseId as string | null,
    crossings: f.crossings as ProjectFileData['crossings'],
  };
}

/** Suggested download filename for a project file. */
export function projectFileName(projectName: string, savedAt: string): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const day = new Date(savedAt).toISOString().slice(0, 10);
  return `${slug || 'project'}-${day}${PROJECT_FILE_EXT}`;
}
