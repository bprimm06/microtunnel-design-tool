/**
 * Assumptions disclosed with every calculation run and every exported report.
 * Single source of truth — ResultsTab and the report builder both use this.
 */
export const REPORT_ASSUMPTIONS: string[] = [
  'Segment cover = minimum cover within the segment range (auto-filled, editable).',
  'Face stations come from the profile; soil parameters are inherited from the containing segment.',
  'Tabulated friction and trough-K libraries are project geotechnical inputs — they start empty.',
  'Blowout guard is a heuristic (factor × overburden) — TODO(source needed), not an ASCE 36-15 formula.',
  'Face operating target uses the at-rest (K0) basis — conservative vs the active-earth minimum.',
  'Google Earth elevations are GE-derived — field verify.',
  'OSM crossings are OSM-derived — field verify.',
  'Reference cases REF-01, FP-01, and ST-01 are verified against independent Python — user hand-calculation countersign pending.',
];
