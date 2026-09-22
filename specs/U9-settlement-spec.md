# U9 Spec — Settlement Module

## Goal
Port the Peck Gaussian-trough settlement model from
`source/Microtunnel_Jacking_Load_Tool_v2.0_1.html` (`settleCompute`,
`settleTroughAt`, `settleSlopeAt`, `settleVerify`) into a pure, tested TypeScript
module consistent with ASCE 36-15 §13.5 ("Evaluation of Settlement Risks").
The audit found the existing model consistent with the Peck approach §13.5
references; this unit ports it faithfully and adds the missing hand-calc test.

## Design decisions
- Pure module at `src/engine/settlement/`. Zero DOM/network imports.
- Volume-loss method (Peck): Vs = VL% × Aexc; Smax = Vs/(i√2π); i = K·z0;
  S(x) = Smax·e^(−x²/2i²); max slope = Smax/(i√e) at x = i.
- Aexc uses cutter OD (excavated area); z0 = cover + pipeOD/2 (tunnel axis).
  Cover input is documented as the MINIMUM cover within the segment (worst case),
  matching the reference implementation's surveyed-profile behavior.
- K (trough width parameter) is an input per segment or via a ground-class
  library — never a hard-coded constant.
- Receptors evaluated on the trough at their station/offset with per-receptor
  or global settlement limits; slope checked against 1:N limit.
- Statuses mirror the reference: OK / MARGINAL / EXCEEDS LIMIT / INPUT REQUIRED
  (+ OUTSIDE DRIVE for receptors). Marginal band = 1/1.25 (ported).
- New engineering check: warn when VL% < geometric annulus volume loss
  (cannot lose less ground than the overcut annulus — likely unconservative).
- The reference implementation's self-verification identities (volume
  conservation, S(i)/Smax = e^−0.5, slope peak at x = i) become Vitest tests.

## Implementation details
- `src/engine/settlement/types.ts` — `SettlementInputs`, `SettlementSegment`,
  `Receptor`, `TroughKEntry`, result types. Units in names.
- `src/engine/settlement/settlement.ts` —
  - `troughSettlementIn(xFt, sMaxIn, iFt)`, `troughSlopeRatio(xFt, sMaxFt, iFt)`
  - `segmentTrough(...)` — z0, i, Vs, Smax, slope per segment
  - `computeSettlement(inputs)` — segments, governing segment, receptors,
    transverse trough at governing segment (±3i), warnings
- `scripts/gen_settlement_reference.py` — independent Python implementation.
- `src/engine/settlement/settlement.test.ts` — ST-01 reference case + identity tests.

## Dependencies
- None (settlement is independent of U7/U8; profile integration comes at U3/U6).

## Completion checklist
- [x] `npx tsc --noEmit` clean (strict)
- [x] `npx vitest run` green, including ST-01 reference test (14/14; 42/42 total)
- [x] Volume-conservation and trough-identity tests pass
- [x] EXCEEDS/MARGINAL/INPUT REQUIRED paths covered by tests
- [x] progress-tracker.md updated
- [ ] User hand-calc countersign of ST-01 (expected values currently from independent Python implementation)
