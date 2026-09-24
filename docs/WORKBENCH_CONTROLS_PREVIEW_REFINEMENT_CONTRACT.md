# Workbench Controls & Preview Refinement — Implementation Contract

Phase: `workbench-controls-preview-refinement-v1-001`

Accepted product base: `d1db3ab3af931aa66b02119dfe37c2b6dcce7736`

Planning context: PUI-11, PUI-16, and PUI-18 through PUI-24. Linear is
non-authoritative; this contract, `.loop`, and Git govern execution.

## Outcome

Deliver one coordinated Workbench refinement batch: a truly edge-to-edge
preview, full-width rich theme selection, searchable locally rendered font
selection, quieter and consistently labelled controls, removal of the manual
proposal authoring surface without changing Design Command proposal safety, an
official shadcn/Recharts preview chart, shadowless gallery cards, and the exact
approved color-group structure.

## Architecture invariants

- `personal-ui-theme/2` remains the only canonical theme model.
- Font choices write existing canonical sans/serif/mono stacks through the
  accepted `setFontFamily` mutation path. There is no Workbench-only typography
  state or second typography model.
- Manual edits remain immediate, validated canonical mutations.
- Design Command continues to stage proposals behind candidate Preview,
  Apply/Discard, stale handling, locking, and validation.
- Removing the manual Mutation Proposal UI does not remove or weaken the
  proposal contract, staging ledger, candidate renderer, or Design Command.
- Persistence, Save/Save As, export, light/dark synchronization, responsive
  Controls/Preview modes, and immutable built-ins retain accepted semantics.
- No Theme v2 schema, token, mutation-operation, persistence-format, Jev,
  credential, or product-network expansion is admitted.

## Public component additions

Promote exactly three official shadcn-based resources:

1. `select` for rich custom single-choice presentation.
2. `combobox` for searchable font selection.
3. `chart` using Recharts 3 with its accessibility layer.

The registry must contain exactly 16 resources after this phase. NativeSelect
remains accepted and is retained only where native behavior is intentionally
preferable, including the small mobile editor-category selector.

## Font catalog and delivery

All fonts are self-hosted from exact pinned local packages. No runtime request
may target Google Fonts or any external font endpoint. Workers remain offline.

- Sans: Inter, Roboto, Open Sans, Lato, Montserrat, DM Sans, Outfit, Work Sans,
  Space Grotesk, Google Sans, Poppins, IBM Plex Sans, Zalando Sans, Manrope.
- Serif: Playfair Display, Merriweather, Lora, Fraunces, Newsreader.
- Mono: JetBrains Mono, Roboto Mono, Source Code Pro, IBM Plex Mono, Geist Mono.

Each option supplies the selected family followed by deterministic appropriate
fallbacks and writes that stack into Theme v2. The catalog is closed for this
phase. Lato, Poppins, and IBM Plex Mono use pinned static Fontsource packages;
the other families use pinned variable Fontsource packages.

## Ticket scope

### PUI-11 — edge-to-edge preview

- Remove the remaining preview-body inset, viewport border, and radius.
- The iframe fills every available right-panel pixel below toolbar/status and
  follows the real browser viewport.
- Mobile Preview mode is likewise edge-to-edge.

### PUI-16 and PUI-18 — rich active-theme Select

- Replace the active-theme NativeSelect with the accepted shadcn Select.
- Fill the complete top-left selector region without nested-field/pill styling.
- Group richer Built-in and Custom options accessibly.
- Remove the status/id/revision metadata row beneath the selector.
- Preserve selection persistence, proposal locking, and immutable built-ins.

### PUI-19 — remove redundant tab copy

- Remove visible Colors, Typography, Other, and Design Command headings and
  introductory descriptions that repeat the selected tab.
- Retain meaningful group headings, errors, status text, instructions needed
  for safe operation, and accessible tab-panel names.

### PUI-20 — searchable local fonts

- Use the accepted Combobox for Sans, Serif, and Mono.
- Search, arrow navigation, selection, dismissal, disabled state, and visible
  focus must be keyboard-operable.
- Selected fonts render from local assets and update the active Theme v2 stack
  and preview immediately through existing mutation/validation paths.

### PUI-21 — field-label consistency

- Ordinary labels use the current Colors-tab label size, muted color, normal
  sans typography, and sentence case.
- Group headings remain visually distinct.
- Use readable names such as `Card foreground` and `Chart 1`; preserve correct
  label/control associations and distinct names for picker/value pairs.

### PUI-22 — remove manual proposal authoring UI

- Remove the Mutation Proposal heading/copy, JSON textarea, Stage proposal,
  Insert example, proposal log, preview-toolbar Proposal action, and dead
  UI-only parser/state paths.
- Preserve Design Command staging, proposal records, candidate preview,
  Apply/Discard, validation, stale behavior, and active/candidate separation.

### PUI-23 — chart and gallery elevation

- Replace Productive Week's handcrafted bars with the accepted Chart resource
  and Recharts accessibility layer.
- Preserve its data and accessible textual summary and use Theme v2 chart
  tokens.
- Remove shadows only from the eight gallery composition card roots in preview
  presentation. Do not change the public Card primitive globally.
- Keep dedicated component/elevation samples so shadow controls remain visible.

### PUI-24 — color group structure

Use exactly this order:

1. Primary
2. Secondary
3. Accent
4. Base
5. Card
6. Popover
7. Muted
8. Destructive
9. Border, Input & Ring
10. Charts

`Base` is only a UI group for background and foreground. Card and Popover each
contain their existing foreground pair. Every canonical color token appears
exactly once; no token is added or renamed.

## Acceptance criteria

- **WCPR-01:** All nine tickets ship as one bounded batch with no unrelated
  Linear work.
- **WCPR-02:** Desktop and mobile preview geometry is flush to the available
  right-panel edges with zero unintended inset, frame border, or corner radius.
- **WCPR-03:** The full-region theme Select has no metadata row or nested-pill
  presentation and retains accessible grouped selection and persistence.
- **WCPR-04:** Select is an official shadcn-based public resource; NativeSelect
  remains only where native behavior is intentional.
- **WCPR-05:** Combobox is an official shadcn-based public resource and all
  three font controls pass search, pointer, keyboard, focus, disabled, and
  responsive checks.
- **WCPR-06:** Exactly the approved 24 fonts render locally, write canonical
  Theme v2 stacks with appropriate generic fallbacks, persist, export, reload,
  and cause zero runtime external-font requests.
- **WCPR-07:** Redundant tab headings/descriptions are absent while panels and
  meaningful sections remain accessibly named.
- **WCPR-08:** Ordinary field labels follow the approved visual/text convention
  and retain programmatic associations.
- **WCPR-09:** Manual Mutation Proposal UI and toolbar action are absent; dead
  UI-only paths are removed.
- **WCPR-10:** Design Command proposal stage/preview/Apply/Discard/stale,
  validation, locking, and active/candidate isolation retain accepted behavior.
- **WCPR-11:** Productive Week uses the accepted Chart resource, existing data,
  Theme v2 chart tokens, and an accessible summary/layer.
- **WCPR-12:** The eight preview gallery card roots are shadowless without a
  global Card change; dedicated shadow/elevation evidence remains visible.
- **WCPR-13:** Color groups use the exact approved order and contain all 24
  canonical tokens exactly once.
- **WCPR-14:** Save/Save As, persistence, export, manual live editing,
  light/dark, resize, and mobile Controls/Preview behavior remain intact.
- **WCPR-15:** Select, Combobox, and Chart stories/contracts/constraints and
  focused keyboard, reduced-motion, responsive, and axe checks pass.
- **WCPR-16:** Full unit, typecheck, registry, Workbench/Storybook builds,
  Storybook/Workbench browser matrices, and Design Command boundary pass with
  zero decoded serious/critical axe findings.
- **WCPR-17:** Registry is exactly 16 resources; Theme v2 schema/tokens,
  mutations, persistence format, Jev, credentials, and network boundaries are
  frozen except for the admitted local packages/assets.
- **WCPR-18:** Fresh protected verification passes, followed by final owner
  desktop/mobile visual review before acceptance/promotion.

## Verification ownership

- The Lead owns the full browser matrix and records browser evidence separately.
- A fresh Codex STANDARD verifier independently audits the exact clean
  candidate read-only with no repair authority.
- Final owner visual review judges edge-to-edge geometry, selector proportions,
  reduced repetition, label consistency, combobox density/search, color order,
  chart polish, shadowless gallery cards, and mobile presentation.

## Execution envelope

- Producer: one-use owner-approved `loop_worker_claude_max`,
  `claude/claude-opus-5-5`, MAX, medium, auto, fast mode off.
- A provider substitution requires new explicit owner approval. Any later
  approved Astra continuation must reuse this phase, branch/worktree, history,
  candidate, and contract without replay.
- Verifier: `loop_worker_codex_standard`, `codex/gpt-5.6-terra`, STANDARD,
  medium, read-only, no repair authority.
- Lifetime agent-run ceiling: 49. Phase maximum: 3; expected: 2. The third run
  is reserved for bounded recovery/reverification.
- Execution time: 360 minutes. Concurrency: 1. Paid spend: $0.
- Worker network, credentials, external actions, deployment, publishing, and
  paid/API fallback are prohibited.

## Explicit non-goals

- No additional fonts, public resources, tokens, operations, or schemas.
- No runtime font service, raw-CSS theme system, or Workbench-only theme state.
- No Design Command/Jev expansion or proposal-safety reduction.
- No undo, redo, reset, import, publishing, deployment, or unrelated tweakcn
  behavior.
