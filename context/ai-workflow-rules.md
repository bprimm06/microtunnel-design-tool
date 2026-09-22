# AI Workflow Rules — Microtunnel Design Tool

## The loop (every unit, no exceptions)
1. Read the unit's **spec file**: goal → design decisions → implementation details →
   dependencies → completion checklist.
2. Kick off with: "Read this spec. Mark it as in progress in the progress tracker.
   Implement it exactly as specified. Don't go beyond scope."
3. Build against the spec. Small, verifiable steps — never large speculative changes.
4. Review your own work against the spec's completion checklist.
5. If it passes: update `progress-tracker.md`, close the unit. If not: one focused
   corrective prompt — exactly what's wrong, exactly what's expected, fix that one
   thing, move on.

## Agent discipline
- **One unit at a time.** Never combine unrelated concerns in a single session
  (e.g. don't touch the settlement engine while building KML import).
- **Don't go beyond scope.** If the spec doesn't ask for it, don't build it — note it
  as a follow-up in the progress tracker instead.
- **When a requirement is unclear, stop and ask.** Especially for engineering
  semantics (what counts as "profile depth" at a shaft? which OSM tags are crossings?).
- **Never invent engineering constants.** A friction coefficient, K0, volume-loss ratio,
  or face-pressure factor you can't source to ASCE 36-15 or a named reference becomes
  `TODO(source needed)` + a question to the user — never a plausible-looking guess.
- **Calc units close on evidence:** reference hand-calc case passes in Vitest, or the
  unit stays open.
- **Fresh sessions:** if context is lost, re-read the six context files and
  `progress-tracker.md` — that's what they're for. Don't re-derive decisions.
- **Update the tracker** at unit start ("in progress") and unit end ("done" + notes).
  The tracker is the project's memory.
