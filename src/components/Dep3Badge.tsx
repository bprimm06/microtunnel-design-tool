/**
 * Badge for USGS 3DEP-derived elevations — shown wherever a 3DEP elevation
 * is displayed or used (architecture invariant). Blue tint, distinct from
 * the GE amber: different source, different datum (NAVD88 vs WGS84).
 */
export default function Dep3Badge() {
  return (
    <span
      className="inline-block rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800"
      title="Elevation from USGS 3DEP (~10 m DEM, NAVD88) — approximate, field verify before design use"
    >
      3DEP-derived — field verify
    </span>
  );
}
