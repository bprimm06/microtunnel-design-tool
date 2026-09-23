# U19 Spec — Ground reference in the profile editor

## Problem
The profile editor (invert control points) shows no ground elevations, so the
user sets launch/reception inverts blind. In manual-entry mode there is also a
chicken-and-egg problem: ground can only be entered in the station table,
which appears after the profile is built — but the user wants ground *before*
setting the invert.

## Design decisions
1. New **"Ground elevations" section at the top of the profile editor**,
   before the invert control points.
2. **Summary line:** launch (0+00) and reception (final station) ground with
   per-source badges — the two values the user asked for, visible without
   scrolling.
3. **Full station table** below the summary: Station | Ground (editable
   `GroundInput`) | Src, scrollable; launch and reception rows highlighted.
   Reuses the existing `GroundInput` + `setStationGround`, which already work
   pre-profile (the state helper rebuilds only when a profile exists).
4. **Empty-state hint** when no station has ground: "No ground elevations yet
   — enter surveyed values below, then set the invert." Build is not blocked;
   `MISSING_GROUND_ELEV` still warns after build.
5. Help modal step 2 gains one clause pointing at the ground-first workflow.

## Out of scope
- Blocking profile build on missing ground.
- Changing buildProfile, stationing math, or the post-build station table.

## Completion checklist
- [ ] Editor shows launch/reception ground with badges before invert inputs
- [ ] Ground editable pre-build; edits persist to the built profile
- [ ] Empty hint shown when no ground exists
- [ ] Tests green, `tsc` clean, ESLint clean, production build succeeds
- [ ] progress-tracker.md updated (U19 done)
