# U7 Spec — Verified Jacking Engine Module

## Goal
Port the jacking-force calculation from `source/Microtunnel_Jacking_Load_Tool_v2.0_1.html`
(`mtCompute`) into a pure, tested TypeScript module implementing ASCE 36-15 §13.4
(+ §13.3, §16.5), resolving the 4 deltas in `audit/U7-jacking-verification-report.md`.

## Design decisions
- **Pure module** at `src/engine/jacking/`. Zero DOM/Leaflet/network imports. All inputs
  explicit; all outputs carry units in field names.
- **Two friction modes** per segment: `tabulated` (existing ground-class f values,
  preserved as the "industry-recognized rational method" path) and `arching`
  (σ'n from Terzaghi arching incl. cohesion per §13.3, μ' = tan(φ'r) reduced for
  lubrication per §13.4).
- **Face basis selectable**: `at-rest` (K0, default, conservative) or `active` (Ka),
  per the §13.4 "slightly greater than u + active" reference.
- **New checks**: buoyant-weight fallback for very stiff/hard clay & rock (§13.4);
  face-pressure pushback/brake check (§13.4); FS/utilization per §16.5 with
  misalignment note surfaced as a warning.
- **Every constant cites its ASCE section** in a code comment. Anything unsourced is
  `TODO(source needed)` — never a guess.
- Low/base/high estimates preserved (restart/initiation forces included as breakout
  allowance, labeled as engineering-judgment inputs).

## Implementation details
- `src/engine/jacking/types.ts` — `JackingInputs`, `DriveSegment`, `GroundClassEntry`,
  `JackingResults`, `SegmentResult`, `CheckStatus`. Units in names (`coverFt`,
  `pressurePsf`, `forceKips`).
- `src/engine/jacking/jacking.ts` —
  - `computeJackingForce(inputs): JackingResults`
  - `faceComponent(...)` — FP = (K·σ'v + u) · A_head (§13.4)
  - `frictionArching(...)` — Terzaghi arching σ'n (§13.3), μ' = tan(φ'r) · lubrication
    reduction (§13.4)
  - `frictionBuoyant(...)` — buoyant pipe weight × μ' for hard ground (§13.4)
  - `pushbackCheck(...)` — face thrust vs restraint; warns if restraint not provided
  - `utilization(...)` — max JF ÷ allowable, FS definition per §16.5
  - Per-segment status: OK / REVIEW / ERROR / INPUT REQUIRED (same semantics as HTML).
  - `warnings[]` channel; no throws on incomplete input — named error statuses.
- `src/engine/jacking/reference-cases.ts` — one reference drive with expected values
  computed independently (Python, documented below); to be countersigned by the user's
  hand calc.
- `src/engine/jacking/jacking.test.ts` — Vitest: reference case, arching vs tabulated
  sanity, buoyant fallback trigger, pushback warning, Ka/K0 face delta, input-required
  statuses.

## Dependencies
- None (new scaffold: TypeScript strict + Vitest at project root; folds into the app
  scaffold at U1).
- Reference values: `scripts/gen_reference.py` (independent Python implementation).

## Completion checklist
- [x] `npx tsc --noEmit` clean (strict)
- [x] `npx vitest run` green, including reference-case test (16/16)
- [x] Every ASCE-derived constant has a section cite; no unsourced numbers
- [x] Pushback, buoyant fallback, and Ka/K0 paths covered by tests
- [x] progress-tracker.md updated; report notes implementation deltas
- [ ] User hand-calc countersign of REF-01 (expected values currently from independent Python implementation)
