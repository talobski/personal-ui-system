# Semantic Typography, History, and Grid v1 contract

Phase: `semantic-typography-history-grid-v1-001`

Accepted product base: `47d0aebef617f9d936d21f53089c96bd040e70d6`

Tickets: PUI-3, PUI-63, PUI-64.

The immutable admission-time Linear reference is
`.loop/runs/semantic-typography-history-grid-v1-001/linear-ticket-snapshots.md`.
The complete snapshot and this contract must both be in the producer packet.
This reconciled contract is authoritative if they conflict. Later Linear edits
do not change the admitted phase.

## Scope and order

Deliver all three tickets in one bounded phase, in this order:

1. Evolve canonical Theme v2.1 typography to semantic Theme v3 roles.
2. Add deterministic session-local manual history and recovery against Theme v3.
3. Replace the preview's column stacks with a source-ordered mixed-span grid.
4. Run integrated regression, browser, accessibility, and protected verification.

Preserve shadcn-first architecture, live validated manual editing, immutable
built-ins plus Save As, persistence/import/export/custom themes, and Design
Command Preview/Apply/Discard. Do not add a typography size/line-height scale,
a Code role, arbitrary grid sizing, masonry, a vertical size taxonomy, raw CSS
theme data, credentials, network behavior, or external actions.

The registry remains exactly 19 resources. Current canonical operation count
remains exactly 12 after replacing obsolete typography operation semantics.

## Canonical Theme v3 typography

Theme v3 replaces canonical `sans`/`serif` roles and one global tracking value
with:

- `typography.heading.font`: font-family stack token;
- `typography.heading.weight`: integer font-weight token;
- `typography.heading.tracking`: bounded `em` dimension token;
- `typography.body.font`: font-family stack token;
- `typography.body.weight`: integer font-weight token;
- `typography.body.tracking`: bounded `em` dimension token;
- `typography.mono`: preserved font-family primitive for code/mono content.

Font size and line height remain component-owned. Heading and Body may choose
any admitted catalog stack. Mono is not a third semantic role.

### Migration

Strict v1, v2.0, and v2.1 remain input-compatible through declared migration
steps; canonical output is Theme v3.

- legacy serif -> Heading font;
- legacy sans -> Body font;
- legacy mono -> Mono font;
- legacy global tracking -> both Heading and Body tracking;
- Heading weight -> 600;
- Body weight -> 400.

This deterministic mapping preserves all three existing stacks. Identity,
revision, colors including Sidebar state, radius, space/density, shadows,
motion, extensions, custom-theme selection, and base metadata remain intact.
Default and Quiet Editorial become complete canonical Theme v3 fixtures.

### Renderer and namespaces

The sole renderer/exporter emits:

- `--font-heading`, `--font-body`, `--font-mono`;
- `--font-weight-heading`, `--font-weight-body`;
- `--tracking-heading`, `--tracking-body`;
- composed `type-heading` and `type-body` behavior compatible with the current
  Tailwind 4 build.

`font-*` is reserved for font primitives, `type-*` for composed semantic roles,
and `text-*` for Tailwind size/color conventions. Do not add
`text-heading`/`text-body`.

The Workbench shell and preview roots inherit Body. Shared semantic titles and
headings opt into Heading. Code/preformatted surfaces retain Mono. Adoption
must not overwrite component-owned size/line-height, semantic colors, disabled
states, or accessibility behavior.

### Typography mutations and context

- `setFontFamily` targets `heading | body | mono`.
- `setTracking` targets `heading | body`.
- obsolete `setSansFamily` is replaced by `setFontWeight`, targeting
  `heading | body` with documented bounded integer values.
- Current operation descriptors total exactly 12.
- Where compatibility requires accepting legacy mutation requests, normalize
  them at the input boundary only; do not preserve a parallel canonical model
  or publish legacy fields as current Design Command vocabulary.

Update validation, diffing, proposal evidence, context/capability descriptions,
Jev recipes, retrieval, persistence, import/export, fixtures, and tests. Design
Command remains staged and fail-closed.

The Typography UI presents Heading and Body groups, each with Font, Weight,
and Tracking. A separate compact Mono font control may remain. Remove the old
Font Families and standalone Letter spacing groups.

## Manual history and recovery

History is a Workbench session concern, not canonical theme data and not a new
persistence format or Design Command operation.

- Maintain separate in-memory history tracks keyed by theme identity.
- Theme switching restores that theme's in-session working state/history.
- Reload clears all history.
- A history snapshot stores canonical design content, not an old live revision
  to be reinstated.
- Undo, Redo, and Reset revalidate restored content and always produce a new,
  monotonically increasing revision so proposal stale protection remains sound.
- Invalid drafts and no-op edits create no history.
- A new committed edit after Undo clears Redo.
- Controls are locked while a proposal is staged or Design Command is
  evaluating, as today.

Continuous sliders and equivalent gestures update the validated preview live
but produce one meaningful committed history entry. Prefer a captured gesture
base plus final commit so intermediate motion does not inflate history or the
final revision unnecessarily. Text/numeric/color controls must define a
deterministic commit boundary consistent with their existing draft behavior.

The preview toolbar contains a compact accessible Undo / Redo / Reset recovery
group immediately before Export JSON and Save. Reset uses the accepted
Responsive Dialog/Drawer confirmation pattern.

Reset targets the durable baseline:

- built-in -> immutable canonical built-in fixture;
- custom -> last saved custom snapshot.

Reset is one undoable history transition. A saved custom theme updates the
durable baseline without clearing session history; undo after Save makes it
dirty again. Save As creates/selects a clean custom track and restores the
immutable source built-in track. Dirty state compares meaningful canonical
design values with the current durable baseline, excluding revision and
internal bookkeeping that is not a design difference.

Design Command Preview and Discard create no active history. Apply creates one
atomic undoable checkpoint after normal proposal validation. Proposal ledger,
candidate isolation, Apply/Discard, stale handling, and revision evidence remain
authoritative.

## Responsive mixed-span compositions

Replace the current three manually constructed column stacks with one
source-ordered CSS Grid and a constrained composition-owned footprint:

```ts
type PreviewLayout = "default" | "wide"
```

- `default`: span one column.
- `wide`: span two columns when at least two columns exist.
- Small: one column; all compositions span one.
- Medium: two columns; wide spans two.
- Wide: exactly three equal base columns; wide spans two.
- Use preview-viewport breakpoints near 40rem and 60rem unless measured current
  containment requires the smallest documented adjustment.
- Use `grid-auto-flow: row`, never dense.
- Preserve source/DOM/read/focus order.
- Use natural content-driven heights with start alignment; no aspect ratio,
  equal-height cards, masonry, arbitrary coordinates, or vertical footprint.
- No span may create horizontal overflow.

Footprint metadata belongs to the composition catalog/entry, never to Chart,
Card, form, or another public resource. Initially exercise `wide` on
Productive Week, Team Access, and Workspace Settings unless source inspection
demonstrates a clearly stronger equivalent set; document any substitution.
The eight shared composition implementations and content remain shared.

## Acceptance criteria

- **STHG-01 — Frozen traceability.** The worker packet contains complete
  immutable PUI-3/PUI-63/PUI-64 snapshots, this contract, hashes, and mapping.
- **STHG-02 — Bounded delivery.** Changes stay within admitted schema,
  migration, renderer, mutation/context/proposal, Workbench controls/history,
  composition metadata/grid, tests, docs, and evidence.
- **STHG-03 — Theme v3.** Strict canonical semantic Heading/Body/Mono data,
  weights, and tracking validate without a parallel canonical legacy model.
- **STHG-04 — Migration.** v1/v2.0/v2.1, built-ins, and saved custom themes
  migrate by the exact approved mapping without losing unrelated values.
- **STHG-05 — Renderer contract.** Exact semantic variables and composed
  Heading/Body behavior export and apply; size/line-height remain component-owned.
- **STHG-06 — Typography controls.** Heading and Body each expose Font, Weight,
  Tracking; any catalog font is selectable; Mono remains separate; old groups
  are absent.
- **STHG-07 — Semantic adoption.** Workbench/preview ordinary text inherits
  Body, representative headings use Heading, and code retains Mono without
  indiscriminate overrides.
- **STHG-08 — Mutation and proposal compatibility.** Current closed operation
  count is exactly 12; validation/context/recipes/diffs/proposals reflect v3;
  Preview/Apply/Discard and stale behavior remain intact.
- **STHG-09 — History correctness.** Per-theme session history, Undo/Redo,
  redo truncation, durable dirty baselines, reload semantics, and monotonically
  increasing revisions are deterministic and schema-valid.
- **STHG-10 — Coalescing and reset.** Continuous gestures produce one history
  checkpoint; Reset targets the correct baseline, confirms responsively, and is
  undoable.
- **STHG-11 — Lifecycle integration.** Switching preserves session tracks;
  custom Save re-baselines without clearing; Save As starts clean and preserves
  immutable built-ins; Design Command Apply is one atomic checkpoint.
- **STHG-12 — Recovery UI.** Compact accessible Undo/Redo/Reset controls sit
  immediately before Export/Save and expose correct disabled/focus/keyboard
  behavior at desktop and mobile widths.
- **STHG-13 — Grid contract.** Eight compositions remain in source order with
  only `default | wide`; representative wide entries are explicit and
  resource definitions are unchanged.
- **STHG-14 — Responsive grid.** Small 1, medium 2, wide exactly 3 columns;
  wide spans 1/2/2 respectively; natural heights, no dense packing, no overflow,
  and coherent focus order are verified.
- **STHG-15 — Frozen boundaries.** Registry remains 19, no unapproved
  dependency/public resource/credential/network/external action, and no
  unrelated typography scale or layout infrastructure is added.
- **STHG-16 — Lead browser evidence.** Both supported viewports, light/dark,
  reduced/default motion, manual history/lifecycle, migration, semantic live
  typography, grid breakpoints/spans/ordering/containment, pointer/keyboard,
  Design Command boundary, and axe run on the exact candidate. Existing
  explicitly accepted token debts remain separately attributed; no new
  undispositioned serious/critical finding is allowed.
- **STHG-17 — Protected verification.** Full unit/typecheck/registry/build,
  phase scan, diff checks, and fresh exact-candidate offline/source/schema/
  contract/boundary/evidence-integrity review pass without repair.
- **STHG-18 — Automatic closeout.** With STHG-01–17 passed and no owner visual
  gate, record acceptance before promotion, promote, run post-promotion checks,
  persist receipts, and close automatically.

## Ticket mapping

- PUI-63: STHG-03–08, 15–17
- PUI-3: STHG-08–12, 15–17
- PUI-64: STHG-13–17
- Admission/closure: STHG-01–02, 18

## Routing and authority

- Primary producer: `loop_worker_claude_strong`,
  `claude/claude-opus-5-5`, STRONG, medium, auto, included subscription only.
- Codex MAX fallback is not pre-authorized. If Claude becomes unavailable,
  exhausted, materially blocked, or a stronger recovery is justified, pause
  and request exact one-use owner approval for `loop_worker_codex_max`,
  `codex/gpt-6-astra`, MAX, medium. Preserve this phase/candidate/history.
- Primary-path protected verifier: fresh `loop_worker_codex_standard`,
  `codex/gpt-5.6-terra`, STANDARD, medium, logical read-only/no repair with
  fail-closed pre/post integrity. If an owner-approved Codex MAX producer is
  used, prefer fresh Claude STANDARD to preserve cross-provider verification.
- Browser execution belongs to the Lead. Protected verification has no
  localhost/browser responsibility.
- Lifetime ceiling: 64. Phase ceiling: 3 runs; 2 expected. Concurrency 1.
  Execution time 360 minutes. Paid spend $0.
- Workers have no network, credentials, paid fallback, external actions,
  canonical `.loop` mutation, agent-launch, acceptance, or promotion authority.
- No owner visual-review gate. Phase 10 automatic closeout applies.

## Remediation order

1. Resume the same Claude producer for bounded correction where possible.
2. Lead may perform only mechanical/unambiguous correction.
3. A fresh non-MAX producer may use the reserved third run when genuinely
   necessary while preserving the verifier reservation where possible.
4. Any Codex MAX dispatch requires new exact owner approval.
