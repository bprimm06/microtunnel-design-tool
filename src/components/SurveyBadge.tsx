/**
 * Badge for user-entered (surveyed) elevations — shown wherever a
 * manually entered ground elevation is displayed or used.
 */
export default function SurveyBadge() {
  return (
    <span
      className="inline-block rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800"
      title="Elevation entered by the user — verify before design use"
    >
      user-entered — verify
    </span>
  );
}
