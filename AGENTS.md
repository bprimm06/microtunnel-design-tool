# Microtunnel Design Tool — Agent Instructions

You are building the Microtunnel Design Tool. Before writing any code, read all six files in `context/`:

1. `context/project-overview.md` — what we're building and what's out of scope
2. `context/architecture.md` — stack, layers, and invariants you must never break
3. `context/code-standards.md` — conventions for code and tests
4. `context/ai-workflow-rules.md` — how you work: one unit at a time, spec-driven
5. `context/ui-context.md` — design tokens and layout rules
6. `context/progress-tracker.md` — current phase, decisions, what's done

## Working rules

- Work in **units**. Each unit has a spec file (goal → design decisions → implementation
  details → dependencies → completion checklist). Implement exactly what's specified.
- **Unit kickoff prompt:** "Read this spec. Mark it as in progress in the progress tracker.
  Implement it exactly as specified. Don't go beyond scope."
- **Never invent engineering constants.** If a formula needs a coefficient you can't source
  to ASCE 36-15 or a named reference, stop and mark it `TODO(source needed)` — do not guess.
- Every calc-engine unit closes only when its reference hand-calc case passes.
- Update `context/progress-tracker.md` when a unit starts and when it closes.

## Lessons
- 2026-09-22: Pin TypeScript to ^5.9.x. npm installs TS 7 latest, which breaks
  typescript-eslint's peer range (>=4.8.4 <6.1.0). Revisit when the ecosystem catches up.
