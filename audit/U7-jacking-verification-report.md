# U7 Verification Report — Jacking Engine vs. ASCE 36-15

**Date:** 2026-09-22 · **Standard:** ASCE 36-15, §13.4 (Evaluation of Jacking Forces),
§13.3 (Earth Loads), §13.5 (Settlement), §16.5 (FS) · **Method:** static review of
`mtCompute`/`settleCompute` in `source/Microtunnel_Jacking_Load_Tool_v2.0_1.html`.
Reference hand-calc test still required before the unit closes.

## Provision-by-provision mapping

| # | ASCE 36-15 provision | HTML implementation | Verdict |
|---|---|---|---|
| 1 | JF = FP + ΣFR (§13.4) | `mtCompute`: faceKN + Σ segment friction | ✅ MATCH |
| 2 | FR = σ'n · μ' · Ac · L (§13.4) | `f·π·OD·L·curve`; f from ground-class table (low/base/high) or per-segment override | ⚠️ FORM MATCHES, BASIS DIFFERS — f is empirical/tabulated, not derived from σ'n × μ' |
| 3 | σ'n evaluated with arching theory; total overburden overestimates except <2 diameters cover (§13.4) | No arching computation | ❌ GAP |
| 4 | μ' = tan(residual φ'), reduced for lubrication (§13.4) | Lubrication tracked (lubPres/lubVol); friction values empirical, no φ' derivation | ⚠️ PARTIAL |
| 5 | Very stiff/hard clay & stable rock: friction = buoyant pipe weight × μ' (§13.4) | Not present | ❌ GAP |
| 6 | FP ≈ A_head × (u + effective earth pressure); typically slightly > u + active (§13.4) | faceKN = (K0·σ'v + u) × A_face | ⚠️ DELTA — at-rest (K0) is conservative vs the active-earth reference; document or add Ka option |
| 7 | Curves increase friction (contact pressure + plowing) (§13.4) | Per-segment curve factor | ✅ CONCEPT MATCH — verify factor values are sourced |
| 8 | Check face-pressure pushback when jacks release; pipe brake/clamp may be needed (§13.4) | restartLow/Base/High present; no pushback/brake check | ⚠️ PARTIAL — add pushback check |
| 9 | FS = pipe ultimate (or yield) axial capacity ÷ max anticipated JF at the jacks; reduce for misalignment, end squareness, curves (§16.5) | Utilization vs manufacturer allowable; curve caveat flagged | ✅ CONSISTENT — confirm FS definition in code comments |
| 10 | Earth loads: arching; <1D·γ' in stiff/hard clay & dense sand; 2–3D·γ' in soft clay/loose-medium sand; negligible in rock/hard clay; Marston + cohesion for conservative estimate (§13.3) | Not implemented | ❌ GAP |
| 11 | Assume good workmanship & state all assumptions (§13.4) | Warnings channel + PROVISIONAL calc basis + assumptions display | ✅ MATCH |
| 12 | Settlement: risk-management process (identify facilities → allowables → evaluate → compare → mitigate → monitor → coordinate); trough method per Peck/Schmidt/Cording-Hansmire/Bennett (§13.5) | Gaussian/Peck trough, volume-loss input, K factor, receptors, limits | ✅ CONSISTENT — method matches the standard's referenced approach |

## Required changes (to flip calc basis PROVISIONAL → VERIFIED)
1. **σ'n via arching** — implement Marston + cohesion per §13.3 as the σ'n source (option
   alongside tabulated f, which remains valid as an "industry-recognized rational
   method" per the §13.4 reference list: Bennett 1998, Bennett & Cording 2000, PJA
   1995b, Thomson 1993, Stein 2005, Najafi 2013).
2. **Buoyant-weight fallback** for very stiff/hard clay and rock (§13.4).
3. **Pushback/brake check** — verify pipe string against face-pressure thrust when
   jacks release in early drive (§13.4).
4. **Face pressure basis** — document K0 conservatism or expose Ka-based lower bound (§13.4).
5. **New: face pressure module** — the HTML has no real module; build per §13.4
   definition + §19 operational guidance (slurry/EPB pressure monitoring).
6. **Cite section numbers** in code comments; flip `calculationBasis` approvals as each
   item is implemented and hand-calc-tested.

## Out of scope for this verification
Face pressure module design (new unit), settlement hand-calc case, geospatial shell.
