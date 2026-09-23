/**
 * MTBM (microtunneling boring machine) catalog — pure manufacturer catalog
 * data, not engineering constants. Every entry carries a `source` note and
 * the UI/report flag these values "catalog-derived — verify with manufacturer
 * data sheet", matching the project's provenance convention.
 *
 * Herrenknecht AVN values transcribed from the AVN250XC–AVN700XC,
 * AVN800XC–AVN2000AC, and AVN1200TC–AVN1800TC product brochure spec tables
 * (archived copies, crawled 2026-09-22). The AVN800XC–AVN2000AC table prints
 * nine columns; the ninth column (pipe ID 2400 mm / shield OD 2425 mm) has no
 * printed model name, so it is labeled here by pipe ID ("AVN 2400 class").
 * Model labels elsewhere follow the brochure's pipe-ID column ordering.
 */

export interface MtbmMachine {
  id: string;
  manufacturer: string;
  /** Display label, e.g. 'AVN 1200 XC'. */
  model: string;
  /** Picker group, e.g. 'AVN XC — standard'. */
  group: string;
  /** Nominal diameter, mm (brochure pipe-ID basis). */
  nominalDnMm: number;
  /** Shield (cutter) OD, mm — the autopopulated cutterODIn basis. */
  shieldOdMm: number;
  /** Cutter OD, in — shieldOdMm / 25.4. */
  cutterOdIn: number;
  pipeOdMm?: number;
  pipeIdMm?: number;
  maxTorqueKNm?: number;
  /** Display string, e.g. '0–5.4'. */
  cutterRpm?: string;
  ratedPowerKw?: number;
  steerCylCount?: number;
  /** Steering force per cylinder at stated oil pressure, kN. */
  steerForcePerCylKN?: number;
  slurryLineMm?: number;
  /** Recommended drive length, m. */
  recDriveLengthM?: number;
  /** Available cutting-wheel options. */
  cutterHeads: string[];
  /** Provenance — always shown alongside the values. */
  source: string;
}

const CUTTER_HEADS = ['Soft ground', 'Mixed ground', 'Hard rock'];
const SRC_SMALL =
  'Herrenknecht AVN250XC–AVN700XC brochure spec table (archived copy) — verify against the current manufacturer data sheet.';
const SRC_STD =
  'Herrenknecht AVN800XC–AVN2000AC brochure spec table (archived copy); model labels follow the pipe-ID column ordering — verify against the current manufacturer data sheet.';
const SRC_TC =
  'Herrenknecht AVN1200TC–AVN1800TC brochure spec table (archived copy) — verify against the current manufacturer data sheet.';

const IN_PER_MM = 1 / 25.4;

interface Raw {
  id: string;
  model: string;
  group: string;
  nominalDnMm: number;
  shieldOdMm: number;
  pipeOdMm?: number;
  pipeIdMm?: number;
  maxTorqueKNm?: number;
  cutterRpm?: string;
  ratedPowerKw?: number;
  steerCylCount?: number;
  steerForcePerCylKN?: number;
  slurryLineMm?: number;
  recDriveLengthM?: number;
  source: string;
}

const RAW: Raw[] = [
  // AVN XC — small series
  { id: 'avn250xc', model: 'AVN 250 XC', group: 'AVN XC — small', nominalDnMm: 250, shieldOdMm: 368, pipeOdMm: 360, pipeIdMm: 250, maxTorqueKNm: 5.9, cutterRpm: '0–44', ratedPowerKw: 45, steerCylCount: 3, steerForcePerCylKN: 116, slurryLineMm: 55, recDriveLengthM: 80, source: SRC_SMALL },
  { id: 'avn300xc', model: 'AVN 300 XC', group: 'AVN XC — small', nominalDnMm: 300, shieldOdMm: 410, pipeOdMm: 400, pipeIdMm: 300, maxTorqueKNm: 9.4, cutterRpm: '0–27', ratedPowerKw: 45, steerCylCount: 3, steerForcePerCylKN: 245, slurryLineMm: 55, recDriveLengthM: 100, source: SRC_SMALL },
  { id: 'avn400xc', model: 'AVN 400 XC', group: 'AVN XC — small', nominalDnMm: 400, shieldOdMm: 565, pipeOdMm: 550, pipeIdMm: 400, maxTorqueKNm: 13.4, cutterRpm: '0–19', ratedPowerKw: 45, steerCylCount: 3, steerForcePerCylKN: 245, slurryLineMm: 80, recDriveLengthM: 100, source: SRC_SMALL },
  { id: 'avn500xc', model: 'AVN 500 XC', group: 'AVN XC — small', nominalDnMm: 500, shieldOdMm: 665, pipeOdMm: 650, pipeIdMm: 500, maxTorqueKNm: 22.2, cutterRpm: '0–15', ratedPowerKw: 45, steerCylCount: 3, steerForcePerCylKN: 311, slurryLineMm: 100, recDriveLengthM: 120, source: SRC_SMALL },
  { id: 'avn600xc', model: 'AVN 600 XC', group: 'AVN XC — small', nominalDnMm: 600, shieldOdMm: 780, pipeOdMm: 760, pipeIdMm: 600, maxTorqueKNm: 33.5, cutterRpm: '0–13', ratedPowerKw: 55, steerCylCount: 3, steerForcePerCylKN: 311, slurryLineMm: 100, recDriveLengthM: 140, source: SRC_SMALL },
  { id: 'avn700xc', model: 'AVN 700 XC', group: 'AVN XC — small', nominalDnMm: 700, shieldOdMm: 875, pipeOdMm: 860, pipeIdMm: 700, maxTorqueKNm: 40.1, cutterRpm: '0–11', ratedPowerKw: 55, steerCylCount: 3, steerForcePerCylKN: 383, slurryLineMm: 100, recDriveLengthM: 140, source: SRC_SMALL },
  // AVN XC — standard series
  { id: 'avn800xc', model: 'AVN 800 XC', group: 'AVN XC — standard', nominalDnMm: 800, shieldOdMm: 975, pipeOdMm: 960, pipeIdMm: 700, maxTorqueKNm: 55, cutterRpm: '0–7.4', ratedPowerKw: 55, steerCylCount: 3, steerForcePerCylKN: 393, slurryLineMm: 100, recDriveLengthM: 150, source: SRC_STD },
  { id: 'avn1000xc', model: 'AVN 1000 XC', group: 'AVN XC — standard', nominalDnMm: 1000, shieldOdMm: 1110, pipeOdMm: 1090, pipeIdMm: 1000, maxTorqueKNm: 90, cutterRpm: '0–7.1', ratedPowerKw: 75, steerCylCount: 3, steerForcePerCylKN: 393, slurryLineMm: 100, recDriveLengthM: 150, source: SRC_STD },
  { id: 'avn1200xc', model: 'AVN 1200 XC', group: 'AVN XC — standard', nominalDnMm: 1200, shieldOdMm: 1295, pipeOdMm: 1280, pipeIdMm: 1200, maxTorqueKNm: 150, cutterRpm: '0–5.4', ratedPowerKw: 75, steerCylCount: 3, steerForcePerCylKN: 664, slurryLineMm: 100, recDriveLengthM: 150, source: SRC_STD },
  { id: 'avn1400xc', model: 'AVN 1400 XC', group: 'AVN XC — standard', nominalDnMm: 1400, shieldOdMm: 1505, pipeOdMm: 1490, pipeIdMm: 1400, maxTorqueKNm: 195, cutterRpm: '0–3.5', ratedPowerKw: 75, steerCylCount: 3, steerForcePerCylKN: 752, slurryLineMm: 100, recDriveLengthM: 200, source: SRC_STD },
  { id: 'avn1500xc', model: 'AVN 1500 XC', group: 'AVN XC — standard', nominalDnMm: 1500, shieldOdMm: 1740, pipeOdMm: 1720, pipeIdMm: 1500, maxTorqueKNm: 281, cutterRpm: '0–3.2', ratedPowerKw: 90, steerCylCount: 3, steerForcePerCylKN: 1005, slurryLineMm: 125, recDriveLengthM: 250, source: SRC_STD },
  { id: 'avn1600xc', model: 'AVN 1600 XC', group: 'AVN XC — standard', nominalDnMm: 1600, shieldOdMm: 1810, pipeOdMm: 1780, pipeIdMm: 1600, maxTorqueKNm: 310, cutterRpm: '0–3.2', ratedPowerKw: 110, steerCylCount: 4, steerForcePerCylKN: 1005, slurryLineMm: 125, recDriveLengthM: 250, source: SRC_STD },
  { id: 'avn1800xc', model: 'AVN 1800 XC', group: 'AVN XC — standard', nominalDnMm: 1800, shieldOdMm: 1970, pipeOdMm: 1940, pipeIdMm: 1800, maxTorqueKNm: 310, cutterRpm: '0–3.2', ratedPowerKw: 110, steerCylCount: 4, steerForcePerCylKN: 1005, slurryLineMm: 125, recDriveLengthM: 300, source: SRC_STD },
  { id: 'avn2000xc', model: 'AVN 2000 XC', group: 'AVN XC — standard', nominalDnMm: 2000, shieldOdMm: 2150, pipeOdMm: 2120, pipeIdMm: 2000, maxTorqueKNm: 445, cutterRpm: '0–3.3', ratedPowerKw: 132, steerCylCount: 4, steerForcePerCylKN: 1272, slurryLineMm: 125, recDriveLengthM: 300, source: SRC_STD },
  {
    id: 'avn2400class', model: 'AVN 2400 class', group: 'AVN XC — standard', nominalDnMm: 2400,
    shieldOdMm: 2425, pipeOdMm: 2400, pipeIdMm: 2400, maxTorqueKNm: 640, cutterRpm: '0–2.0',
    ratedPowerKw: 132, steerCylCount: 4, steerForcePerCylKN: 1272, slurryLineMm: 150,
    recDriveLengthM: 300,
    source:
      'Herrenknecht AVN800XC–AVN2000AC brochure spec table, ninth column (pipe ID 2400 mm / ' +
      'shield OD 2425 mm) — the brochure prints no model name for this column, so it is ' +
      'labeled here by pipe ID. Verify against the current manufacturer data sheet.',
  },
  // AVN TC series
  { id: 'avn1200tc', model: 'AVN 1200 TC', group: 'AVN TC', nominalDnMm: 1200, shieldOdMm: 1505, pipeOdMm: 1490, pipeIdMm: 1200, maxTorqueKNm: 258, cutterRpm: '0–5', ratedPowerKw: 132, steerCylCount: 3, source: SRC_TC },
  { id: 'avn1400tc', model: 'AVN 1400 TC', group: 'AVN TC', nominalDnMm: 1400, shieldOdMm: 1740, pipeOdMm: 1720, pipeIdMm: 1400, maxTorqueKNm: 258, cutterRpm: '0–5', ratedPowerKw: 132, steerCylCount: 3, source: SRC_TC },
  { id: 'avn1500tc', model: 'AVN 1500 TC', group: 'AVN TC', nominalDnMm: 1500, shieldOdMm: 1810, pipeOdMm: 1780, pipeIdMm: 1500, maxTorqueKNm: 376, cutterRpm: '0–3.6', ratedPowerKw: 132, steerCylCount: 4, source: SRC_TC },
  { id: 'avn1600tc', model: 'AVN 1600 TC', group: 'AVN TC', nominalDnMm: 1600, shieldOdMm: 1970, pipeOdMm: 1940, pipeIdMm: 1600, maxTorqueKNm: 376, cutterRpm: '0–3.6', ratedPowerKw: 132, steerCylCount: 4, source: SRC_TC },
  { id: 'avn1800tc', model: 'AVN 1800 TC', group: 'AVN TC', nominalDnMm: 1800, shieldOdMm: 2150, pipeOdMm: 2120, pipeIdMm: 1800, maxTorqueKNm: 472, cutterRpm: '0–2.9', ratedPowerKw: 132, steerCylCount: 4, source: SRC_TC },
];

export const MTBM_CATALOG: MtbmMachine[] = RAW.map((r) => ({
  ...r,
  manufacturer: 'Herrenknecht',
  cutterOdIn: Math.round(r.shieldOdMm * IN_PER_MM * 100) / 100,
  cutterHeads: [...CUTTER_HEADS],
}));

/** Look up a catalog machine by id; undefined for 'custom'/unknown. */
export function findMtbm(id: string | undefined): MtbmMachine | undefined {
  if (!id || id === 'custom') return undefined;
  return MTBM_CATALOG.find((m) => m.id === id);
}

/** Picker groups in catalog order: [group, machines][]. */
export function mtbmGroups(): [string, MtbmMachine[]][] {
  const order: string[] = [];
  const byGroup = new Map<string, MtbmMachine[]>();
  for (const m of MTBM_CATALOG) {
    if (!byGroup.has(m.group)) {
      byGroup.set(m.group, []);
      order.push(m.group);
    }
    byGroup.get(m.group)!.push(m);
  }
  return order.map((g) => [g, byGroup.get(g)!]);
}
