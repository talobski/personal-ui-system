# Workbench Theme Editor Polish v1 — Implementation Contract

Phase: `workbench-theme-editor-polish-v1-001`

Accepted base: `89b74d821e2e3dad9733c8a39131633e27a852a8`

Planning context: PUI-11 through PUI-17. Linear is non-authoritative; this
contract, `.loop`, and Git govern execution.

## Outcome

Deliver one coordinated Workbench polish batch that makes the preview consume
the full right panel, themes the Workbench chrome from the active canonical
Theme v2 value, replaces the single-token color editor with grouped live color
rows, removes the visible fork and baseline-diff workflows, simplifies theme
selection and the preview toolbar, and restyles the panel separator as a subtle
interactive divider.

## Product decisions

### Preview sizing

- Remove the user-facing Mobile 390 / Desktop 1024 selector and its fixed-width
  preview mode.
- The preview iframe/canvas fills the actual available right panel.
- Responsive behavior is verified through real browser viewports at 390x844
  and 1440x900.

### Saving without Fork

- Remove Fork terminology and the visible Fork workflow.
- Built-in themes remain immutable.
- Saving an edited built-in opens a minimal Save As flow that accepts a name,
  creates a schema-valid local custom copy with a deterministic safe id, saves
  it, and selects it.
- Saving an already-saved custom theme updates it normally.
- Existing valid saved themes and selections remain loadable.
- Internal base/diff metadata may remain only where required for persistence,
  validation, proposal safety, or tests. It is not shown in normal UI.

## Architecture invariants

- `personal-ui-theme/2` remains the only canonical theme model.
- Workbench chrome receives CSS variables rendered from the active `current`
  theme; there is no duplicate Workbench-specific theme state.
- When a proposal is staged, only the preview iframe receives the candidate
  theme. Workbench chrome continues to render the active theme and clearly
  states that the candidate is not active.
- Every manual color edit remains a closed `setColor` operation through core
  normalization and validation. Valid edits update immediately; invalid drafts
  remain visible but never activate.
- Design Command evaluation, proposal staging, Apply/Discard, stale handling,
  locking, validation, persistence, and export remain intact.
- Use accepted Button, Collapsible, Field, Input, NativeSelect, ResizablePanel,
  Switch, Tabs, and other accepted primitives. No bespoke interaction state
  machine may replace an accepted primitive.
- No public registry resource, schema, token, mutation operation, proposal
  semantic, Design Command/Jev behavior, credential boundary, or network
  capability may be added.

## Ticket scope

### PUI-11 — full-panel preview

- Remove fixed iframe width/height assumptions that prevent use of the right
  panel.
- Fill the available preview panel while retaining scroll containment, focus
  indication, iframe messaging, Cards/States views, and mobile Controls/Preview
  replacement.

### PUI-12 — active theme on Workbench chrome

- Render the active theme's canonical CSS variables into the parent Workbench
  document.
- Keep light/dark mode synchronized across shell and preview.
- Preserve active-versus-staged separation.

### PUI-13 — grouped color rows

- Replace the token selector with these collapsible groups: Surfaces; Primary;
  Secondary; Muted; Accent; Destructive; Border, Input & Ring; Charts.
- Reuse the existing `ControlSection`/Collapsible section and header pattern.
  Do not add tweakcn-style pill group headers.
- Show every canonical color token exactly once for the selected mode.
- Each row has an accessible token label, visible swatch/native color picker,
  canonical text input, validation feedback, and immediate valid updates.
- Native picker values enter through the existing color normalization boundary;
  canonical storage remains OKLCH.

### PUI-14 — remove visible fork/diff

- Remove the baseline-diff panel, Fork button/dialog, Fork labels, and normal-UI
  fork guidance.
- Preserve proposal candidate diffs and any internal diff/base capability still
  required by accepted behavior.
- Implement the approved minimal Save As flow.

### PUI-15 — subtle divider

- Keep the accepted resizable-panel primitive and its pointer, keyboard, ARIA,
  bounds, hover, and focus behavior.
- Render a subtle one-pixel-style divider with a larger invisible interaction
  target and clear hover/focus feedback.

### PUI-16 — compact theme selector

- Replace the full labeled selector/metadata block with a compact selector in
  the tweakcn spirit using accepted primitives and semantic tokens.
- Preserve accessible naming, current theme identity, built-in/custom status,
  valid persisted selection, and proposal locking.

### PUI-17 — simplified preview toolbar

- Remove the width selector.
- Replace the Light/Dark toggle group with accepted `Switch`, accessibly named
  and synchronized with shell/preview mode.
- Keep only supported Save, Export, and proposal-access actions with clear
  hierarchy; do not add undo, redo, reset, import, sharing, or other unrelated
  tweakcn behavior.

## Acceptance criteria

- **WTEP-01:** PUI-11 through PUI-17 are delivered as one bounded batch; no
  unrelated Linear request is implemented.
- **WTEP-02:** At 1440x900 the preview fills the available right panel; at
  390x844 Preview fills the mobile Preview mode. No fixed device selector or
  fixed preview width remains.
- **WTEP-03:** Workbench chrome and preview both render the active Theme v2 in
  light and dark modes without duplicate theme state.
- **WTEP-04:** A staged proposal changes only the preview candidate; chrome
  remains on the active theme and status remains unambiguous.
- **WTEP-05:** Every canonical light/dark color token appears exactly once in
  the approved collapsible groups using the existing section/header pattern.
- **WTEP-06:** Picker and text edits normalize through `setColor`, apply live
  when valid, retain invalid drafts without activation, and preserve canonical
  OKLCH storage.
- **WTEP-07:** No user-facing baseline diff, Fork control, Fork dialog, or Fork
  terminology remains. Proposal diffs continue to function.
- **WTEP-08:** Saving an edited built-in requires minimal Save As, creates and
  selects one validated local custom theme, and never mutates the built-in.
  Saving a custom theme updates it. Existing valid saved data still loads.
- **WTEP-09:** The compact selector preserves built-in/custom identity,
  selection persistence, locking, keyboard use, and accessible naming.
- **WTEP-10:** The divider is visually subtle and passes pointer, Arrow,
  Home/End, bounds, ARIA separator, hover, and visible-focus checks.
- **WTEP-11:** The simplified toolbar uses accepted Switch for mode and retains
  only supported actions; shell and preview remain synchronized.
- **WTEP-12:** Design Command, proposal stage/preview/Apply/Discard/stale,
  validation, export, local persistence, manual locking, and responsive
  Controls/Preview behavior retain accepted semantics.
- **WTEP-13:** Mobile/desktop, light/dark, reduced motion, containment,
  keyboard, and decoded axe checks pass with zero serious/critical findings.
- **WTEP-14:** Registry remains exactly 13 resources and all public schemas,
  tokens, mutations, context outputs, credential boundaries, and network/Jev
  behavior remain frozen.
- **WTEP-15:** Owner visual review passes panel proportions, preview dominance,
  grouped color rows, compact selector, divider, toolbar, staged-state clarity,
  and mobile presentation before final acceptance.

## Verification

- Full unit and TypeScript suites.
- Registry build and exact 13-resource audit.
- Workbench and Storybook builds.
- Storybook and complete Workbench browser matrices at 390x844 and 1440x900.
- Light/dark, reduced-motion, pointer/keyboard, containment, proposal lifecycle,
  persistence migration, Save As, export, and decoded axe evidence.
- Design Command fail-closed/live boundary regression without expanding Jev.
- A phase-specific frozen-boundary scan.
- Owner visual review before protected verification.
- Fresh protected Codex STANDARD verifier, read-only with no repair authority.

## Execution envelope

- Producer: one-use owner-approved `loop_worker_claude_max`,
  `claude/claude-opus-5-5`, MAX, medium, auto, fast mode off.
- A provider substitution requires a new explicit owner approval. A later
  owner-approved Astra continuation must reuse this phase, branch/worktree,
  candidate history, and contract without replay.
- Verifier: `loop_worker_codex_standard`, `codex/gpt-5.6-terra`, STANDARD,
  medium, read-only, no repair authority.
- Project lifetime ceiling: 46; phase maximum: 3 runs; expected: 2 runs.
- Third run: bounded recovery/reverification only.
- Execution time: 300 minutes. Concurrency: 1. Paid spend: $0.
- Worker network, credentials, external actions, deployment, and publishing are
  prohibited.

## Explicit non-goals

- No undo, redo, reset, import, share, publishing, or deployment.
- No raw-CSS or Workbench-only theme system.
- No new public components, schemas, tokens, operations, proposal semantics,
  Design Command categories, Jev behavior, LLM behavior, MCP, or project
  extraction.
- No literal recreation of unrelated tweakcn behavior or branding.

