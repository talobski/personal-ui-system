# Workbench Nested Gallery and Interaction Polish v1 contract

Phase: `workbench-nested-gallery-interaction-polish-v1-001`

Accepted product base: `a33c3d025fe408593264b96f76f4f6054d83b758`

Tickets: PUI-65, PUI-66, PUI-67, PUI-68, PUI-69, PUI-70.

The frozen Linear ticket snapshots (six complete issue/comment payloads) are
retained only in Git history, at
`8a7550e:.loop/runs/workbench-nested-gallery-interaction-polish-v1-001/linear-ticket-snapshots.md`
(a path from the retired agent tooling). This reconciled contract is
authoritative if either source conflicts. Later Linear edits do
not mutate this phase.

## Scope and order

Deliver all six tickets as one bounded follow-up phase:

1. Replace the flat global preview grid with gallery-owned nested regions.
2. Restore Cards / States as left-aligned shadcn Tabs.
3. Correct shared collapsible-trigger typography to use Body.
4. Correct both built-in Theme v3 Heading defaults to sans-serif.
5. Polish the preview toolbar action grouping.
6. Debounce picker-driven color mutations while preserving immediate local
   feedback and one meaningful history checkpoint.
7. Run integrated offline, browser, accessibility, and protected verification.

Preserve shadcn-first architecture, Theme v3, per-theme session history,
Design Command Preview / Apply / Discard, persistence/import/export/custom
themes, and current proposal-staleness behavior. Do not add a layout DSL,
masonry, dense packing, absolute placement, arbitrary size metadata, a new
typography scale, dependencies, public resources, credentials, network paths,
or external actions. Registry count remains exactly 19 and mutation operation
count exactly 12.

## PUI-65 — nested gallery regions

First encode a regression that reproduces the accepted flat grid's dead-space
failure: unrelated compositions sharing a global CSS Grid row are coupled to
the tallest item. Then replace the single global grid with an explicit,
gallery-owned recipe whose regions size independently.

Initial wide-layout recipe:

- outer responsive gallery;
- activity stack: Productive Week, then Team Access;
- profile/action stack: Account Profile, Notifications, then Support Request;
- full-region Workspace Settings;
- a local two-column group containing Recent Activity and Room to Think.

At wide preview widths, the two principal stacks may use an approximately
`7fr / 5fr` split. At medium widths they become coherent sequential regions;
the final local pair may remain two columns when it fits. Small/mobile is one
column. All cards retain natural content-driven height.

The exact grouping is layout configuration, not permanent product taxonomy.
The Lead may make a bounded regrouping if browser evidence materially improves
balance while preserving these durable invariants:

- gallery-owned nested regions and independent vertical stacks;
- local side-by-side grouping only where intentional;
- natural/content-driven heights;
- coherent DOM, reading, and focus order;
- no masonry, dense packing, global row coupling, or absolute placement.

Remove `PreviewLayout` and its per-composition global-span metadata. Do not
replace it with equivalent per-composition span metadata absent new evidence.
Keep composition/resource implementations unchanged.

## PUI-70 — preview tabs

Remove the centered Cards / States Select and restore official shadcn
`Tabs`, `TabsList`, and `TabsTrigger`. Keep the navigation left aligned and
reuse the current sidebar-tab styling through a small Workbench-local shared
style/helper where practical. It must visually align with Colors, Typography,
Effects, and Command while retaining correct tab semantics, arrow-key
navigation, focus-visible treatment, and selected-state announcement.

## PUI-66 — Body typography for control sections

Shared `ControlSection` collapsible triggers are Workbench chrome and must use
the active theme's Body family, weight, and tracking. Prefer inheritance or
one shared trigger rule; remove Heading-role application and conflicting local
font weight/tracking. Preserve uppercase transformation, size, spacing,
semantic colors, ring, radius, chevron, hover/focus, expanded state, and
keyboard behavior.

## PUI-67 — built-in Heading defaults

For both canonical Theme v3 built-ins, Default and Quiet Editorial:

- Heading font equals that fixture's Body sans-serif stack;
- Body font remains its sans-serif stack;
- Mono remains its monospace stack;
- Heading weight remains 600;
- Body weight remains 400;
- existing Heading/Body tracking remains unchanged.

Update intentional mirrors, provenance, generated CSS, and fixture tests.
Arbitrary legacy v1/v2 migration remains serif -> Heading and sans -> Body;
do not change user-theme migration semantics. Users may still manually select
serif for Heading.

## PUI-68 — toolbar grouping

Present the recovery and file actions as:

`Undo  Redo  Reset  |  Export  Save`

Enabled Undo, Redo, and Reset expose a pointer cursor; disabled controls retain
their disabled cursor and semantics. Insert a short semantic vertical
separator between Reset and Export, approximately button height rather than
toolbar height. Rename only the visible/action label from `Export JSON` to
`Export`; preserve the JSON payload, download behavior, Save semantics,
toolbar height, icon sizing, focus order, and accessible names.

## PUI-69 — color-picker debounce and history

Apply one shared picker controller to semantic color and shadow-color picker
inputs. Text/numeric/manual string edits remain immediate.

- Native picker `input`/`change` updates picker-local visible state
  immediately.
- Schedule the expensive canonical mutation 120 ms after the latest picker
  movement.
- A newer value cancels/supersedes the prior timer; latest value always wins.
- Pointer release, change completion, blur, and unmount/theme switch flush or
  safely cancel as appropriate so no stale mutation can land later.
- Use a generation/session identity to reject out-of-order callbacks after
  theme/control lifecycle changes.
- Begin one existing history gesture at the first movement and end it only
  after the final debounced or flushed canonical commit. One continuous drag
  therefore creates one undo checkpoint; intermediate picker states never
  enter canonical history.
- Validation, OKLCH normalization, immediate final preview, dirty state,
  proposal locks, revision monotonicity, and Undo/Redo remain authoritative.

Tune only if exact-candidate browser evidence demonstrates 120 ms is materially
wrong; document the measured reason and keep the delay within 100–150 ms.

## Acceptance criteria

- **NGIP-01 — Frozen traceability.** The worktree packet contains verbatim
  PUI-65–PUI-70 snapshots, metadata/comments/attachment state, timestamp,
  hashes, ticket mapping, and this authoritative contract.
- **NGIP-02 — Bounded delivery.** Changes stay within admitted gallery,
  preview navigation, shared control typography, built-in fixtures, toolbar,
  color-picker scheduling/history, tests, docs, and phase evidence.
- **NGIP-03 — Failure reproduction.** A deterministic test demonstrates the
  old global-row dead-space coupling before the correction and protects the
  independent-region result.
- **NGIP-04 — Nested gallery.** The gallery uses explicit nested regions and
  independent stacks with natural heights and intentional local grids only.
- **NGIP-05 — Responsive order.** Wide, medium, and small layouts remain
  contained, preserve logical DOM/read/focus order, and introduce no masonry,
  dense packing, global row coupling, or horizontal overflow.
- **NGIP-06 — Metadata removal.** `PreviewLayout` and equivalent global-span
  metadata are absent; public composition/resource contracts are unchanged.
- **NGIP-07 — Preview Tabs.** Cards / States use left-aligned official shadcn
  Tabs matching sidebar navigation with correct pointer, keyboard, focus,
  selected-state, and accessible semantics.
- **NGIP-08 — Body trigger typography.** Shared collapsible triggers resolve
  Body family/weight/tracking in both built-in themes and modes while all
  approved non-typographic styling and interaction remain intact.
- **NGIP-09 — Built-in sans Heading.** Default and Quiet Editorial canonical
  fixtures use their Body sans stack for Heading, retain weights/tracking/Mono,
  update mirrors/provenance, and round-trip unchanged.
- **NGIP-10 — Migration boundary.** Arbitrary legacy migration still maps
  serif to Heading; manual serif Heading selection remains valid.
- **NGIP-11 — Toolbar.** Recovery/file grouping, short separator, enabled-only
  pointer treatment, and visible `Export` label are exact; payloads, history,
  Save, focus order, dimensions, and responsive containment are preserved.
- **NGIP-12 — Picker responsiveness.** Picker-local feedback is immediate,
  canonical mutation is approximately 120 ms debounced, release/blur flushes
  latest state, and stale/out-of-order commits are impossible.
- **NGIP-13 — History integration.** One continuous picker gesture produces
  one meaningful undo checkpoint; final color, canonical OKLCH, revision,
  dirty state, Undo/Redo, theme switching, and proposal locking are correct.
- **NGIP-14 — Frozen boundaries.** Registry remains 19, operations remain 12,
  and no dependency, public resource, schema, persistence, credential,
  network, Jev, or external-action boundary expands.
- **NGIP-15 — Lead browser evidence.** Exact-candidate desktop/mobile,
  light/dark, reduced/default motion, layout containment/order, Tabs keyboard,
  toolbar, picker timing/flush/history, Design Command, and accessibility
  regressions pass. No new serious/critical axe finding is admitted; existing
  separately accepted semantic-token debt remains explicitly attributed.
- **NGIP-16 — Protected verification and closeout.** A fresh Claude STANDARD
  verifier audits the unchanged exact candidate offline/source/contract/
  boundary/evidence integrity with no repair or browser responsibility. After
  all technical criteria pass and no owner gate remains, Loop automatically
  accepts, promotes, checks, receipts, and closes the phase.
