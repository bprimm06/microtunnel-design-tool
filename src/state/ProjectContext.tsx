/**
 * Project state — U3: holds the imported alignment, candidate waypoints,
 * import warnings, and the last import error.
 */
import { createContext, useContext, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import type {
  AlignmentGeometry,
  ImportResult,
  KmlWaypoint,
  ProfileInput,
  ProfileResult,
} from '../geo/types';
import type { Boring } from '../geotech/types';
import { defaultBoringDepth } from '../geotech/borings';
import type { CalcCase } from '../cases/types';
import type { Crossing } from '../osm/types';
import type { ProjectFileData } from '../io/project-file';

export interface LayerVisibility {
  alignment: boolean;
  borings: boolean;
  crossings: boolean;
  settlement: boolean;
}

export interface ProfileState {
  input: ProfileInput;
  result: ProfileResult;
}

export interface ProjectState {
  projectName: string;
  alignment: AlignmentGeometry | null;
  waypoints: KmlWaypoint[];
  importWarnings: string[];
  importError: string | null;
  profile: ProfileState | null;
  borings: Boring[];
  placingBoring: boolean;
  selectedBoringId: string | null;
  cases: CalcCase[];
  selectedCaseId: string | null;
  crossings: Crossing[];
  layers: LayerVisibility;
  /** Session-only: the user's chosen save location (never serialized). */
  fileHandle: FileSystemFileHandle | null;
  linkedFileName: string | null;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  saveError: string | null;
  needsReconnect: boolean;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type Action =
  | { type: 'SET_PROJECT_NAME'; name: string }
  | { type: 'TOGGLE_LAYER'; layer: keyof LayerVisibility }
  | { type: 'SET_IMPORT_RESULT'; result: ImportResult }
  | { type: 'SET_IMPORT_ERROR'; message: string }
  | { type: 'SET_PROFILE'; input: ProfileInput; result: ProfileResult }
  | { type: 'CLEAR_PROFILE' }
  | { type: 'CLEAR_ALIGNMENT' }
  | { type: 'ADD_BORING'; boring: Boring }
  | { type: 'UPDATE_BORING'; boring: Boring }
  | { type: 'DELETE_BORING'; id: string }
  | { type: 'SET_PLACING'; placing: boolean }
  | { type: 'SELECT_BORING'; id: string | null }
  | { type: 'ADD_CASE'; c: CalcCase }
  | { type: 'UPDATE_CASE'; c: CalcCase }
  | { type: 'DELETE_CASE'; id: string }
  | { type: 'SELECT_CASE'; id: string | null }
  | { type: 'SET_CROSSINGS'; crossings: Crossing[] }
  | { type: 'CLEAR_CROSSINGS' }
  | { type: 'LOAD_PROJECT'; data: ProjectFileData }
  | { type: 'SET_FILE_LINK'; handle: FileSystemFileHandle | null; fileName: string | null }
  | { type: 'MARK_SAVING' }
  | { type: 'MARK_IDLE' }
  | { type: 'MARK_SAVED'; at: string }
  | { type: 'MARK_SAVE_ERROR'; message: string }
  | { type: 'SET_NEEDS_RECONNECT'; value: boolean };

const initialState: ProjectState = {
  projectName: 'Untitled Project',
  alignment: null,
  waypoints: [],
  importWarnings: [],
  importError: null,
  profile: null,
  borings: [],
  placingBoring: false,
  selectedBoringId: null,
  cases: [],
  selectedCaseId: null,
  crossings: [],
  layers: { alignment: true, borings: true, crossings: true, settlement: false },
  fileHandle: null,
  linkedFileName: null,
  saveStatus: 'idle',
  lastSavedAt: null,
  saveError: null,
  needsReconnect: false,
};

/**
 * Recompute rule-based boring depths against a (new) profile. Overridden and
 * manual borings are never silently changed; they are flagged when the rule
 * depth at their station moved.
 */
function refreshRuleDepths(borings: Boring[], profile: ProfileResult | null): Boring[] {
  return borings.map((b) => {
    const rule = defaultBoringDepth(b.stationFt, profile?.stations ?? null);
    if (b.depthSource === 'rule') {
      if (rule) return { ...b, depthFt: rule.depthFt, depthDerivation: rule.derivation };
      return {
        ...b,
        depthSource: 'manual' as const,
        depthDerivation: `${b.depthDerivation} — profile no longer covers this station; depth kept, verify manually.`,
      };
    }
    if (rule && Math.abs(rule.depthFt - b.depthFt) > 0.05) {
      return {
        ...b,
        depthDerivation: `${b.depthDerivation} — rule now gives ${rule.depthFt.toFixed(1)} ft; kept your value.`,
      };
    }
    return b;
  });
}

function reducer(state: ProjectState, action: Action): ProjectState {
  switch (action.type) {
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.name };
    case 'TOGGLE_LAYER':
      return {
        ...state,
        layers: { ...state.layers, [action.layer]: !state.layers[action.layer] },
      };
    case 'SET_IMPORT_RESULT':
      return {
        ...state,
        alignment: action.result.alignments[0] ?? null,
        waypoints: action.result.waypoints,
        importWarnings: action.result.warnings,
        importError: null,
        profile: null, // new alignment invalidates the old profile
      };
    case 'SET_IMPORT_ERROR':
      return { ...state, importError: action.message };
    case 'SET_PROFILE':
      return {
        ...state,
        profile: { input: action.input, result: action.result },
        borings: refreshRuleDepths(state.borings, action.result),
      };
    case 'CLEAR_PROFILE':
      return {
        ...state,
        profile: null,
        borings: refreshRuleDepths(state.borings, null),
      };
    case 'CLEAR_ALIGNMENT':
      return {
        ...state,
        alignment: null,
        waypoints: [],
        importWarnings: [],
        profile: null,
        borings: [],
        placingBoring: false,
        selectedBoringId: null,
        cases: [],
        selectedCaseId: null,
        crossings: [],
      };
    case 'ADD_BORING':
      return {
        ...state,
        borings: [...state.borings, action.boring],
        selectedBoringId: action.boring.id,
        placingBoring: false,
      };
    case 'UPDATE_BORING':
      return {
        ...state,
        borings: state.borings.map((b) => (b.id === action.boring.id ? action.boring : b)),
      };
    case 'DELETE_BORING':
      return {
        ...state,
        borings: state.borings.filter((b) => b.id !== action.id),
        selectedBoringId:
          state.selectedBoringId === action.id ? null : state.selectedBoringId,
      };
    case 'SET_PLACING':
      return { ...state, placingBoring: action.placing };
    case 'SELECT_BORING':
      return { ...state, selectedBoringId: action.id };
    case 'ADD_CASE':
      return {
        ...state,
        cases: [...state.cases, action.c],
        selectedCaseId: action.c.id,
      };
    case 'UPDATE_CASE':
      return {
        ...state,
        cases: state.cases.map((c) => (c.id === action.c.id ? action.c : c)),
      };
    case 'DELETE_CASE':
      return {
        ...state,
        cases: state.cases.filter((c) => c.id !== action.id),
        selectedCaseId: state.selectedCaseId === action.id ? null : state.selectedCaseId,
      };
    case 'SELECT_CASE':
      return { ...state, selectedCaseId: action.id };
    case 'SET_CROSSINGS':
      return { ...state, crossings: action.crossings };
    case 'CLEAR_CROSSINGS':
      return { ...state, crossings: [] };
    case 'LOAD_PROJECT':
      return {
        ...state,
        projectName: action.data.projectName,
        alignment: action.data.alignment,
        waypoints: action.data.waypoints,
        importWarnings: action.data.importWarnings,
        importError: null,
        profile: action.data.profile,
        borings: action.data.borings,
        placingBoring: false,
        selectedBoringId: null,
        cases: action.data.cases,
        selectedCaseId: action.data.selectedCaseId,
        crossings: action.data.crossings,
      };
    case 'SET_NEEDS_RECONNECT':
      return { ...state, needsReconnect: action.value };
    case 'SET_FILE_LINK':
      return {
        ...state,
        fileHandle: action.handle,
        linkedFileName: action.fileName,
        needsReconnect: false,
        saveError: null,
      };
    case 'MARK_SAVING':
      return { ...state, saveStatus: 'saving', saveError: null };
    case 'MARK_IDLE':
      return { ...state, saveStatus: 'idle', saveError: null };
    case 'MARK_SAVED':
      return { ...state, saveStatus: 'saved', lastSavedAt: action.at, saveError: null };
    case 'MARK_SAVE_ERROR':
      return { ...state, saveStatus: 'error', saveError: action.message };
    default:
      return state;
  }
}

interface ProjectContextValue {
  state: ProjectState;
  setProjectName: (name: string) => void;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  setImportResult: (result: ImportResult) => void;
  setImportError: (message: string) => void;
  setProfile: (input: ProfileInput, result: ProfileResult) => void;
  clearProfile: () => void;
  clearAlignment: () => void;
  addBoring: (boring: Boring) => void;
  updateBoring: (boring: Boring) => void;
  deleteBoring: (id: string) => void;
  setPlacing: (placing: boolean) => void;
  selectBoring: (id: string | null) => void;
  addCase: (c: CalcCase) => void;
  updateCase: (c: CalcCase) => void;
  deleteCase: (id: string) => void;
  selectCase: (id: string | null) => void;
  setCrossings: (crossings: Crossing[]) => void;
  clearCrossings: () => void;
  loadProject: (data: ProjectFileData) => void;
  setFileLink: (handle: FileSystemFileHandle | null, fileName: string | null) => void;
  markSaving: () => void;
  markIdle: () => void;
  markSaved: (at: string) => void;
  markSaveError: (message: string) => void;
  setNeedsReconnect: (value: boolean) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo<ProjectContextValue>(
    () => ({
      state,
      setProjectName: (name: string) => dispatch({ type: 'SET_PROJECT_NAME', name }),
      toggleLayer: (layer: keyof LayerVisibility) =>
        dispatch({ type: 'TOGGLE_LAYER', layer }),
      setImportResult: (result: ImportResult) =>
        dispatch({ type: 'SET_IMPORT_RESULT', result }),
      setImportError: (message: string) => dispatch({ type: 'SET_IMPORT_ERROR', message }),
      setProfile: (input: ProfileInput, result: ProfileResult) =>
        dispatch({ type: 'SET_PROFILE', input, result }),
      clearProfile: () => dispatch({ type: 'CLEAR_PROFILE' }),
      clearAlignment: () => dispatch({ type: 'CLEAR_ALIGNMENT' }),
      addBoring: (boring: Boring) => dispatch({ type: 'ADD_BORING', boring }),
      updateBoring: (boring: Boring) => dispatch({ type: 'UPDATE_BORING', boring }),
      deleteBoring: (id: string) => dispatch({ type: 'DELETE_BORING', id }),
      setPlacing: (placing: boolean) => dispatch({ type: 'SET_PLACING', placing }),
      selectBoring: (id: string | null) => dispatch({ type: 'SELECT_BORING', id }),
      addCase: (c: CalcCase) => dispatch({ type: 'ADD_CASE', c }),
      updateCase: (c: CalcCase) => dispatch({ type: 'UPDATE_CASE', c }),
      deleteCase: (id: string) => dispatch({ type: 'DELETE_CASE', id }),
      selectCase: (id: string | null) => dispatch({ type: 'SELECT_CASE', id }),
      setCrossings: (crossings: Crossing[]) => dispatch({ type: 'SET_CROSSINGS', crossings }),
      clearCrossings: () => dispatch({ type: 'CLEAR_CROSSINGS' }),
      loadProject: (data: ProjectFileData) => dispatch({ type: 'LOAD_PROJECT', data }),
      setFileLink: (handle: FileSystemFileHandle | null, fileName: string | null) =>
        dispatch({ type: 'SET_FILE_LINK', handle, fileName }),
      markSaving: () => dispatch({ type: 'MARK_SAVING' }),
      markIdle: () => dispatch({ type: 'MARK_IDLE' }),
      markSaved: (at: string) => dispatch({ type: 'MARK_SAVED', at }),
      markSaveError: (message: string) => dispatch({ type: 'MARK_SAVE_ERROR', message }),
      setNeedsReconnect: (value: boolean) => dispatch({ type: 'SET_NEEDS_RECONNECT', value }),
    }),
    [state],
  );
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used inside ProjectProvider');
  return ctx;
}
