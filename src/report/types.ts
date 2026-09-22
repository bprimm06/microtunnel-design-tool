/**
 * Report input — everything the HTML builder needs, assembled by the caller
 * from project state. Pure data; the builder never touches app state or DOM.
 */
import type { CalcCase } from '../cases/types';
import type { CaseResults } from '../cases/runCase';
import type { Boring } from '../geotech/types';
import type { Crossing } from '../osm/types';

export interface ReportInput {
  projectName: string;
  generatedAt: string; // ISO timestamp
  appNote: string;
  case: CalcCase;
  results: CaseResults;
  borings: Boring[];
  crossings: Crossing[];
}
