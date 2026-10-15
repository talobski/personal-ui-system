# Workbench Sidebar Theme Polish v1 contract

Phase: `workbench-sidebar-theme-polish-v1-001`

Accepted product base: `d3ce5ec5822da47db94b509f8848203520154eb6`

Prepared control base: `25cebd535b6ed133a9dd3a24033b28f142523833`

Tickets: PUI-56, PUI-57, PUI-58, PUI-59, PUI-60, PUI-61, PUI-62.

The frozen Linear ticket snapshots for this phase are retained only in Git
history, at
`8a7550e:.loop/runs/workbench-sidebar-theme-polish-v1-001/linear-ticket-snapshots.md`
(a path from the retired agent tooling). This reconciled contract is
authoritative if they conflict. Later Linear edits do not change the phase.

## Scope

Deliver all seven tickets in one bounded phase. Evolve canonical Theme v2 to
v2.1 for optional dedicated Sidebar colors, migrate old themes without data
loss, expose the mode and colors through existing Workbench controls, and keep
proposal safety intact. In the same coherent Sidebar/control batch, refine the
shared ScrollArea, set the official desktop sidebar width, tighten shared
control geometry and labels, and add bounded pointer affordances.

No new public resource or dependency is admitted. The registry remains 19.
The closed mutation union gains only `setSidebarTokensEnabled`, becoming 12
operations. No `sidebar-input`, `sidebar-card`, raw CSS theme layer,
Workbench-only theme state, shell redesign, credential, network, Jev, or
external-action surface is admitted.

## Canonical Theme v2.1 model

Theme v2.1 adds these normal canonical colors to both light and dark sets:

- `sidebar`
- `sidebar-foreground`
- `sidebar-primary`
- `sidebar-primary-foreground`
- `sidebar-accent`
- `sidebar-accent-foreground`
- `sidebar-border`
- `sidebar-ring`

It also persists canonical Sidebar source state:

- user-facing `useDedicatedTokens` boolean;
- internal `dedicatedValuesInitialized` boolean.

`dedicatedValuesInitialized` is bookkeeping only. It MUST NOT appear as a
control, visual token, meaningful normal theme diff, Design Command
vocabulary, or user-facing proposal noise. It may participate internally in
migration, persistence, validation, and deterministic source selection.

The OFF renderer aliases Sidebar semantics exactly as follows:

- sidebar -> background
- sidebar-foreground -> foreground
- sidebar-primary -> primary
- sidebar-primary-foreground -> primary-foreground
- sidebar-accent -> accent
- sidebar-accent-foreground -> accent-foreground
- sidebar-border -> border
- sidebar-ring -> ring

Inputs inside the Sidebar continue to consume the ordinary `input` token.

ON renders the eight stored dedicated values. Dedicated controls remain
visible and editable in either state. While OFF, their values are preserved
but unapplied. While ON, edits affect the live active Sidebar immediately.
Staged Design Command candidates never recolor the active Workbench chrome
before Apply.

## Migration and initialization

- Canonical output is Theme v2.1. Strict v1 and v2.0 inputs remain accepted
  through declared migrations; v2.1 is validated directly.
- Migrated themes start OFF. Both mode sets receive dedicated colors derived
  from the corresponding base aliases and are marked uninitialized.
- While uninitialized and OFF, generated dedicated defaults may remain
  synchronized with base aliases.
- The first dedicated Sidebar color edit or first activation snapshots the
  current resolved values for both modes and marks the set initialized.
- After initialization, dedicated values remain independent and preserved
  while OFF.
- Default and Quiet Editorial ship as complete canonical fixtures, OFF by
  default. Existing custom themes, active selection, base records, and all
  unrelated values survive migration. The Workbench storage container key and
  format remain unchanged.
- Export emits canonical v2.1; import accepts v1, v2.0, and v2.1. The
  compatibility report promotes the eight Sidebar tokens to canonical 1:1 and
  keeps `sidebar-input` unsupported.

## Mutation, proposal, diff, and context

- Extend `setColor` to the eight Sidebar token names.
- Add only `setSidebarTokensEnabled` to the closed mutation union.
- The mutation request version may remain compatible because the operation is
  additive; existing operations and validation semantics remain unchanged.
- Dedicated color editing and first activation perform the initialization
  transition deterministically.
- Theme diffs and proposal evidence include dedicated colors and the
  user-facing enabled state. Internal initialization metadata is omitted from
  normal user-facing design differences.
- Proposal validation, candidate isolation, Apply/Discard, stale handling,
  revisions, Design Command authority, and fail-closed behavior remain intact.
- Retrieval/context metadata publishes Theme v2.1, the eight color tokens, and
  the one new operation, but never presents initialization bookkeeping as
  Design Command vocabulary.

## Ticket-specific implementation

### PUI-56

Keep the accepted Radix-backed shadcn ScrollArea and change shared public
styling only. Use consistent 0.5rem vertical width/horizontal height, a
transparent track, and a rounded semantic neutral thumb. Target
`muted-foreground` at approximately 25% opacity at rest, 40% on container
hover/focus, and 55% on thumb hover/active drag, adjusting only as required by
supported Radix state selectors and verified generated CSS. Every accepted
consumer inherits it; ownership and input behavior do not change.

### PUI-57

Set the Workbench's `SidebarProvider` `--sidebar-width` to `28rem`. Leave the
mobile width unchanged. Do not duplicate width overrides in descendants.

### PUI-58

Font-family rows gain left labels `Sans`, `Serif`, and `Mono`. Rename visible
`LETTER SPACING` to `SPACING` and visible `Letter spacing` to `Tracking` while
preserving internal names and `setTracking`. Use shared physical geometry:

- font rows: `5rem minmax(0,1fr)`;
- numeric rows: `5rem minmax(0,1fr) max-content`.

The 5rem column is independent of editable theme spacing and must not wrap or
clip admitted labels at supported widths.

### PUI-59

Use `font-medium`/500 for the active theme name and every built-in/custom theme
name in the dropdown. Do not alter other selector styling or behavior.

### PUI-60

Change only the visible Sidebar tab label `Other` to `Effects`; retain internal
value `other`. Keep ordering and official Tabs. Change category trigger
horizontal padding from `px-3` to `px-2`; preserve every other accepted tab
interaction and style.

### PUI-61

Add `cursor-pointer` through bounded Workbench/shared call sites where enabled:
ControlSection triggers, Export JSON, Save, SidebarTrigger, and equivalent
clearly clickable Workbench buttons found by the focused audit. Disabled
controls retain disabled cursor semantics. Do not globally alter public Button
or assign pointer cursors to labels, decorative icons, static text, or sliders.

## Acceptance criteria

- **WSTP-01 — Frozen traceability.** The producer packet contains the complete verbatim PUI-56–62 snapshot, this authoritative contract, hashes, and ticket-to-criterion mapping; later Linear edits do not mutate the phase.
- **WSTP-02 — Bounded delivery.** Changes stay within admitted Theme/schema/migration/rendering, mutation/proposal/diff/context, Sidebar/ScrollArea, Workbench controls, fixtures, tests, and phase evidence. No unrelated redesign or dependency is added.
- **WSTP-03 — Canonical v2.1.** Strict canonical Theme v2.1 contains exactly the eight new Sidebar colors per mode plus the approved enabled/initialization state; canonical color normalization remains unchanged and no sidebar-input/card token exists.
- **WSTP-04 — Backward compatibility.** Valid v1 and v2.0 themes migrate deterministically to v2.1; existing custom values, selection, base metadata, and unrelated semantics survive. Default and Quiet Editorial validate as complete v2.1 fixtures.
- **WSTP-05 — Initialization.** Migrated themes start OFF with alias-derived uninitialized values. Base edits can synchronize only before initialization. First dedicated edit or activation snapshots both modes without a visual jump. Initialized values remain independent and preserved while OFF.
- **WSTP-06 — Source selection.** OFF emits the eight exact approved aliases, including sidebar background from background rather than card. ON emits dedicated values immediately. Inputs continue to use normal input. Active Workbench chrome never consumes an unapplied staged candidate.
- **WSTP-07 — Workbench controls.** Colors exposes one collapsible Sidebar group with the official Switch, exact eight visible controls/labels, and clear active/inactive helper copy. Controls remain visible, enabled, canonical, and editable in both states.
- **WSTP-08 — Mutation/proposal/context.** `setColor` admits the new colors; `setSidebarTokensEnabled` is the only added operation; the count is exactly 12. Diffs/proposals/context expose meaningful user state but not initialization bookkeeping. Apply/Discard/stale/validation authority remains intact.
- **WSTP-09 — Persistence and portability.** Save/reload, custom themes, selection, export/import, compatibility reporting, preview rendering, and retrieval round-trip v2.1 without data loss or duplicate state.
- **WSTP-10 — ScrollArea polish.** Shared vertical/horizontal thickness and semantic neutral thumb states are lighter and consistent. All accepted consumers inherit them without changed ownership, reserved width, layout shift, scroll trap, or input/accessibility regression.
- **WSTP-11 — Sidebar geometry.** Desktop Sidebar resolves to 28rem through the official `--sidebar-width`; SidebarInset consumes the remainder without overflow. Collapse, keyboard shortcut, mobile 18rem sheet, containment, and alignment remain intact.
- **WSTP-12 — Typography geometry.** Font rows show Sans/Serif/Mono in the shared 5rem layout. SPACING/Tracking visible copy is exact. Numeric rows use the shared 5rem/flexible/intrinsic contract, do not scale with theme spacing, and do not wrap or clip.
- **WSTP-13 — Selector/tabs/pointer polish.** Theme names compute to weight 500; the visible tab is Effects with internal `other`; category tabs use px-2; approved enabled Workbench actions show pointer while disabled and noninteractive surfaces remain accurate.
- **WSTP-14 — Frozen product boundaries.** Registry remains exactly 19, dependencies and lockfile remain unchanged, and there is no new public resource, Workbench-only theme state, raw-CSS theme layer, credential, network, Jev, deployment, or external-action surface.
- **WSTP-15 — Technical browser evidence.** Lead executes both 390x844 and 1440x900, light/dark, reduced/default motion, migration, OFF/ON/no-jump/edit/save/reload/proposal, ScrollArea input, Sidebar geometry, responsive containment, pointer/keyboard/focus, and axe checks. Previously accepted exact theme-token debts remain separately attributed; no new serious/critical finding is admitted.
- **WSTP-16 — Regression and protected verification.** Full unit, typecheck, registry, Workbench/Storybook builds, phase scan, diff checks, and Lead browser matrix pass. A fresh exact-candidate Codex STANDARD verifier passes offline/source/schema/contract/boundary/evidence-integrity review with no repair or browser responsibility.
- **WSTP-17 — Automatic closeout.** With WSTP-01–16 passing and no owner visual gate, acceptance is recorded before main promotion, followed by post-promotion checks, durable receipts, and phase closure.

## Ticket mapping

- PUI-56: WSTP-10, 14–16
- PUI-57: WSTP-11, 15–16
- PUI-58: WSTP-12, 15–16
- PUI-59: WSTP-13, 15–16
- PUI-60: WSTP-13, 15–16
- PUI-61: WSTP-13, 15–16
- PUI-62: WSTP-03–09, 14–16
- Admission/closure: WSTP-01–02, 17
