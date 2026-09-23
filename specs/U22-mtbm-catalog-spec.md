# U22 Spec — MTBM catalog + autopopulate, settlement populated assumptions

## Goal
Add a preselected MTBM (microtunneling boring machine) catalog so the user
picks a machine and the tool autopopulates its cutter head and specs into the
case — and give the settlement results section its own assumptions block
populated from the actual inputs used (machine, cutter OD, volume loss, K
values, limits).

## Design decisions
- New pure-data module `src/mtbm/catalog.ts` — no engine constants, only
  manufacturer catalog values. Every entry carries a `source` provenance note
  and the UI + report label machine specs **"catalog-derived — verify with
  manufacturer data sheet"**, matching the project's provenance convention.
- Catalog covers the Herrenknecht AVN line (industry standard, published
  brochure tables): AVN XC small series (250–700), AVN XC standard series
  (800–2000 + the brochure's 9th column labeled by pipe ID), and AVN TC
  series (1200–1800). Values transcribed from Herrenknecht product brochures
  (archived copies); the 9th XC column has no printed model name and is
  labeled "AVN 2400 class" by its pipe ID, stated in its source note.
- Selecting a machine sets `globals.cutterODIn` from the catalog shield OD
  (mm → in), records `mtbmId` / `mtbmModel`, and defaults `cutterHead` to the
  first cutting-wheel option. Manual edits after selection are allowed; the
  card shows the catalog value and flags "edited" when they differ.
- Cutting-wheel options per machine: Soft ground / Mixed ground / Hard rock
  (per the AVN TC brochure: "different cutting wheels" for soft, mixed, and
  hard-rock ground).
- `CaseGlobals` gains `mtbmId?`, `mtbmModel?`, `cutterHead?`. `cutterODIn`
  keeps its existing required-validation role (jacking face area, settlement
  excavated area, face pressure).
- New `settlementAssumptions(c: CalcCase, r: SettlementResults): string[]` in
  `src/cases/assumptions.ts` — populated lines: method (Peck Gaussian trough,
  ASCE 36-15 §13.5), excavated area from the actual cutter OD + machine name,
  volume-loss % (global + per-segment overrides), trough-K per segment with
  its basis (kLibrary class / override), settlement + slope limits, marginal
  factor, cover/z0 convention, annulus (overcut) geometric volume-loss check,
  MTBM catalog provenance when a catalog machine is selected.
- `SettlementSection` in ResultsTab gains an Assumptions sub-block fed by
  `settlementAssumptions` (UI convention: inputs → values → assumptions →
  warnings).
- HTML report: MTBM model/cutter-head/specs row in the case-inputs section
  and the populated settlement assumptions under the settlement section.
- Existing cases (saved project files) load fine — all new fields optional;
  "Custom / manual entry" picker option leaves `mtbmId` unset.

## Implementation details
- `src/mtbm/catalog.ts` — `MtbmMachine` interface (units in names;
  `cutterOdIn` derived from `shieldOdMm`), `MTBM_CATALOG: MtbmMachine[]`
  (20 entries), `findMtbm(id)`, `mtbmGroups()` for optgroup rendering.
- `src/mtbm/catalog.test.ts` — integrity tests: every entry has id/model/
  positive cutterOdIn; `cutterOdIn ≈ shieldOdMm/25.4`; shield OD ≥ pipe OD
  where both present; `findMtbm` round-trips; torque/power positive where set.
- `src/cases/types.ts` — add `mtbmId?`, `mtbmModel?`, `cutterHead?` to
  `CaseGlobals`.
- `src/components/CaseEditor.tsx` — new `MtbmSection` above Globals:
  machine picker (optgroups), spec card (torque, power, rpm, shield OD,
  steering, drive length, slurry line, pipe range), cutter-head select,
  catalog-edit indicator, "verify with manufacturer data sheet" note.
- `src/cases/assumptions.ts` — `settlementAssumptions(c, r)`; add a
  machine-spec provenance line to `REPORT_ASSUMPTIONS` only if generically
  true — no, keep REPORT_ASSUMPTIONS unchanged; the populated builder carries
  the provenance line conditionally.
- `src/cases/assumptions.test.ts` — populated lines contain the actual
  cutter OD, model name, VL%, K values, limits.
- `src/components/ResultsTab.tsx` — `SettlementSection({ c, r })` with
  Assumptions sub-block.
- `src/report/buildReport.ts` — MTBM row + populated settlement assumptions.
- Help modal: one line documenting the MTBM picker (optional, keep small).

## Dependencies
- None (catalog is standalone data; assumptions builder reuses existing
  `SettlementResults` fields).

## Completion checklist
- [ ] `npx tsc --noEmit` clean (strict)
- [ ] `npx eslint` clean
- [ ] `npx vitest run` green (catalog + assumptions tests included)
- [ ] `npm run build` succeeds
- [ ] progress-tracker.md updated
- [ ] Manual UI check on dev or live: picker autopopulates cutter OD, spec
      card shows, settlement assumptions list populated values
