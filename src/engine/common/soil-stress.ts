/**
 * Shared soil-stress helpers — Microtunnel Design Tool.
 * Pure functions; units in names. Used by the jacking (U7) and
 * face-pressure (U8) engines.
 */

/** Unit weight of water, pcf — standard value. */
export const GAMMA_W_PCF = 62.4;

/** Depth from ground surface to tunnel axis: crown cover + half pipe OD. */
export function axisDepthFt(coverFt: number, pipeODIn: number): number {
  return coverFt + pipeODIn / 24;
}

/** Pore water pressure at tunnel axis, psf. */
export function porePressurePsf(gwAboveAxisFt: number): number {
  return Math.max(0, gwAboveAxisFt) * GAMMA_W_PCF;
}

/** Effective vertical stress at tunnel axis, psf. */
export function sigmaVEffPsf(gammaPcf: number, axisDepthFt_: number, uPsf: number): number {
  return Math.max(0, gammaPcf * axisDepthFt_ - uPsf);
}

/** Total vertical (overburden) stress at tunnel axis, psf. */
export function sigmaVTotalPsf(gammaPcf: number, axisDepthFt_: number): number {
  return gammaPcf * axisDepthFt_;
}
