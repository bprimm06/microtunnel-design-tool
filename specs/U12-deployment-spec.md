# U12 Spec — Deployment

## Goal
Ship the tool as a static site the user can open in Edge/Chrome, per the
user's approval on 2026-09-22.

## Design decisions
- **Target:** GitHub Pages (free, no new account if the user has GitHub; only
  `gh` CLI available in this environment).
- **Build portability:** `base: './'` in `vite.config.ts` so the bundle works
  from any subpath (Pages serves from `/<repo>/`).
- **Steps:**
  1. Production build verified locally (relative asset paths in `dist/`).
  2. `git init`, commit the source (dist is NOT committed — Pages builds from
     source via the Pages workflow, or serve `dist/` from a `gh-pages` branch;
     decision: use the official GitHub Pages Actions workflow building from
     source on push to main).
  3. `gh auth login` (user completes the device/browser flow — the one step
     only they can do).
  4. Create the repo, push, enable Pages.
  5. Verify the live URL loads: title, map tiles, a smoke pass of the tabs.
- **Verification on a real project file:** the tracker requires verifying with
  a real project file — after deploy, load a representative `.microtunnel.json`
  in the live app (via Playwright/Chromium against the public URL) and confirm
  state restores.

## Out of scope
- Custom domain (can be added later in repo settings).
- Private-repo Pages (needs Pro) — repo will be public unless the user says
  otherwise.

## Completion checklist
- [x] `base: './'` set; production build has relative asset paths
- [x] Repo created and pushed; Pages enabled (`bprimm06/microtunnel-design-tool`,
      public repo, default branch `main`)
- [x] Live URL loads and renders the app —
      https://bprimm06.github.io/microtunnel-design-tool/
- [x] Real project file opens correctly on the live site (demo
      `.microtunnel.json`: alignment, borings, crossings restored; Base case
      ran — jacking/face/settlement all rendered)
- [x] progress-tracker.md updated (U12 done)

## Post-deploy fix (2026-09-22)
- CARTO Positron basemaps now require an API key and rendered an
  "API KEY REQUIRED" watermark. Replaced with keyless layers: Esri World
  Imagery (satellite, default) and OSM standard streets.
- Hidden file inputs changed from `display:none` to `sr-only` (+ aria-labels):
  keeps them out of sight while remaining addressable for assistive tech and
  automated smoke tests. No UX change.
