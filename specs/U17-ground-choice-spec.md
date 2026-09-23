# U17 Spec — Ground Data Choice (KMZ vs Manual)

## Goal
Give the user a choice over ground elevations instead of silently accepting
KMZ-interpolated values everywhere. Approved by the user 2026-09-22:
"Let's keep the stationing at every 25 feet for now but the ground data
needs a choice. 25' could skip some important features."

Context: the ConEdison KMZ carries only 4 vertex altitudes over 1,170 ft —
linear interpolation over ~300 ft spans can miss ditches, crowns, and other
features that matter for cover. The user wants to supply surveyed spot
elevations where it counts.

## Design decisions
1. **Ground source choice at import.** The LeftRail import section gains a
   "Ground source" select, applied on the next import:
   - `KMZ altitudes (GE-derived)` — current behavior: every station gets
     `groundElevFt` interpolated from KML vertex altitudes, `elevSource: 'ge'`.
   - `Manual entry` — stations get no ground; the user fills it in the
     profile table. `elevSource` stays unset until edited.
   The choice is a UI setting only (not serialized); it defaults to KMZ.
2. **KMZ values always retained.** At import with KMZ source, each station
   also stores `geGroundElevFt` (the KMZ-derived value) alongside the working
   `groundElevFt`. This survives manual overrides and enables restore.
   New optional `Station` field — backward compatible with the v1 project
   file schema (validator only requires chainageFt/lat/lon).
3. **Editable ground in the Profile station table.** The Ground cell becomes
   an input. Typing a value sets `groundElevFt` and `elevSource: 'survey'`;
   clearing it restores the KMZ value where one exists (`geGroundElevFt`),
   else leaves the station without ground. Editing ground marks the profile
   inputs-changed (stale banner) the same way invert edits do.
4. **Restore.** A "Restore GE ground" button on the profile resets every
   station's working ground to its `geGroundElevFt` (stations without a KMZ
   value are left untouched). Confirms first if any survey overrides exist.
5. **Warnings and badges.** `MISSING_GROUND_ELEV` already covers manual-entry
   stations without ground — no change. The profile tab's GE badge becomes
   per-source: stations with `elevSource: 'ge'` show the GE badge,
   `'survey'` shows a "survey" badge, missing ground shows "—". The
   "GE-derived — field verify" disclaimer stays wherever GE values appear;
   survey-entered values get "user-entered — verify".

## Out of scope
- Changing the 25 ft station interval (stays fixed per user).
- Pulling elevations from an external service (USGS 3DEP or similar) —
  separate unit if wanted.
- Editing ground anywhere other than the profile station table.

## Completion checklist
- [ ] Import offers ground source choice; manual path leaves ground unset
- [ ] `geGroundElevFt` stored at import; survives project save/open round-trip
- [ ] Profile table Ground cells editable; overrides flagged `elevSource: 'survey'`
- [ ] Restore GE ground with confirmation when overrides exist
- [ ] Per-source badges/disclaimers in the profile tab
- [ ] Tests green, `tsc` clean, production build succeeds
- [ ] Live verification on a real alignment
- [ ] progress-tracker.md updated (U17 done)
