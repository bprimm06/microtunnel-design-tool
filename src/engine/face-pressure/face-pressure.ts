/**
 * Face-pressure module — Microtunnel Design Tool.
 *
 * ASCE 36-15 §13.4: "Actual face pressure values are typically slightly greater
 * than the combined value of the groundwater pressure and active earth pressure."
 * That sum is the minimum-stability basis. The at-rest (K0) basis is the
 * conservative operating target (consistent with the U7 jacking engine).
 *
 * The blowout/heave guard is a user-configurable heuristic — ASCE 36-15 states
 * no blowout formula. It is never presented as a code value.
 *
 * Pure functions only: (inputs) → (results). No DOM, no network.
 */
import { axisDepthFt, porePressurePsf, sigmaVEffPsf, sigmaVTotalPsf } from '../common/soil-stress';
import type {
  FaceInputs,
  FaceResults,
  FaceStation,
  FaceStationResult,
  LateralBasis,
  StationStatus,
} from './types';

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Minimum stable face pressure (§13.4): groundwater + active earth pressure.
 * Below this the face can ravel or run; operating "slightly greater" is the
 * standard's stated practice.
 */
export function minStablePressurePsf(uPsf: number, ka: number, sigmaVEffPsf_: number): number {
  return uPsf + ka * sigmaVEffPsf_;
}

/**
 * Recommended operating target (§13.4): groundwater + K·effective stress,
 * with K at-rest (conservative default) or active per targetBasis.
 */
export function targetPressurePsf(uPsf: number, k: number, sigmaVEffPsf_: number): number {
  return uPsf + k * sigmaVEffPsf_;
}

/**
 * Blowout/heave guard: blowoutFactor × total overburden stress at axis.
 * HEURISTIC — TODO(source needed). Guards against fracturing/heaving the cover,
 * which controls at shallow cover. Confirm with the geotechnical engineer.
 */
export function maxBlowoutPressurePsf(sigmaVTotalPsf_: number, blowoutFactor: number): number {
  return blowoutFactor * sigmaVTotalPsf_;
}

/** Convert a face pressure to the equivalent thrust on the MTBM head, kips. */
export function pressureToForceKips(pressurePsf: number, cutterODIn: number): number {
  const headAreaFt2 = Math.PI * Math.pow(cutterODIn / 24, 2);
  return (pressurePsf * headAreaFt2) / 1000;
}

function evaluateStation(st: FaceStation, inputs: FaceInputs, blowoutFactor: number): FaceStationResult {
  const nan: FaceStationResult = {
    stationFt: st.stationFt, coverFt: NaN, status: 'INPUT REQUIRED',
    statusNote: 'missing required station input',
    uPsf: NaN, sigmaVEffPsf: NaN, sigmaVTotalPsf: NaN,
    minStablePsf: NaN, targetPsf: NaN, maxBlowoutPsf: NaN, targetForceKips: NaN,
  };
  if (!isFiniteNum(st.coverFt) || !isFiniteNum(st.gammaPcf) || !isFiniteNum(st.k0) || !isFiniteNum(st.ka)) {
    return nan;
  }
  const coverFt = st.coverFt as number;
  const gammaPcf = st.gammaPcf as number;
  const k0 = st.k0 as number;
  const ka = st.ka as number;
  const targetK = (inputs.targetBasis as LateralBasis) === 'active' ? ka : k0;
  if (coverFt <= 0 || gammaPcf <= 0 || targetK <= 0 || ka <= 0) {
    return { ...nan, coverFt, status: 'ERROR', statusNote: 'cover, gamma, K0, Ka must be positive' };
  }

  const gw = st.gwAboveAxisFt ?? 0;
  const axisFt = axisDepthFt(coverFt, inputs.pipeODIn);
  const uPsf = porePressurePsf(gw);
  const sVEff = sigmaVEffPsf(gammaPcf, axisFt, uPsf);
  const sVTot = sigmaVTotalPsf(gammaPcf, axisFt);
  const minStable = minStablePressurePsf(uPsf, ka, sVEff);
  const target = targetPressurePsf(uPsf, targetK, sVEff);
  const maxBlowout = maxBlowoutPressurePsf(sVTot, blowoutFactor);

  let status: StationStatus = 'OK';
  const notes: string[] = [];
  if (sVEff <= 0) {
    status = 'REVIEW';
    notes.push('zero effective stress — artesian/blowout risk, confirm with geotech');
  }
  if (minStable > maxBlowout) {
    status = 'REVIEW';
    notes.push('window inversion: min stable pressure exceeds blowout guard — cover too shallow for face control');
  }
  if (isFiniteNum(inputs.mtbmMaxPsf) && target > (inputs.mtbmMaxPsf as number)) {
    status = 'REVIEW';
    notes.push('target exceeds MTBM maximum deliverable pressure');
  }
  if (isFiniteNum(inputs.mtbmMinPsf) && minStable < (inputs.mtbmMinPsf as number)) {
    status = 'REVIEW';
    notes.push('minimum stable pressure below MTBM minimum — face control may be coarse');
  }

  return {
    stationFt: st.stationFt, coverFt, status,
    statusNote: notes.length ? notes.join('; ') : `window ${minStable.toFixed(0)}–${maxBlowout.toFixed(0)} psf (§13.4)`,
    uPsf, sigmaVEffPsf: sVEff, sigmaVTotalPsf: sVTot,
    minStablePsf: minStable, targetPsf: target, maxBlowoutPsf: maxBlowout,
    targetForceKips: pressureToForceKips(target, inputs.cutterODIn),
  };
}

/**
 * Face-pressure operating windows for every station along the drive.
 * Never throws on incomplete input — stations carry INPUT REQUIRED/ERROR.
 */
export function computeFacePressures(inputs: FaceInputs): FaceResults {
  const warnings: string[] = [];
  const blowoutFactor = inputs.blowoutFactor ?? 1.0;
  if (!isFiniteNum(inputs.pipeODIn) || !isFiniteNum(inputs.cutterODIn) || inputs.cutterODIn <= inputs.pipeODIn) {
    warnings.push('Pipe/cutter OD invalid: cutterOD must exceed pipeOD.');
  }

  const stations = inputs.stations.map((st) => evaluateStation(st, inputs, blowoutFactor));

  const alignmentStatus: StationStatus =
    !stations.length || stations.some((s) => s.status === 'ERROR' || s.status === 'INPUT REQUIRED')
      ? 'INPUT REQUIRED'
      : stations.some((s) => s.status === 'REVIEW')
        ? 'REVIEW'
        : 'OK';

  const validTargets = stations.filter((s) => isFiniteNum(s.targetPsf));
  const governingTargetPsf = validTargets.length ? Math.max(...validTargets.map((s) => s.targetPsf)) : NaN;
  const gov = validTargets.find((s) => s.targetPsf === governingTargetPsf);
  const governingStationFt = gov ? gov.stationFt : NaN;

  warnings.push(
    'Face target uses the §13.4 at-rest (K0) basis — conservative vs the active-earth minimum.',
  );
  warnings.push(
    'Blowout guard is a heuristic (factor × overburden) — TODO(source needed); confirm with the geotechnical engineer.',
  );
  if (stations.some((s) => s.statusNote.includes('artesian'))) {
    warnings.push('Artesian condition at one or more stations — verify face control and shaft seals.');
  }

  return { stations, alignmentStatus, governingTargetPsf, governingStationFt, warnings };
}
