/**
 * Pure HTML report builder. Takes a ReportInput, returns a self-contained
 * print-friendly HTML document. No DOM, no app state — fully testable.
 * All user-controlled strings are HTML-escaped.
 */
import { REPORT_ASSUMPTIONS, settlementAssumptions } from '../cases/assumptions';
import { formatStation } from '../lib/format';
import type { ReportInput } from './types';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const num = (v: number | undefined, digits = 0): string =>
  v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(digits);

const sta = (ft: number): string => esc(formatStation(ft));

function section(title: string, body: string): string {
  return `<section><h2>${esc(title)}</h2>${body}</section>`;
}

function table(headers: string[], rows: string[][]): string {
  const th = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const tr = rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

function kv(pairs: [string, string][]): string {
  return `<dl>${pairs
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`)
    .join('')}</dl>`;
}

function warningsList(warnings: string[]): string {
  if (warnings.length === 0) return `<p class="muted">None.</p>`;
  return `<ul class="warn">${warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`;
}

const CSS = `
  :root { color-scheme: light; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
         color: #1a1a1a; max-width: 960px; margin: 0 auto; padding: 24px;
         font-size: 13px; line-height: 1.45; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 28px 0 8px; padding-bottom: 4px;
       border-bottom: 2px solid #1e3a5f; color: #1e3a5f; }
  h3 { font-size: 13px; margin: 16px 0 6px; }
  .sub { color: #555; margin: 0 0 16px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 16px; font-size: 12px; }
  th, td { border: 1px solid #bbb; padding: 4px 8px; text-align: left; }
  th { background: #eef2f7; }
  td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
  dl { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin: 8px 0; }
  dl > div { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding: 2px 0; }
  dt { color: #555; } dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
  ul.warn { background: #fff8e6; border: 1px solid #e6c84d; border-radius: 4px;
            padding: 8px 8px 8px 28px; }
  ul.warn li { margin: 2px 0; }
  .muted { color: #777; }
  .assump li { margin: 3px 0; }
  footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #999;
           font-size: 11px; color: #666; }
  @media print {
    body { padding: 0; font-size: 11px; }
    section { page-break-inside: avoid; }
    h2 { page-break-after: avoid; }
  }
`;

export function buildReportHtml(input: ReportInput): string {
  const { projectName, generatedAt, appNote, case: c, results, borings, crossings } = input;
  const g = c.globals;
  const j = results.jacking;
  const f = results.face;
  const s = results.settlement;

  const govRow = j.rows[j.govRowIdx];
  const govSeg = govRow
    ? `${formatStation(govRow.startFt)}–${formatStation(govRow.endFt)}`
    : '—';

  const jackingRows = j.rows.map((r) => [
    sta(r.startFt),
    sta(r.endFt),
    num(r.lenFt, 0),
    num(r.coverFt, 1),
    esc(r.frictionMode),
    `<span class="n">${num(r.totalLowKips)}</span>`,
    `<span class="n">${num(r.totalBaseKips)}</span>`,
    `<span class="n">${num(r.totalHighKips)}</span>`,
  ]);

  const faceRows = f.stations.map((st) => [
    sta(st.stationFt),
    `<span class="n">${num(st.coverFt, 1)}</span>`,
    `<span class="n">${num(st.minStablePsf)}</span>`,
    `<span class="n">${num(st.targetPsf)}</span>`,
    `<span class="n">${num(st.maxBlowoutPsf)}</span>`,
    esc(st.status),
  ]);

  const receptorRows = s.receptors.map((r) => [
    esc(r.name),
    sta(r.stationFt),
    `<span class="n">${num(r.offsetFt, 1)}</span>`,
    `<span class="n">${num(r.settleIn, 2)}</span>`,
    `<span class="n">${num(r.limitIn, 2)}</span>`,
    `<span class="n">${num(r.ratio * 100, 1)}%</span>`,
    esc(r.status),
  ]);

  const segmentInputRows = c.segments
    .filter((sg) => sg.include)
    .map((sg) => [
      sta(sg.startFt),
      sta(sg.endFt),
      esc(sg.groundCls || '—'),
      `<span class="n">${num(sg.gammaPcf, 0)}</span>`,
      `<span class="n">${num(sg.k0, 2)}</span>`,
      `<span class="n">${num(sg.ka, 2)}</span>`,
      `<span class="n">${num(sg.coverFt, 1)}</span>`,
      esc(sg.frictionMode),
    ]);

  const boringRows = [...borings]
    .sort((a, b) => a.stationFt - b.stationFt)
    .map((b) => [
      esc(b.name),
      sta(b.stationFt),
      `<span class="n">${num(b.offsetFt, 1)}</span>`,
      `<span class="n">${num(b.depthFt, 1)}</span>`,
      b.strata.length > 0
        ? esc(b.strata.map((st) => `${num(st.topDepthFt, 1)}–${num(st.bottomDepthFt, 1)} ft: ${st.description}`).join('; '))
        : '<span class="muted">no strata logged</span>',
    ]);

  const crossingRows = [...crossings]
    .sort((a, b) => a.stationFt - b.stationFt)
    .map((x) => [esc(x.kind), esc(x.name), sta(x.stationFt), esc(x.detail)]);

  const date = new Date(generatedAt);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Microtunnel calculation report — ${esc(c.name)}</title>
<style>${CSS}</style>
</head>
<body>
<header>
  <h1>Microtunnel Calculation Report</h1>
  <p class="sub">${esc(projectName)} · Case: ${esc(c.name)} ·
  generated ${esc(date.toLocaleString())} · ${esc(appNote)}</p>
</header>

${section(
  'Drive summary',
  kv([
    ['Station range', `${sta(c.stationStartFt)} – ${sta(c.stationEndFt)}`],
    ['Drive length', `${num(j.driveLengthFt, 0)} ft`],
    ['Pipe OD', `${num(g.pipeODIn, 1)} in`],
    ['Cutter OD', `${num(g.cutterODIn, 1)} in`],
    ['MTBM', g.mtbmModel ? `${esc(g.mtbmModel)}${g.cutterHead ? ` — ${esc(g.cutterHead)} wheel` : ''}` : 'manual entry'],
    ['Face basis (jacking)', esc(g.faceBasis)],
    ['Face target basis', esc(g.targetBasis)],
    ['Profile fingerprint', `<span class="muted">${esc(c.profileFingerprint.slice(0, 24))}…</span>`],
  ]),
)}

${section(
  'Inputs — globals',
  kv([
    ['Volume loss', `${num(g.volumeLossPct, 2)} %`],
    ['Settlement limit', `${num(g.settleLimitIn, 2)} in`],
    ['Blowout guard factor', `${num(g.blowoutFactor, 2)} (heuristic)`],
    ['MTBM pressure limits', `${num(g.mtbmMinPsf)} – ${num(g.mtbmMaxPsf)} psf`],
    ['IJS planned', g.ijsPlanned ? `yes (${num(g.ijsCapacityKips)} kips)` : 'no'],
    ['Pushback restraint', `${num(g.pushbackRestraintKips)} kips`],
  ]),
)}

${section(
  'Inputs — drive segments',
  table(
    ['Start', 'End', 'Ground class', 'γ (pcf)', 'K0', 'Ka', 'Cover (ft)', 'Friction mode'],
    segmentInputRows,
  ),
)}

${section(
  'Results — jacking force (ASCE 36-15 §13.4)',
  kv([
    ['Max low / base / high', `${num(j.maxLowKips)} / ${num(j.maxBaseKips)} / ${num(j.maxHighKips)} kips`],
    ['Governing segment', govSeg],
    ['Max face component', `${num(j.maxFaceKips, 1)} kips`],
    ['Max friction rate (high)', `${num(j.maxFricRateHighKpf, 2)} kips/ft`],
    ['Alignment status', esc(j.alignmentStatus)],
    ['IJS screening', esc(j.ijs.screen)],
    ['Pushback', `${num(j.pushback.pushbackKips, 1)} kips — ${esc(j.pushback.status)}`],
  ]) +
    `<h3>Capacity utilization</h3>` +
    table(
      ['Check', 'Owner', 'Capacity (kips)', 'Util. base', 'Util. high', 'Status'],
      j.capacities.map((cp) => [
        esc(cp.name),
        esc(cp.owner),
        `<span class="n">${num(cp.capacityKips)}</span>`,
        `<span class="n">${num(cp.utilBase * 100, 1)}%</span>`,
        `<span class="n">${num(cp.utilHigh * 100, 1)}%</span>`,
        esc(cp.status),
      ]),
    ) +
    `<h3>Per-segment totals (kips)</h3>` +
    table(
      ['Start', 'End', 'Len (ft)', 'Cover (ft)', 'Friction mode', 'Low', 'Base', 'High'],
      jackingRows,
    ),
)}

${section(
  'Results — face pressure (ASCE 36-15 §13.4)',
  kv([
    ['Governing target', `${num(f.governingTargetPsf)} psf at ${sta(f.governingStationFt)}`],
    ['Alignment status', esc(f.alignmentStatus)],
  ]) +
    table(
      ['Station', 'Cover (ft)', 'Min stable (psf)', 'Target (psf)', 'Blowout guard (psf)', 'Status'],
      faceRows,
    ),
)}

${section(
  'Results — settlement (Peck trough, §13.5)',
  kv([
    ['Max settlement', `${num(s.maxSettleIn, 2)} in`],
    ['Max transverse slope', `1:${num(s.maxSlope > 0 ? 1 / s.maxSlope : 0, 0)}`],
    ['Excavated area', `${num(s.excavatedAreaFt2, 1)} ft²`],
    ['Annulus volume loss', `${num(s.annulusVolumeLossPct, 2)} %`],
    ['Alignment status', esc(s.alignmentStatus)],
  ]) +
    `<h3>Receptors</h3>` +
    (receptorRows.length > 0
      ? table(
          ['Receptor', 'Station', 'Offset (ft)', 'Settlement (in)', 'Limit (in)', 'Ratio', 'Status'],
          receptorRows,
        )
      : '<p class="muted">No receptors defined.</p>') +
    `<h3>Assumptions</h3><ul class="assump">${settlementAssumptions(c, s)
      .map((a) => `<li>${esc(a)}</li>`)
      .join('')}</ul>`,
)}

${section(
  'Warnings',
  `<h3>Jacking</h3>${warningsList(j.warnings)}
   <h3>Face pressure</h3>${warningsList(f.warnings)}
   <h3>Settlement</h3>${warningsList(s.warnings)}`,
)}

${section(
  'Borings',
  boringRows.length > 0
    ? table(['Boring', 'Station', 'Offset (ft)', 'Depth (ft)', 'Strata'], boringRows)
    : '<p class="muted">No borings placed.</p>',
)}

${section(
  'OSM crossings',
  crossingRows.length > 0
    ? table(['Kind', 'Name', 'Station', 'Detail'], crossingRows)
    : '<p class="muted">No crossings detected.</p>',
)}

${section(
  'Assumptions',
  `<ul class="assump">${REPORT_ASSUMPTIONS.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`,
)}

<footer>
  <p>Generated by Microtunnel Design Tool® v1.0.0 — © 2026 Branako K. Primm, PE.
  All rights reserved. This report summarizes model inputs and
  engine outputs; it is not a substitute for engineering judgment. Google Earth elevations
  are GE-derived — field verify. OSM crossings are OSM-derived — field verify.
  Blowout guard is a disclosed heuristic, TODO(source needed), not an ASCE 36-15 formula.</p>
</footer>
</body>
</html>`;
}

/** Suggested download filename for a case report. */
export function reportFilename(caseName: string, generatedAt: string): string {
  const slug = caseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const day = new Date(generatedAt).toISOString().slice(0, 10);
  return `microtunnel-report-${slug || 'case'}-${day}.html`;
}
