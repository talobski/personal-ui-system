# Workbench Composed Preview v1 — proposed phase contract

Phase ID: `workbench-composed-preview-v1-001`

Status: **PROPOSED — NOT ADMITTED**

No agent-run, attempt, concurrency, or spend allocation is attached to this
proposal. Admission requires separate owner approval.

## Accepted dependency surface

The phase begins from Composition Foundation Pack v1 at `063a03e3`:

- public components: Button, Card, Input, NativeSelect, Tabs, Switch, Textarea;
- public patterns: Field, Responsive Dialog/Drawer, SingleToggleGroup;
- verified compositions: Account Profile, Notification Preferences, Workspace
  Settings, Support Request;
- accepted theme renderer, proposal lifecycle, Design Command, save/fork/export,
  light/dark, responsive-preview, validation, and accessibility behavior.

The four compositions are currently executable Storybook fixtures, not public
registry resources. This phase may extract their render functions into shared
`packages/ui` composition modules so Storybook and Workbench consume the same
markup. That refactor does not promote them into registry items or add product
contracts.

## Objective

Make realistic compositions the Workbench's primary theme-evaluation surface
while retaining isolated components as a precise secondary inspection surface.
The Workbench must dogfood the accepted design system: semantic tokens and the
accepted shadcn-based resources supply its interactive controls and visual
surfaces wherever an equivalent exists.

## Information architecture

1. A compact Workbench header preserves theme identity and save/fork/export
   actions.
2. The main preview area opens on **Compositions** and offers **Components** as
   the secondary tab.
3. A NativeSelect chooses among the four accepted compositions; component mode
   retains targeted isolated resource/state inspection.
4. Existing light/dark and viewport choices use accepted bounded-choice
   controls (SingleToggleGroup where appropriate).
5. Existing theme editing, Design Command, proposal evidence, and Apply/Discard
   controls remain in a clear inspector region. Desktop may use a side rail;
   narrow layouts stack without hiding the primary preview or overflowing.
6. Preview content remains under the existing theme renderer so active edits
   and staged/applied proposals affect composed and isolated surfaces through
   one deterministic path.

No reference site is copied literally. The useful adopted principles are:
composition-first judgment, immediate visual feedback, clear separation of
preview and controls, compact mode switching, and preservation of precise
component inspection.

## Acceptance criteria

- **WCP-01 — Composition-first hierarchy:** the Workbench defaults to a clearly
  labelled Compositions surface. Components remains directly reachable as a
  secondary surface. The selected surface and selected example are
  deterministic and persist across unrelated editor interactions during the
  session.
- **WCP-02 — Four shared compositions:** Account Profile, Notification
  Preferences, Workspace Settings, and Support Request render in the Workbench
  from the same shared composition modules used by Storybook. There is no
  duplicated composition markup and no fifth fixture.
- **WCP-03 — Precise component inspection preserved:** the Components surface
  retains the accepted resources and representative states needed for focused
  accessibility, interaction, and regression inspection. Existing isolated
  preview behavior is not removed or weakened.
- **WCP-04 — Design-system-native Workbench:** changed Workbench UI uses accepted
  Button, Card, Field, Input, NativeSelect, Tabs, Switch, Textarea,
  SingleToggleGroup, and Responsive Dialog/Drawer equivalents where applicable.
  A thin semantic wrapper composed solely from accepted resources is allowed;
  no new bespoke interactive primitive is added. If an unfillable primitive
  gap is discovered, implementation pauses for owner review rather than adding
  an unapproved control.
- **WCP-05 — Semantic visual styling:** changed Workbench presentation uses the
  accepted semantic color, typography, spacing/density, radius, border, shadow,
  and motion tokens. Literal visual colors, one-off shadow/radius values, and
  raw CSS styling escapes are prohibited where an accepted token exists. Theme
  value text shown or edited as product data is not visual styling.
- **WCP-06 — Theme judgment across compositions:** deterministic evidence shows
  that color, typography, radius, shadow, density, and motion changes each alter
  relevant computed styles in at least one composed preview without bypassing
  the existing renderer. Light/dark changes update both composed and isolated
  surfaces.
- **WCP-07 — Lifecycle behavior preserved:** theme selection/editing,
  validation, save, fork, export, proposal staging/evidence, Apply/Discard, and
  Design Command keep their accepted semantics. Pending evaluation continues
  to lock unsafe concurrent actions; failures leave the active theme unchanged.
- **WCP-08 — Responsive Workbench:** at the accepted mobile and desktop
  viewports, the Workbench has no horizontal page overflow, the preview remains
  usable, controls remain labelled and reachable, and every composition stays
  within its preview boundary. Viewport simulation remains deterministic.
- **WCP-09 — Accessibility:** keyboard-only users can switch preview surfaces,
  select compositions/components, operate editor and lifecycle controls, and
  return focus predictably. Focus indicators remain visible; labels,
  descriptions, tabs, dialogs/drawers, and live/status messaging are valid.
  Decoded axe evidence contains zero serious or critical violations in light
  and dark modes at both accepted viewports.
- **WCP-10 — Frozen product contracts:** the ten-resource public registry,
  component-contract schema, `personal-ui-context/1`, theme schema/tokens,
  `ThemeOperation`, `MutationProposalV1`, proposal lifecycle, and
  `personal-ui-design-command/1` remain version- and behavior-compatible. No
  Jev call, credential, provider, or general-purpose LLM change is required.
- **WCP-11 — Fresh-use rubric:** before reading implementation-specific files,
  a protected fresh verifier opens the Workbench and (a) identifies
  Compositions as the primary surface, (b) inspects all four compositions, (c)
  switches to a representative isolated component/state, (d) evaluates a
  theme change across at least four visual dimensions, (e) stages then discards
  one valid proposal without mutating the active theme, and (f) confirms an
  invalid or unavailable Design Command path fails closed. Predeclared rubric:
  6/6.
- **WCP-12 — Full acceptance:** focused UI/state/renderer/lifecycle tests and the
  full repository unit suite, all typechecks, unchanged exact ten-item registry
  build, Workbench build, Storybook build, complete Workbench and Storybook
  browser matrices, and the real Vite-dev Design Command credential-boundary
  regression pass on one exact clean candidate. A protected fresh verifier
  audits WCP-01 through WCP-12 before `main` moves.

## Explicit non-goals

Any new public component or pattern; registry/catalog/context expansion; a full
shadcn catalog import; new theme tokens or mutation/proposal operations; richer
Design Command semantics; live product-Jev validation; general-purpose LLM,
planner, provider abstraction, MCP, embeddings, semantic search, project import
or extraction; persistence redesign; collaboration; deployment; publishing;
copying tweakcn or shadcn/create layout or styling literally; removing isolated
component previews.

## Proposed execution shape (unallocated)

The work is coupled across Workbench layout, shared composition extraction,
renderer state, and browser acceptance. Use one producer followed by one
protected fresh verifier; keep one third run only for bounded recovery if the
owner later admits corresponding headroom. STANDARD remains the default model
class. STRONG requires a recorded concrete expected benefit, and MAX remains
inadmissible without explicit per-dispatch owner approval. Do not use
`PARALLEL_INDEPENDENT` for this phase.
