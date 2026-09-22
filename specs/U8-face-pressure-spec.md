# U8 Spec — Face-Pressure Module

## Goal
Standalone face-pressure design module per ASCE 36-15 §13.4. The jacking engine (U7)
computes the face *force* component; this module computes the required face *pressure*
operating window per station along the drive: minimum stable pressure, recommended
target, and blowout guard.

## Design decisions
- Pure module at `src/engine/face-pressure/`. Zero DOM/network imports.
- Shared soil-stress helpers move to `src/engine/common/soil-stress.ts`
  (unit weight of water, axis depth, pore pressure, σ'v); U7 refactored to import them.
- Per-station inputs (cover, groundwater, γ, K0, Ka) — aligns with the future profile
  model (U3/U6); pressure varies along the drive.
- ASCE 36-15 §13.4 gives one quantitative statement: actual face pressure is typically
  slightly greater than **u + active earth pressure**. That is the minimum-stability
  basis. The at-rest (K0) basis is the conservative operating target (consistent with U7).
- Blowout/heave guard is a **user-configurable heuristic** (default factor 1.0 × total
  overburden at axis), explicitly marked `TODO(source needed)` — ASCE 36-15 states no
  blowout formula. Never presented as a code value.
- Machine delivery limits (min/max pressure) are user inputs; the module checks the
  required window fits inside them.
- Never throws on incomplete input — stations carry OK / REVIEW / INPUT REQUIRED / ERROR.

## Implementation details
- `src/engine/common/soil-stress.ts` — `GAMMA_W_PCF`, `axisDepthFt`, `porePressurePsf`,
  `sigmaVEffPsf` (moved from U7, exported).
- `src/engine/face-pressure/types.ts` — `FaceStation`, `FaceInputs`, `FaceStationResult`,
  `FaceResults`. Units in names (`coverFt`, `pressurePsf`, `forceKips`).
- `src/engine/face-pressure/face-pressure.ts` —
  - `minStablePressurePsf(u, Ka, σ'v)` = u + Ka·σ'v (§13.4)
  - `targetPressurePsf(u, K, σ'v)` with K selectable at-rest/active (§13.4)
  - `maxBlowoutPressurePsf(σvTotal, blowoutFactor)` — heuristic, TODO(source needed)
  - `pressureToForceKips(pPsf, cutterODIn)` — ties pressure to U7's FP
  - `computeFacePressures(inputs)` — per-station window, machine-limit checks,
    governing station (max target), warnings channel
- Statuses: missing inputs → INPUT REQUIRED; pMin > pMax → REVIEW (window inversion,
  shallow cover / artesian); target outside machine limits → REVIEW; zero effective
  stress → REVIEW + artesian warning.
- `scripts/gen_face_reference.py` — independent Python implementation.
- `src/engine/face-pressure/face-pressure.test.ts` — Vitest incl. FP-01 reference case.

## Dependencies
- `src/engine/common/soil-stress.ts` (new); U7 refactor to import it.

## Completion checklist
- [x] `npx tsc --noEmit` clean (strict)
- [x] `npx vitest run` green, including FP-01 reference test (12/12; 28/28 with U7)
- [x] ASCE cites on every standard-derived value; blowout guard marked TODO(source needed)
- [x] Window-inversion, artesian, and machine-limit paths covered by tests
- [x] progress-tracker.md updated
- [ ] User hand-calc countersign of FP-01 (expected values currently from independent Python implementation)
