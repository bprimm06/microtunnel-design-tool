/**
 * Unit-aware number formatting. Safety rule (ui-context.md): every number
 * shown in the UI carries its unit. Stationing uses the 12+50 format.
 */

function num(v: number | undefined | null, digits: number): string {
  if (v === undefined || v === null || !Number.isFinite(v)) return '—';
  return v.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatFt(v: number | undefined | null, digits = 1): string {
  return `${num(v, digits)} ft`;
}

export function formatPsf(v: number | undefined | null, digits = 0): string {
  return `${num(v, digits)} psf`;
}

export function formatIn(v: number | undefined | null, digits = 2): string {
  return `${num(v, digits)} in`;
}

export function formatKips(v: number | undefined | null, digits = 1): string {
  return `${num(v, digits)} kips`;
}

export function formatPct(v: number | undefined | null, digits = 1): string {
  return `${num(v, digits)}%`;
}

/** Chainage as 12+50 (hundreds + remainder feet). */
export function formatStation(ft: number | undefined | null): string {
  if (ft === undefined || ft === null || !Number.isFinite(ft)) return '—';
  const hundreds = Math.floor(ft / 100);
  const rem = Math.round(ft - hundreds * 100);
  return `${hundreds}+${String(rem).padStart(2, '0')}`;
}
