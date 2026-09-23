# U18 Spec — Help Menu

## Goal
A Help menu with instructions like the original HTML tool's "How to Use"
modal (`source/Microtunnel_Jacking_Load_Tool_v2.0_1.html`, `helpHTML()`):
what the tool does, numbered how-to steps, and what it is not. Content is
rewritten for the new app's actual workflow (import → profile → borings →
crossings → results → save/report).

## Design decisions
1. **`HelpModal` component** (`src/components/HelpModal.tsx`): fixed overlay +
   centered panel, sections "What this tool does", "How to work" (numbered
   steps), "Data sources & field-verify badges", "What it is not". Tailwind
   styling consistent with the app; `open`/`onClose` props.
2. **Entry points:** a "Help" button in the app header and a `?` floating
   button bottom-right — parity with the original (header button + FAB that
   reopens the modal any time).
3. **First run:** the modal opens automatically on first visit
   (`localStorage` flag `microtunnel-help-seen`); "Got it — start working"
   dismisses and sets the flag. Dismissal via ×, backdrop click, or Escape.
4. Content states the verification posture honestly: engines run built-in
   self-checks; HTML reports are unsealed working documents, not
   engineer-sealed deliverables; remote data (OSM/NWI/NLD/GE) is screening
   data — field verify.

## Out of scope
- Inline ⓘ help toggles inside individual tabs (the original had these;
  separate unit if wanted).
- Any change to calculation, import, or save behavior.

## Completion checklist
- [ ] Help modal opens from the header button and the `?` button
- [ ] First-run auto-open with persistent dismissal
- [ ] Content accurate to the current app workflow and disclaimers
- [ ] Tests green, `tsc` clean, production build succeeds
- [ ] progress-tracker.md updated (U18 done)
