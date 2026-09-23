/**
 * Help modal — instructions in the spirit of the original HTML tool's
 * "How to Use" dialog, rewritten for this app's workflow:
 * import → profile → borings → crossings → results → save/report.
 */
import { useEffect } from 'react';

export const HELP_SEEN_KEY = 'microtunnel-help-seen';

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">
        {n}
      </span>
      <div className="text-[13px] leading-relaxed text-gray-700">{children}</div>
    </div>
  );
}

export function HelpBody() {
  return (
    <div className="space-y-4">
      <section>
        <h4 className="mb-1 text-sm font-semibold text-gray-900">What this tool does</h4>
        <p className="text-[13px] leading-relaxed text-gray-700">
          A microtunnel design workspace built around an imported alignment.{' '}
          <b>Jacking force</b> predicts the drive load envelope, <b>face pressure</b>{' '}
          screens the slurry support window at every station, and <b>settlement</b>{' '}
          screens the greenfield trough against project limits and named receptors —
          all per ASCE 36-15. Engines run their built-in self-checks on every run.
        </p>
      </section>

      <section>
        <h4 className="mb-2 text-sm font-semibold text-gray-900">How to work</h4>
        <div className="space-y-2">
          <Step n={1}>
            <b>Import a KMZ / KML.</b> The alignment is stationed every 25 ft. Choose
            the ground source first: <i>KMZ altitudes (GE-derived)</i> interpolates
            Google Earth vertex altitudes, or <i>Manual entry</i> leaves ground blank
            for surveyed values.
          </Step>
          <Step n={2}>
            <b>Build the profile.</b> Set invert control points and pipe OD, then build.
            Ground elevations are editable at every station — typed values are flagged
            user-entered, and <i>Restore GE ground</i> brings back the KMZ values.
          </Step>
          <Step n={3}>
            <b>Place borings.</b> Click the map; depth follows the +20 ft below-invert
            rule with the derivation shown. Override it any time — the derivation is
            preserved.
          </Step>
          <Step n={4}>
            <b>Detect crossings.</b> Roads, rail, water, wetlands, and levees are found
            from OpenStreetMap, the National Wetlands Inventory, and the National
            Levee Database. Every crossing is screening data — field verify.
          </Step>
          <Step n={5}>
            <b>Run a case.</b> Build a calculation case from the profile, fill the
            required geotechnical inputs (friction classes, volume loss, capacities —
            the tool never invents these), and run all three engines.
          </Step>
          <Step n={6}>
            <b>Save and report.</b> First save asks where to put the project file;
            changes autosave after that. <i>Report</i> exports a self-contained HTML
            calculation record for the selected case.
          </Step>
        </div>
      </section>

      <section>
        <h4 className="mb-1 text-sm font-semibold text-gray-900">
          Data sources &amp; field-verify badges
        </h4>
        <p className="text-[13px] leading-relaxed text-gray-700">
          Elevations and crossings carry their provenance wherever they appear:{' '}
          <b>GE-derived</b>, <b>OSM-derived</b>, <b>NWI-derived</b>, and{' '}
          <b>NLD-derived</b> are remote screening/inventory data — verify in the
          field before design use. Values you type are flagged{' '}
          <b>user-entered — verify</b>. NWI wetlands are not jurisdictional
          determinations; levee data does not replace Section 408 coordination.
        </p>
      </section>

      <section>
        <h4 className="mb-1 text-sm font-semibold text-gray-900">What it is not</h4>
        <p className="text-[13px] leading-relaxed text-gray-700">
          This is preliminary screening. It does not perform pipe structural design,
          shaft or thrust-block design, hydrofracture assessment, or building damage
          assessment. Settlement is a greenfield prediction — consolidation,
          groundwater drawdown, and structure interaction are excluded. Capacities,
          ground properties, volume loss, and acceptance criteria are stated inputs
          from the responsible parties. HTML reports are unsealed working documents,
          not engineer-sealed deliverables.
        </p>
      </section>
    </div>
  );
}

export default function HelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dismiss = () => {
    try {
      localStorage.setItem(HELP_SEEN_KEY, '1');
    } catch {
      // private browsing — the modal simply reopens next visit
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label="How to use this tool"
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">How to use this tool</h3>
            <p className="text-[11px] text-gray-500">
              Microtunnel screening per ASCE 36-15 — reopen any time with the ? button,
              lower right.
            </p>
          </div>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
            onClick={dismiss}
            aria-label="Close help"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">
          <HelpBody />
        </div>
        <div className="border-t border-gray-200 px-5 py-3 text-right">
          <button
            type="button"
            className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            onClick={dismiss}
          >
            Got it — start working
          </button>
        </div>
      </div>
    </div>
  );
}
