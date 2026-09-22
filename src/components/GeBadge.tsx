/**
 * Badge for Google Earth-derived elevations — shown wherever a GE elevation
 * is displayed or used (architecture invariant).
 */
export default function GeBadge() {
  return (
    <span
      className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
      title="Elevation from Google Earth — approximate, field verify before design use"
    >
      GE-derived — field verify
    </span>
  );
}
