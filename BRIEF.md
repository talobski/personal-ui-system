# Personal UI System — Project Brief

Status: ACTIVE — the accepted product is
`8f847c7b1f784ab6f0deb49c6d6b10a71e4a4499` on `main`. The public landing page
is at `/`, the editor is at `/workbench`, and stable built-in theme links use
`/workbench/themes/:slug` (PUI-143, PUI-144). The frozen ticket snapshots and
contract for that change are at
`docs/evidence/landing-workbench-routes-v1-001/linear/` and
`docs/LANDING_WORKBENCH_ROUTES_CONTRACT.md`.
PUI-137 closed successfully as research-only; its Stage 1 proposal is retained
at `d5cb9d9` and Stage 2 was not undertaken. PUI-142 remains a Backlog
follow-up for a fair deterministic, LLM, and Jev comparison.
Code now opens a JSON/CSS preview and Copy dialog with no Download action.
Custom-theme Delete sits before dark mode with the sibling icon treatment;
icon-only header controls have tooltips, and routine theme-action success feedback
uses the shared semantic popover toast. App shell frames and Inset surfaces were
refined, and native selection stays square in the two embedded Inputs.
The decorative Tactile TabsList edge draws inward and uses the semantic border
token at 80% opacity, and Design system Colors group headings use `text-sm`.
Amber Dusk is a built-in Theme v3 preset with three owner-authorized contrast
adjustments documented against the supplied palette. Secondary Buttons retain
the Strength-controlled tactile effect; surface Tabs use only a fixed TabsList
ring. The Workbench helper, Design system labels, App shell previews, Storage
action, and Chat send circle were refined. Theme v3 remains 3.0, the closed
mutation union has 13 operations, and the public registry has 23 resources.
The `workbench-composed-preview-v1-001` candidate remains preserved but
owner-abandoned, unaccepted, and excluded from future implementation bases.

This brief is the product specification and product history. Per-feature
contracts (`docs/*_CONTRACT.md`) and frozen ticket snapshots
(`docs/evidence/*/linear/`) remain the detailed references for each change.

Last updated: 2026-10-15

## Goal

Build a local-first, self-hostable, agent-first personal UI system on top of shadcn/ui. It will give coding agents such as Codex and Claude Code, Jev/TypeSafe, and the owner a compact source of truth for producing interfaces that follow the owner's preferences without forcing every project into one visual identity.

V1 proves a narrow vertical slice: structured theme data and design-system rules can drive both reusable shadcn-based components and a local visual editor, while remaining directly consumable without running that editor.

The accepted Theme v2 extension adds canonical OKLCH color storage with
HEX/RGB/HSL/OKLCH boundary normalization; sans, serif, and mono stacks;
tracking; spacing; a complete shadow scale; deterministic v1 migration; and a
new built-in `Default` theme while preserving `Quiet Editorial`. The Workbench
opens fresh state on `Default`, preserves valid saved selections, and provides
validated live manual Typography and Other controls. Generated Design Command
changes remain staged behind Preview, Apply, and Discard. Slider and
Collapsible are the only public resources added by this phase, bringing the
registry to 13 resources.

The accepted Workbench polish phase makes the preview fill its actual right
panel, applies the active Theme v2 to Workbench chrome while keeping staged
candidate styling confined to preview, and replaces the single color editor
with eight collapsible token groups containing all 24 canonical color tokens.
It removes the visible fixed-device, Fork, and baseline-diff workflows; adds
immutable-built-in Save As semantics; compacts the theme selector; uses a
subtle accessible resize divider; and simplifies the toolbar around Dark mode,
Proposal, Export JSON, and Save. No public resource, schema, token, mutation,
Design Command, Jev, credential, or network boundary changed.

The accepted controls and preview refinement phase makes the preview truly
edge-to-edge, replaces the active-theme field with a full-region rich Select,
and adds searchable locally hosted typography controls for an exact 24-font
catalog. Select, Combobox, and Chart are accepted public resources, bringing
the registry to 16. Productive Week uses the accepted Chart implementation;
the eight gallery roots are shadowless while dedicated elevation evidence is
retained. Redundant tab copy and manual proposal-authoring UI are removed while
the Design Command staging lifecycle remains intact. Color sections now use
the approved ten-group order with every canonical token represented exactly
once. Theme v2, mutation operations, persistence, Jev, credentials, and
runtime-network boundaries remain unchanged.

The accepted Workbench sidebar system polish phase replaces the custom shell
with the official shadcn Sidebar pattern: a 22rem desktop application sidebar,
an off-canvas mobile editor, and a preview that fills the remaining inset. The
compact theme selector shows each theme's primary, accent, secondary, and
border tokens; custom themes can be deleted through a separate confirmed
action while built-ins remain immutable and deletion falls back to Default.
Sidebar and Avatar are accepted public resources, bringing the registry to 18.
Initials-style avatars use one meaningful character with muted semantic tokens,
standard vertical Fields use `gap-2`, and scoped low-contrast scrollbars retain
native input behavior. Density remains canonical and programmatically
supported but is no longer manually editable in the Workbench. Theme v2,
mutation operations, persistence format, proposal safety, credentials, and
network boundaries remain unchanged.

The accepted Workbench theme controls polish phase is a bounded refinement of
the sidebar editor. It delivers PUI-31 through PUI-37 in one batch:
compact non-overlapping theme swatches, owner-selected Default radius and
spacing baselines, a theme-neutral shadcn toolbar, single-row numeric controls,
shared collapsible-group polish, aligned 16px sidebar/preview insets, and
concise font-family controls that retain exact canonical custom stacks. It adds
no public resource, schema, operation, persistence format, network behavior,
credential path, or owner visual gate. The registry must remain exactly 18
resources and the mutation union exactly 11 operations.

The accepted Workbench sidebar theme polish phase delivers PUI-56 through
PUI-62 as one bounded change. Canonical Theme v2.1 adds eight dedicated
light/dark Sidebar colors, the user-facing `useDedicatedTokens` switch, and
internal-only deterministic initialization bookkeeping. Migrated v1/v2.0
themes begin with alias-derived values and dedicated rendering off; activation
or the first dedicated edit snapshots both modes without a visual jump. The
mutation union is exactly 12 operations with `setSidebarTokensEnabled` as the
sole addition, while the registry remains 19 resources. The same phase refines
shared ScrollArea styling, configures the official desktop Sidebar width to
28rem, standardizes 5rem editor-label geometry, and applies the approved
selector, Effects-tab, tab-padding, and pointer-affordance polish without new
dependencies, credentials, network behavior, or Jev authority.

The accepted semantic typography, history, and composition-grid phase delivers
PUI-3, PUI-63, and PUI-64 as one bounded change. Canonical Theme v3 introduces
composed Heading and Body roles with font, weight, and tracking while retaining
Mono as a separate primitive; deterministic migration maps legacy serif to
Heading, sans to Body, and preserves legacy mono and tracking. The Workbench
adds per-theme session-local Undo, Redo, and confirmed Reset with immutable
built-in or last-saved custom baselines, coalesced manual edits, and one atomic
history checkpoint for Design Command Apply while Preview and Discard remain
staged. The preview gallery uses source-ordered, non-dense 1/2/3-column CSS Grid
with composition-owned default and wide footprints and natural card heights.
Both built-in themes are committed canonical v3 fixtures. The registry remains
19 resources, the mutation union remains 12 operations, and no dependency,
credential, network, or public-component boundary expands.

The accepted nested gallery and interaction polish phase delivers PUI-65
through PUI-70. It replaces the globally row-coupled preview grid with
gallery-owned nested regions and independent natural-height stacks, removes the
obsolete per-composition `PreviewLayout` span model, and restores Cards/States
as left-aligned shared-style tabs. Workbench collapsible triggers inherit Body
typography; both built-in themes use sans-serif Heading defaults while arbitrary
legacy-theme migration remains unchanged. The preview toolbar groups Undo,
Redo, Reset, Export, and Save with the approved separator and labels. Color
pickers retain immediate local feedback while debouncing canonical theme writes
for 120 ms, flushing the latest value at gesture completion, and producing one
history checkpoint per continuous gesture. The registry remains 19 resources,
the mutation union remains 12 operations, and no dependency, schema,
persistence, credential, or product runtime-network boundary expands.

The accepted container gallery showcase phase delivers PUI-78 through PUI-80.
The gallery now responds to its own container width, with a smaller left and
larger right region at wide sizes and independent natural-height stacks and
local groups. Thirteen varied compositions showcase semantic Theme v3 colors,
typography, spacing, radius, borders, shadows, and chart tokens across light
and dark modes. The preview toolbar places an accessible sun/moon Switch beside
the existing recovery and Export/Save actions, using matching short separators.
The shared Switch gained only an optional backward-compatible thumb-content
slot; the registry remains 19 resources and the mutation union 12 operations.
No Theme v3 schema, persistence, Design Command, dependency, credential, or
product runtime-network boundary changed.

The accepted Cards gallery curation phase delivers PUI-81 through PUI-85.
The eight-card showcase places Storage and Quick find first in the smaller left
region, keeps A productive week and Support request there, and places Studio
revenue, the This week / Recent activity pair, and Launch checklist in the
larger right region. Five weaker compositions leave the Cards gallery while
their independently used standalone modules and stories remain. Gallery-only
interaction modes keep ordinary card geometry stable without weakening the
standalone demos. Studio revenue now leads with range tabs, one divided metrics
row and a Revenue-only chart. Inter-card gaps stay at `gap-4`; only the local
side-by-side pair stretches to equal height, returning to natural heights when
stacked. Container queries, Theme v3, the 19-resource registry, 12 mutation
operations, history, persistence and Design Command boundaries are unchanged.

The accepted showcase components and Geometry phase delivers PUI-86 through
PUI-94. The container-responsive Cards gallery now has eleven compositions:
Storage without its promotional CTA, Studio revenue without x-axis labels, a
weekly steps summary, and new compact chat, payment-table, signup, range
Calendar, music, and illustrative weather compositions alongside Quick find
and Recent activity. The reusable shadcn-aligned Message, Bubble, Calendar,
and Table resources raise the registry from 19 to 23. Calendar uses the pinned
`react-day-picker@10.0.1` dependency; no other direct dependency was added.
The Sidebar token switch receives bounded label/spacing polish, and the editor
now separates Radius and Spacing into Geometry while Shadow and Motion remain
in Effects. Theme v3, the 12-operation mutation union, history/recovery,
persistence, and staged Design Command semantics remain intact. The phase's
mobile tab-focus correction keeps keyboard slider input operable after a
category switch.

The accepted gallery and preview expansion phase delivers PUI-95 through
PUI-102. The eleven-card gallery refines Chat, the compact payment table,
Music, and the Calendar/Weather pair while retaining its container-responsive
independent stacks. The Sidebar token switch has no status helper in either
state. The preview now has four ordered views—Cards, Design system, App shells,
and States. Design system is a read-only live reference for semantic colors and
typography; App shells presents three contained patterns built from the
accepted shadcn Sidebar. Theme v3, the 23-resource registry, 12 mutation
operations, history, persistence, and staged Design Command boundaries remain
unchanged. Existing narrow-column doubled-spacing overflow and previously
accepted contrast-token debts remain explicitly recorded.

## V1 product contract

V1 contains:

1. A small shadcn-compatible component registry with three representative components: Button, Input, and Dialog/Drawer responsive pattern.
2. A versioned, schema-validated theme format covering light/dark semantic colors, typography, radius, spacing/density, shadows, and reduced-motion-aware motion settings.
3. A versioned component-contract format with targeted lookup and the fields: purpose, use, avoid, variants, responsive behavior, accessibility, composition, examples, mistakes, mobile replacement, and constraints.
4. Deterministic validation for hard rules, kept separate from taste or theme choices.
5. A local workbench that previews the pilot components and states; edits structured theme values; switches light/dark and representative viewports; forks and saves named themes locally; and shows validation failures before state is accepted.
6. A structured mutation boundary that can accept a validated theme patch. This is the seam for later agent chat; V1 does not connect a model provider.
7. Storybook stories as executable component examples and verification fixtures. Storybook's manifest/MCP features may be evaluated, but preview APIs must not become the only canonical contract format in V1.

The design-system packages MUST be importable and testable without starting the workbench.

## Deliberately deferred

- A natural-language design-command input or model-provider configuration.
- A custom design-system MCP server.
- Automatic extraction from arbitrary prior projects.
- Automatic promotion of observed corrections into reusable rules.
- A broad component catalog.
- Multi-user, cloud sync, authentication, publishing, hosted deployment, billing, or marketplace work.
- Pixel-perfect theme comparison, visual branching history, or production-grade migration tooling.
- Jev deciding or editing hard rules. V1 may define typed decision packets and fixtures, but does not invent missing Jev infrastructure.

## Why this is the smallest useful V1

Theme editors and component explorers already exist. shadcn has first-party visual presets, registry schemas/APIs, and registry MCP support; mature local theme editors offer extensive visual customization; Storybook provides component-state exploration, tests, agent-readable manifests, and an MCP server. Rebuilding those surfaces first would spend effort on established capabilities.

The project's differentiated value is the owner's durable design knowledge: compact contracts, personal defaults, deterministic constraints, and a safe structured state that humans and agents can share. V1 therefore proves that knowledge loop with only enough UI to author and inspect it.

## Architecture direction

Proposed monorepo shape (subject to an implementation spike, not a permanent package commitment):

```text
apps/
  workbench/             local authoring and preview UI
packages/
  schema/                versioned schemas and validators
  themes/                named structured themes and CSS generation
  contracts/             compact component/pattern contracts and lookup
  constraints/           deterministic admissibility rules
  components/            shadcn-based pilot components and registry source
  mutations/             validated structured patch operations
stories/ or colocated stories
```

Preferred baseline: TypeScript, React, Vite, Tailwind CSS v4, shadcn/ui, pnpm workspaces, Vitest, Storybook, Playwright, and axe. The implementation spike must verify current compatibility before this becomes final.

Canonical sources of truth are versioned data/schema files and component source, not workbench storage, generated CSS, Storybook manifests, or model prose.

## Design boundaries

### Theme owns

- Semantic light/dark colors.
- Type families and scale choices.
- Radius scale.
- Spacing/density scale.
- Shadows.
- Motion tokens, including reduced-motion behavior.

### Personal system owns

- Component purpose and selection guidance.
- Accessibility and responsive constraints.
- Composition and interaction rules.
- Button hierarchy, form behavior, information density principles, and restraint rules.
- Admissible options presented to Jev.

### Project layer owns

- Brand identity and art direction.
- Project-specific theme overrides within declared extension points.
- Special interactions and components that do not violate hard constraints.

## Deterministic vs probabilistic decisions

Deterministic code owns schema validity, accessibility floors that can be measured, forbidden combinations, supported capabilities, hard responsive replacements, mutation admissibility, budgets, authority, and evidence completeness.

When more than one admissible design choice remains, a future Jev integration may use focused TypeSafe primitives:

- `Choice`: layout, interaction, navigation, mobile pattern, component variant, or form structure from a gate-filtered set.
- `Score`: one declared dimension such as density, visual softness, editorial character, or value of another exploration.
- `Noul`: a single yes/no probability such as whether owner preference would materially affect the choice or another exploration is worthwhile.

Jev chooses within declared taste and admissible options. It cannot create, relax, or promote system rules.

## Future natural-language design-command pipeline

The deferred agent-facing interface is not intended to be a general conversational assistant. It is a focused natural-language command input for requests such as “make it feel more editorial,” “reduce the SaaS feel,” “make it denser,” or “make it softer.”

The intended pipeline is:

```text
natural-language design intent
→ LLM proposes one or more typed structured mutations
→ deterministic schema/capability/constraint filter rejects invalid candidates
→ if multiple admissible candidates remain and the choice is genuinely probabilistic,
  Jev ranks/selects through focused gate-bounded Choice/Score/Noul packets
→ selected structured mutation is applied
→ provenance, result, and any owner correction are recorded
```

The LLM never receives authority to rewrite arbitrary CSS, files, constraints, or design rules through this interface. It interprets intent into the same versioned mutation operations V1 uses. Deterministic validation runs before application, and Jev only chooses among candidates the gate has already admitted. A single admissible candidate needs no probabilistic selection. Repeated corrections remain observations or rule candidates until the owner explicitly promotes them.

This pipeline is a later phase, not an architectural exclusion. V1 must preserve the necessary seams: typed mutation operations, candidate/result provenance, deterministic validation, compact retrieval of relevant theme/contracts, and the ability to preview a mutation without committing it.

## Reusable-learning policy

Observations and repeated corrections may be recorded as rule candidates with provenance, examples, and occurrence count. Promotion to an active reusable rule requires explicit owner approval and a reviewed change. No agent may silently change the personal design language.

## Acceptance criteria

All criteria are mandatory unless explicitly re-scoped by the owner. Each was verified on the date shown.

### AC-01 — Independent core

- **assertion:** Theme, contract, constraint, and mutation packages can be imported, validated, and tested without starting or importing the workbench app.
- **method:** code
- **capability:** Node/TypeScript test runner and dependency-boundary inspection.
- **threshold:** Core test suite passes; an automated dependency check finds no import from `apps/workbench` into a core package.
- **result:** verified 2026-09-21

### AC-02 — shadcn foundation

- **assertion:** The three pilot components extend/adapt shadcn rather than reimplementing primitives, and the local registry is valid under the installed shadcn public schema/API.
- **method:** code
- **capability:** shadcn registry loader/schema validator plus source inspection script.
- **threshold:** Registry validation passes for all pilot items; each declares its shadcn/primitive dependency and contains no bespoke implementation of focus trapping, roving focus, or dialog dismissal.
- **result:** verified 2026-09-21

### AC-03 — Structured themes

- **assertion:** A named theme contains versioned light/dark values for every V1 token category and generates deterministic Tailwind/shadcn-compatible CSS.
- **method:** code
- **capability:** Schema tests, fixtures, and snapshot/hash comparison.
- **threshold:** Valid fixture round-trips without semantic loss; invalid fixtures are rejected; identical input produces byte-identical CSS; both color modes and all six categories are present.
- **result:** verified 2026-09-21

### AC-04 — Compact agent contracts

- **assertion:** Each pilot component/pattern has a validated compact contract and can be retrieved alone without loading the full catalog.
- **method:** code
- **capability:** Contract validator and lookup test.
- **threshold:** All required fields validate for three pilots; single-item lookup returns only that item's contract and is at most 8 KiB serialized for each pilot.
- **result:** verified 2026-09-21

### AC-05 — Deterministic constraints and safe mutations

- **assertion:** Hard rules reject inadmissible component/theme state before it becomes active; structured patches cannot address arbitrary CSS or files.
- **method:** code
- **capability:** Unit/property tests against declared mutation operations and constraint fixtures.
- **threshold:** Every predeclared invalid fixture is rejected with a stable rule ID and path; valid fixtures apply; unknown operation/path is rejected; no operation accepts raw CSS or filesystem paths.
- **result:** verified 2026-09-21

### AC-06 — Local visual workbench

- **assertion:** A human can inspect pilot states, edit supported tokens, switch color mode and viewport, fork a named theme, save it locally, reload it, and compare current versus baseline values.
- **method:** browser
- **capability:** Real Chromium via Playwright with screenshot and interaction evidence.
- **threshold:** One automated path completes every listed action at 390×844 and 1440×900; saved state survives reload; validation errors prevent invalid activation; no external network is required after install.
- **result:** verified 2026-09-20

### AC-07 — Accessibility and responsive behavior

- **assertion:** Pilot components remain keyboard-operable and free of automated critical/serious accessibility violations in both modes and representative viewports; the responsive dialog pattern uses its declared mobile replacement.
- **method:** browser
- **capability:** Playwright, axe, keyboard interaction, viewport inspection.
- **threshold:** Zero critical/serious axe violations across the declared matrix; documented keyboard flows pass; at ≤640 px the dialog fixture renders the declared drawer behavior and at ≥1024 px the dialog behavior.
- **result:** verified 2026-09-21

### AC-08 — Reusable-rule promotion remains human-controlled

- **assertion:** A recorded correction can become a candidate, but no candidate becomes active without an explicit owner-approved status transition.
- **method:** code
- **capability:** State-machine tests and fixture audit.
- **threshold:** Direct candidate-to-active mutation without approval receipt is rejected; approved fixture preserves provenance, owner response, and timestamp.
- **result:** verified 2026-09-21

### AC-09 — Documentation and agent handoff

- **assertion:** A fresh coding agent can discover the source-of-truth files, retrieve one contract/theme, apply a valid structured change, and run the relevant verification command from repository instructions.
- **method:** rubric
- **capability:** Fresh-context coding agent with filesystem and command execution.
- **threshold:** 5/5 rubric items pass with cited files and command output: discovery, targeted retrieval, valid mutation, invalid-mutation rejection, verification execution.
- **result:** verified 2026-09-21

## Verification matrix and freshness

Browser criteria require an actual renderer; jsdom is insufficient. Code evidence records commands, environment, exit result, artifact hash, raw report, and observation time. Rubric evidence includes the predeclared items and inspected artifacts. Evidence predating a material change to the evaluated artifact is stale.

V1 verification environments:

- Desktop: Chromium, 1440×900.
- Mobile: Chromium, 390×844.
- Color modes: light and dark where applicable.
- Accessibility: axe plus explicit keyboard paths; automated checks do not claim full accessibility.

## Verification capabilities

- Local package manager and Node runtime compatible with selected dependencies.
- Deterministic schema/test runner for AC-01–05/08.
- Browser renderer and accessibility tooling for AC-06/07.
- A fresh-context coding agent for AC-09.

## Authority boundaries

The owner retains authority over public publishing, production deployment, destructive production changes, financial liability, and promotion of design-rule candidates. Agents may prepare but not execute those actions.

Within the local repository, agents may create and edit project files, run local tests/builds, create reversible worktrees, and operate the local development server. New dependencies and any paid capacity require owner approval. Secrets, credentials, and raw sensitive data must not enter commits.

## Current assumptions and owner choices

Safe defaults applied for scoping:

- V1 defers the natural-language design-command input and custom MCP implementation while preserving typed mutation and decision seams for it.
- V1 uses three pilot components/patterns rather than broad catalog coverage.
- Data is local filesystem data committed with the system; ephemeral workbench UI state may use browser storage, but saved themes must be ordinary portable files or exports.
- Storybook is supporting infrastructure, not the canonical contract store.
- No public release optimization or deployment work occurs in V1.

Owner confirmation received on 2026-09-20 for this narrow V1. Deferred capabilities remain potential later phases, not architectural exclusions.

## Product history

Accepted phases in chronological order. Each entry records the product outcome
and the verification evidence observed at acceptance. Phase identifiers (for
example `theme-mutation-coverage-001`) and acceptance-criterion IDs (PH2-01,
JDC-01, …) are historical labels; the agent tooling that originally ran these
phases has been retired and is not part of this repository.

### Post-V1: shadcn workbench alignment

This bounded cleanup followed V1 completion and did not change V1 scope or results.

Included work:

- Build workbench panel surfaces on shadcn `Card`.
- Build workbench form structure and validation on shadcn `Field`, `FieldLabel`,
  and `FieldError`.
- Replace the two raw selects with the simpler appropriate shadcn select
  foundation; prefer `NativeSelect` unless implementation evidence requires the
  composed `Select`.
- Replace the light/dark and mobile/desktop button pairs with shadcn
  `ToggleGroup type="single"`.
- Keep `ResponsiveDialog`, iframe preview plumbing, native semantic elements,
  JSON download behavior, and the native preview scroller unchanged.
- Keep the public component-contract catalog at the existing three V1 pilots
  unless a concrete implementation blocker is documented.

Acceptance requires fresh passing unit tests, typecheck, registry build,
workbench build, Storybook build, Playwright browser matrix, light/dark coverage,
and axe/accessibility checks.

### Phase 2: theme mutation coverage

Owner-approved on 2026-09-21. This phase does not change V1 scope or results,
and does not reopen the completed post-V1 shadcn-alignment phase.

The theme schema declares six token categories and renders all of them, but the
mutation boundary admits exactly one operation, `setColor`. This phase closes
that gap.

Included work:

- one typed, narrowly scoped operation per remaining category — `radius`,
  `spacing/density`, `typography` family, `shadow`, and `motion` — each with
  strict validation, a stable rule ID, and a canonical path;
- a mutation union that stays closed: no raw CSS, filesystem path, arbitrary
  pointer, bulk operation, or generic set-any-path operation;
- deterministic rendering preserved across all six categories;
- workbench editing for the newly mutable categories through the same structured
  mutation boundary and the existing shadcn form shell;
- round-trip integrity: revalidation, revision increment, and diff paths.

Coverage means at least one typed operation per category, not every field in
every category. The mutation API must not grow beyond this contract.

Excluded: natural-language input, model-provider configuration, MCP, theme
extraction, broad component catalog, any `registry.json` or three-pilot catalog
change, new pilot components, rule promotion, publishing, deployment, pixel
comparison, branching history, and the protected `ResponsiveDialog`, iframe,
JSON download, and preview-scroller surfaces.

Acceptance is PH2-01 through PH2-06: category coverage, closed
boundary, deterministic round-trip, workbench editing across both viewports and
both colour modes, unchanged accessibility, and no regression.

These changes touch code verified under AC-03 and AC-05, so that evidence
becomes stale for the current artifact. The owner accepted this. The new phase
evidence re-establishes the affected invariants; the historical V1 record stands
unchanged.

### Phase 2 result — 2026-09-21

Completed at main commit `2d913c0` (artifact `e8481f5`, core work `f6f3ed6`).

All six theme categories now have a typed mutation operation, and the workbench
can edit them. Each new operation edits one fixed target and carries no token,
mode, or path field, matching the owner's scope clarification:

| Operation | Fixed target | Value check |
|---|---|---|
| `setRadius` | `radius.md` | non-negative dimension |
| `setDensity` | `space.density` | number from 0.5 to 2 |
| `setSansFamily` | first family of `typography.sans`, fallbacks kept | one font name |
| `setShadowBlur` | blur of the first layer of `shadow.md` | non-negative dimension |
| `setMotionDuration` | `motion.durationBase` | duration |

One new rule ID, `mutation.missing-target`, covers a schema-valid `shadow.md`
with no layer to edit. The change to `schema.ts` is a pure extract-and-reuse
refactor: `densitySchema` and `fontNameSchema` were exported and substituted for
identical inline definitions, so the set of accepted themes is unchanged.

The workbench gained an "Edit theme settings" panel built on the same shadcn
`Field` / `FieldLabel` / `FieldError` / `NativeSelect` shell, plus
`apps/workbench/src/settings.ts` and an `editTheme` function in `lifecycle.ts`.

#### Acceptance evidence

Every command was run against `e8481f5`.

| Command | Result |
|---|---|
| `corepack pnpm test` | 13 files, 245 tests passed (191 before, +54) |
| `corepack pnpm typecheck` | passed |
| `corepack pnpm registry:build` | passed |
| `corepack pnpm build:workbench` | passed |
| `corepack pnpm build:storybook` | passed |
| `WORKBENCH_PORT=5199 corepack pnpm test:browser` | Storybook 4/4, workbench 8/8 |

All 40 axe attachment bodies were decoded directly: every one is an empty
array, across 20 distinct checkpoints including the three new settings states.

An independent probe of the closed boundary also ran. Sixteen escape-hatch attacks — a raw
`setCss` operation, extra `css` / `path` / `file` / `$ref` fields, a JSON pointer
patch, a bulk `setMany`, inherited property names including `__proto__`,
negative lengths, out-of-range density, and injection-shaped strings — were all
rejected with stable rule IDs and canonical paths, and the theme was left
untouched on rejection.

`registry.json` is byte-identical to `main` (sha256 `9361b823…`) and the
three-pilot contract data is unchanged. After the merge, `main` at `2d913c0`
re-ran 245 tests and typecheck clean.

#### Known limitations

- **Live preview is partial.** `previewVariablesCss` sends only the `:root` and
  `.dark` blocks, and Tailwind `@theme inline` values compile into the preview at
  build time. Radius, density, and motion reach the preview through `--radius`,
  `--density`, and `--motion-duration-base`; font and shadow edits do not reach
  the preview at all. Fixing that means changing the preview and iframe
  plumbing, which this phase excluded, so it was left alone. Font and shadow are
  instead proven through theme state, rendered CSS, diff, persistence, and
  export. This is the most likely candidate for a future phase.
- **Diff granularity is per token.** Font and shadow appear as
  `typography.sans` and `shadow.md` with the whole array as the value.
- New operations carry no `token` field, so an unknown `token` on them is
  rejected as `mutation.unknown-field` rather than `mutation.unknown-token`.
  Both are stable rule IDs with canonical paths.

### Phase 3: preview feedback completion

Owner-approved on 2026-09-21. This phase does not change V1 scope and does not
reopen either completed post-V1 phase.

`@theme inline` makes Tailwind substitute values literally at build time, so
only the tokens whose inline entries carry `var()` indirection can change at
runtime. Colour, density, and motion do; radius, typography, and shadow do not.
Radius was previously described as reaching the preview — it arrives as a
variable that nothing consumes, which a variable-level test assertion did not
catch.

Included work:

- emit font-family, shadow, and radius-scale values as plain custom properties
  in `:root`, with the `@theme inline` entries referencing them, following the
  existing colour pattern;
- regenerate the committed golden CSS and its golden-file assertion;
- add one small `shadow-md` / `rounded-md` sample element to the preview as an
  observation target, since no pilot uses the only mutable shadow token;
- prove all six categories update live in the iframe without a reload.

The existing iframe and `postMessage` plumbing is expected to need no change.
Touching it requires documented browser evidence and is reported as a scope
escalation; iframe isolation, origin behavior, JSON download, and the native
preview scroller stay off-limits regardless.

Owner guardrail: at the canonical default theme, the new indirection must
preserve the existing resolved computed values for font family, shadow, and
radius, proven through a committed before/after fixture. This is not pixel
diffing or visual-regression infrastructure.

Excluded: new mutation operations or any widening of the mutation API,
natural-language commands, workbench provider integration, MCP, `registry.json`
or catalog changes, new pilots beyond the single observation sample, cross-origin
or sandbox redesign, hot reload, visual-regression snapshots, rule promotion,
publishing, and deployment.

Acceptance is PH3-01 through PH3-07: live updates for all six
categories, deterministic render with a consistent golden, an unchanged mutation
boundary, no pilot regression, unchanged accessibility, a scope guard, and
default visual equivalence.

The golden CSS is the build-time default for the whole system, so AC-03, AC-06,
AC-07, PH2-03, PH2-04, and PH2-05 become stale for the current artifact and are
re-established by PH3-02, PH3-04, PH3-05, and PH3-07. AC-01, AC-02, AC-04,
AC-08, PH2-01, PH2-02, and PH2-06 are unaffected. Historical V1 records stand
unchanged.

### Phase 3 result — 2026-09-21

Completed at main commit `719ef63` (artifact `3466767`, baseline capture `5012ddd`).

All six theme categories now change computed styles live in the preview iframe
with no reload. The renderer emits font family, shadow layers, and the radius
scale as plain `:root` custom properties — `--font-family-{sans,mono}`,
`--shadow-layers-{sm,md,lg}`, `--radius-scale-{sm,md,lg}` — and the `@theme
inline` entries only reference them. Token tables, output ordering, and
`--radius` are unchanged. A new test asserts `@theme inline` holds no literal
font, radius, or shadow value.

The preview gained one Elevation sample using `shadow-md` and `rounded-md`,
because no pilot consumed the only mutable shadow token. The iframe and
`postMessage` plumbing were not touched, so there was no scope escalation.

#### Acceptance evidence

| Command | Result |
|---|---|
| `corepack pnpm test` | 13 files, 246 tests passed |
| `corepack pnpm typecheck` | passed |
| `corepack pnpm registry:build` | passed |
| `corepack pnpm build:workbench` | passed |
| `corepack pnpm build:storybook` | passed |
| `WORKBENCH_PORT=5199 corepack pnpm test:browser` | Storybook 4/4, workbench 14/14 |

All 40 axe attachment bodies were decoded — every one empty across 20
checkpoints — and the phase-2 mutation-boundary probe reran unchanged, 20/20,
confirming the operation union did not widen.

Two additional checks:

- **Independent PH3-07 derivation.** Rather than trusting the captured fixture,
  every expected value was hand-derived from the pre-change golden CSS:
  `shadow-md oklch(0 0 0 / 10%)` resolves to `oklch(0 0 0 / 0.1) 0px 4px 8px
  -2px`, `radius.md 0.5rem` to `8px`, `radius.lg 0.75rem` to `12px`, and the
  input's `shadow-xs` to Tailwind's untouched default. All matched. Git confirms
  the baseline commit touched neither `render.ts` nor the golden, so the fixture
  is a genuine pre-indirection capture.
- **Negative control.** Compiled stylesheets were compared before and after
  the change: `border-radius:.5rem` became
  `border-radius:var(--radius-scale-md)`, `font-family:"Inter", system-ui,
  sans-serif` became `font-family:var(--font-family-sans)`, and literal shadow
  layers became `var(--shadow-layers-*)`. The three dead categories are live at
  the CSS level, independent of any test assertion.

`registry.json` is byte-identical and the three-pilot catalog is unchanged.
After the merge, `main` at `719ef63` re-ran 246 tests and typecheck clean.

#### Notes carried forward

- The equivalence fixture's `button-default` shadow entry is uninformative
  (shadow is `none`), and the `input-default` entry samples Tailwind's own
  default `shadow-xs`. The informative shadow samples are the elevation sample
  and the dialog.
- `font-mono` and the `sm` radius and shadow tokens are not sampled, because no
  preview element consumes them.

### Phase 4: mutation proposal preview

Owner-approved on 2026-09-21. `mutation-proposal-preview-001` adds a narrow,
non-committing proposal transaction around the existing closed
`ThemeOperation` union. It does not add natural-language interpretation,
provider integration, mutation operations, Jev product integration, MCP,
registry items, rule promotion, publishing, or deployment.

The strict version `1.0` proposal envelope contains `proposalId`, one declared
`base` (`themeId` and `revision`), bounded provenance (`source`, `sourceId`,
RFC-3339 `createdAt`, and optional 240-character `intentSummary`), and one to
eight existing operations. Unknown fields, arbitrary CSS, paths, and extensible
metadata are forbidden. A `proposalId` is single-use within the current
workbench session across every outcome; durable cross-reload replay protection
is deferred.

One proposal is one atomic transaction. All operations validate against the
same base and produce one candidate revision. A base at revision 12 with three
operations stages revision 13 and, if applied, changes active revision 12 to 13
exactly once. No intermediate revisions or partial results may be observable.

Lifecycle: `received -> rejected | staged`; `staged -> applied | discarded |
stale`. Initial `themeId` mismatch is rejected with `mutation.base-mismatch`.
If the active theme id or revision changes after staging, Apply transitions the
proposal to stale and changes no active state, persistence, revision, or CSS.
There is no automatic rebase. Apply revalidates atomically and changes active
in-memory state once; Save remains separate. Discard leaves active state and
persistence byte-identical. Candidate preview uses the existing iframe and
rendered CSS without making the candidate active.

Acceptance is PP-01 through PP-10.

The implementation landed at main `096efc5`; a follow-up test-only change
closed two evidence gaps. Main `a41caf5` now has
computed-style proposal-preview evidence for all six mutation categories and
explicit keyboard activation evidence for Stage, Discard, second Stage, and
Apply. No product file changed during remediation. The targeted matrix passed
28/28 at both viewports in light and dark, with 16 decoded axe attachments and
zero serious or critical violations.

The owner accepted `mutation-proposal-preview-001` on 2026-09-21.

### Phase 5: Jev-native design command MVP

Owner-approved on 2026-09-22. This phase adds a focused natural-language
command input to the workbench. One command is evaluated through one batched
Jev request containing atomic Choice, Score, and Noul questions. Deterministic
code maps accepted typed decisions into the existing closed `ThemeOperation`
union and stages exactly one existing `MutationProposalV1`; preview, Apply,
Discard, stale handling, persistence boundaries, and revision behavior remain
unchanged. Nothing applies automatically.

Architecture corrected and owner-approved on 2026-09-22: this is a
**product-level Jev integration**. `DESIGN_COMMAND` is the versioned internal
product contract `personal-ui-design-command/1`. Product code owns its TypeSafe
wire contract, transport, and confidence policy (`packages/core/src/jev-design/`)
and does not depend on any agent-orchestration tooling, state, or budget.

The local product transport boundary is workbench browser -> localhost product
API -> TypeSafe API. Only that server-side product API may read
`TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY`. It must never read or fall back to
`TYPESAFE_API_KEY`, and no product AI credential may enter a Vite client
environment variable, browser bundle, localStorage, IndexedDB, proposal
provenance, logs, or analytics.
Missing or empty credentials fail before transport. Rejected credentials,
timeouts, rate limits, malformed or incomplete responses, and answers below
the product confidence policy fail closed with no retry, no staged proposal,
and no active-theme mutation. The local environment-variable path is
development infrastructure only; future public BYOK support uses a
backend-managed per-user secret flow rather than direct browser-to-TypeSafe
calls.

The phase begins with a mandatory research gate against the current official
TypeSafe documentation starting at <https://docs.typesafe.ai/introduction>.
Design, implementation, and review must be grounded in the applicable official
documentation and the retained research checkpoint
(`docs/JEV_DESIGN_COMMAND_RESEARCH.md`). Required coverage includes
state design, Choice/Score/Noul, confidence versus probability, speculative
fan-out, intent routing, the smart-home demo, the function-calling cookbook,
the JavaScript SDK/API contract, current model information, current model
jaggedness, and transport/retry/error behavior. The research artifact must map
documented limitations to the question graph, composition rules, and negative
fixtures before product implementation begins.

Jev owns only bounded semantic judgments: command kind, targeted categories,
declared directional choices, categorical strength, and whether clarification
is needed. Code owns values, arithmetic, OKLCH transforms, clamps, defaults,
operation construction, validation, proposal construction, confidence policy,
and every side effect. Jev may not generate CSS, paths, token names, font names,
dimensions, colors, mutation JSON, prose rationale, or arbitrary operations.

Included work:

- a workbench Design command panel with explicit evaluate, status,
  interpretation evidence, and the existing staged-proposal controls;
- one versioned compact state schema, one versioned atomic question catalog,
  and one versioned deterministic recipe catalog covering directional commands
  over all six existing theme categories;
- speculative fan-out in one Jev request per command, with irrelevant answers
  ignored by code;
- transparent typed answers, probabilities, confidence, recipe version, and
  proposal provenance;
- explicit `staged`, `clarification-required`, `unsupported`, and `rejected`
  outcomes;
- a product-local bounded transport and localhost API with injected-fetch
  offline tests proving credential isolation, one-attempt behavior, response
  validation, and secret-safe failures;
- offline deterministic fixtures plus bounded supervised live verification only
  while fresh evidence independently proves the product credential's
  owner-authorized included Jev allocation remains available. Credential
  presence alone is not billing evidence.

Excluded work: new mutation operations, registry/catalog changes, arbitrary
CSS or filesystem access, automatic Apply or Save, free-form rationale,
unbounded compound-command decomposition, website/image interpretation,
generative-model fallback, MCP, cross-reload proposal replay protection, rule
promotion, publishing, deployment, and any paid, overage, purchased-credit, or
auto-recharge route. A general-purpose LLM, LLM credential, provider
abstraction, agent/tool coordination, free-form planning, and generated
explanations are also excluded from this phase; the need for them is deferred
until a concrete later capability cannot be represented by the closed Jev and
deterministic-code boundary.

Acceptance is JDC-01 through JDC-12: documentation-grounded design,
bounded six-category interpretation, one-call speculative fan-out,
deterministic composition, fail-closed outcomes, unchanged proposal lifecycle,
transparent evidence, a closed mutation boundary, jaggedness defenses, full
browser/accessibility verification, zero-paid operation, and no regression.

### Phase 6 result: Agent Context Retrieval v1

Accepted on 2026-09-22 at main `b826a931`. The product-owned contract
`personal-ui-context/1` exposes deterministic, read-only `list`, `get`, and
`capabilities` operations through the core package and a local JSON CLI. It can
discover the validated theme and three pilot resources, retrieve one targeted
theme plus one component/pattern contract, and describe the existing closed
mutation/proposal capabilities without depending on the workbench, Jev, an LLM,
network access, credentials, or MCP.

ACR-01 through ACR-12 passed verification. An unfamiliar agent
used only the public retrieval/package surfaces to select the responsive dialog
pattern, explain its responsive and accessibility obligations, identify an
unsupported composition, construct one valid existing proposal, and confirm
that arbitrary CSS/path mutation was rejected. The phase passed 362 unit tests,
typecheck, registry/workbench/Storybook builds, and 53 browser tests. Stable
ordering, complete success-envelope byte ceilings, source-hash provenance,
immutable result graphs, and stable fail-closed CLI errors were independently
verified.

### Phase 7: Accessible Form Composition v1

Owner-approved on 2026-09-22. This phase adds exactly two public resources while
preserving the accepted Button, Input, and Responsive Dialog/Drawer pilots:

- `field` as a public composition pattern;
- `native-select` as a public component.

The existing component-contract schema, `personal-ui-context/1`, theme schema,
`ThemeOperation`, and `MutationProposalV1` remain frozen. The phase defines how
Field, Input, and NativeSelect compose into accessible labelled form controls,
including descriptions, invalid/error association, native option behavior,
mobile text sizing, keyboard/focus behavior, and closed deterministic
admissibility. It adds the two corresponding registry items, compact contracts,
stories, provenance entries, retrieval metadata, and verification fixtures.

Retrieval integration exposes correct resource kind, purpose, the already
declared contract guidance fields, provenance, and stable ordering. It does not
add a new principles field, require principle content for the two resources, or
invent/promote a design principle. The existing optional principles behavior of
`personal-ui-context/1` remains unchanged and may omit principles for these
resources.

Acceptance is AFC-01 through AFC-12: bounded catalog change,
complete Field and NativeSelect contracts, registry validity, closed
constraints, responsive/accessibility behavior, frozen retrieval integration,
existing byte ceilings and provenance rules, fresh-agent form composition,
browser evidence, and full regression.

Explicitly excluded: any additional component or pattern, custom
combobox/listbox behavior, async search, multi-select, schema-version change,
new design principles, richer Design Command behavior, Jev, a general-purpose
LLM or provider abstraction, MCP, project extraction, network or credential
use, Workbench redesign, publishing, deployment, and paid capacity.

### Phase 7 result: Accessible Form Composition v1

Accepted on 2026-09-23 at main `a8e63328`. The public catalog now contains
exactly five resources: Button, Field, Input, Native Select, and Responsive
Dialog/Drawer. AFC-01 through AFC-12 passed after a bounded documentation-and-
tests-only correction made the existing proposal path independently
discoverable to unfamiliar agents. A fresh-context agent completed
the public rubric 7/7 using only the core package manifest and README, the public
context CLI, and public core exports. The accepted runtime preserves the
existing schemas, theme/mutation/proposal semantics, Workbench behavior, and
product boundaries.

### Phase 8 result: Composition Foundation Pack v1

Accepted on 2026-09-23 at main `063a03e3`. The phase added exactly five public resources:
`card`, `tabs`, `switch`, `textarea`, and `single-toggle-group`. It preserves the
five accepted resources and every accepted schema, token, mutation, proposal,
Jev, retrieval, and Workbench boundary. Four verified composition fixtures—
account profile, notification preferences, workspace settings, and support
request—exercise the resulting vocabulary without redesigning the Workbench or
promoting additional resources.

CFP-01 through CFP-12 passed verification. The public consumption rubric
passed 6/6; 412 unit tests, all type/build checks, exactly ten
registry items, 38 Storybook tests, 48 Workbench tests, one real Vite-dev Design
Command boundary test, and 68 decoded accessibility attachments passed.

### Abandoned Phase 9: Workbench Composed Preview v1

`workbench-composed-preview-v1-001` has a preserved historical candidate at
`ea72724f871607881cc48e886198c99152785a5a`. Its recorded evidence was green,
including 412/412 unit tests, Storybook 38/38, Workbench 62/62, and the Design
Command boundary 1/1, with independent verification incomplete (3/6 WCP-11
items). The owner abandoned the phase; the candidate is not accepted, was never
moved to main, and must not be reused as a future implementation base.

### Phase 10 result: Quiet Workspace Workbench v1

Accepted on 2026-09-24 at product commit
`5320f55968c2eb25476a7c23ad20d377f0c56117`. The phase implements the
owner-approved Quiet Workspace direction from accepted main without inspecting
or reusing the abandoned WCP candidate.

The Workbench now uses a full-width application layout with a restrained top
bar, a bounded shadcn-derived resizable editor panel, a dominant composition
preview, responsive Desktop 1024/Mobile 390 defaults, and full-width mobile
Controls/Preview modes. Exactly eight shared compositions are consumed by both
Workbench and Storybook. The sole public catalog addition is
`resizable-panel`, bringing the registry to exactly eleven resources. Existing
theme editing, validation, fork/save/export/persistence, proposal lifecycle,
Design Command, responsive, and accessibility behavior remains intact.

The owner approved desktop light/dark and mobile Controls/Preview renders. An
independent source, contract, test, and offline-build audit passed. Verification
passed 420 unit tests, all typechecks and builds, Workbench 55 passed with one
expected mobile skip for a desktop-only check, Storybook 40/40, Design Command
1/1, the exact eleven-resource registry, and frozen/bundle/credential/network
scans. No schema, token, mutation, proposal, Jev, LLM, MCP, credential, network,
deployment, or publishing boundary changed.

### Phase 11 result: Workbench Theme Editor Polish v1

Accepted on 2026-09-25 at product commit
`d1db3ab3af931aa66b02119dfe37c2b6dcce7736`. PUI-11 through PUI-17 were
delivered as one coordinated batch under WTEP-01 through WTEP-15.

The right preview now fills the available panel and follows the real browser
viewport; the fixed Mobile 390/Desktop 1024 selector is gone. Workbench chrome
uses the active canonical Theme v2 while staged proposal variables remain
confined to preview. Eight existing-pattern collapsible color groups expose all
24 canonical tokens through native pickers and normalized text fields. The
normal UI no longer exposes Fork or baseline diff. Saving an edited built-in
opens a minimal Save As flow, while saved custom themes update normally. The
theme selector, divider, and preview toolbar use the accepted compact,
design-system-native treatment.

Owner visual review passed. Verification passed 597 unit tests, all
typechecks/builds, Storybook 58/58, Workbench 73 passed with one expected
mobile skip, Design Command 1/1, the exact 13-resource registry, and frozen,
bundle, credential, and network scans.

### Workbench Theme Controls Polish v1

Accepted on 2026-09-25 at product commit
`473372c92ad23478c41cc151a79fb8274fea7d9f`. PUI-31 through PUI-37 were
delivered as one coordinated batch under WTCP-01 through WTCP-14.

Theme swatches now use the approved compact geometry and token order. The
built-in Default theme uses a 0.7rem radius baseline and 0.25rem spacing
baseline without altering custom themes or Quiet Editorial. The preview
toolbar uses theme-neutral structure, 16px padding, ghost shadcn Buttons, and
Lucide Export/Save icons. Applicable numeric controls share a single-row
label/slider/input/unit layout; collapsible groups use accessible compact
semantic styling; sidebar and preview insets align at 16px; and font controls
show concise category copy while retaining exact canonical custom stacks.

Verification passed 672 unit tests, all typechecks and builds, Storybook
88/88, Workbench 100 passed with two intentional cross-viewport skips, Design
Command 1/1, the exact 18-resource registry, 11 mutation operations, and the
phase frozen/bundle/credential/network scan. No public resource, Theme v2 schema,
mutation operation, persistence format, Jev behavior, credential path, or
network boundary changed.

### Workbench Rendering Controls Polish v1

Accepted on 2026-09-25 at product commit
`b70c6df8b5286eb0f1141bf92066d8d93b763f4e`. PUI-38 through PUI-43 were
delivered as one coordinated batch under WRCP-01 through WRCP-16.

Workbench and preview roots now use consistent antialiased rendering. Shadow
color editing reuses the canonical OKLCH color field, while Other-tab labels
and shared collapsible triggers use the approved compact semantic treatment.
Scoped native scrollbars reveal on container interaction without changing
overflow geometry. The sidebar header and preview toolbar align at exactly
64px, preview and sidebar tab typography match, and affected Workbench form
controls remain 14px across desktop and mobile as explicitly required.

Verification passed 674 unit tests, all typechecks and builds, Storybook
88/88, Workbench 110 passed with two established viewport-specific skips,
Design Command 1/1, the exact 18-resource registry, 11 mutation operations,
and zero serious/critical axe findings.
No public resource, Theme v2 schema, mutation operation, persistence format,
Jev behavior, credential path, or network boundary changed.

### Workbench Control Navigation Scroll v1

Accepted on 2026-09-26 at product commit
`90ea824027f71c8e9ef3e376d6c5c6263b56dee9`. PUI-44 through PUI-50 were
delivered as one coordinated batch under WCN-01 through WCN-16.

Workbench form controls now share scoped typography while retaining semantic
placeholder, invalid, disabled, and value colors. Numeric rows use stable
`6rem | minmax(0,1fr) | max-content` geometry. Applicable text-and-icon actions
use explicit `size-3.5` icons that follow the canonical spacing scale. Sidebar
Tabs are content-width and horizontally scrollable, the preview Cards/States
switcher uses the accepted Select primitive, and shared collapsible triggers
use the approved radius and chevron sizing.

The official Radix-backed shadcn ScrollArea is now the sole new public
resource, bringing the registry to exactly 19 resources. Persistent
Workbench-owned sidebar, category-navigation, and status/proposal regions use
it; embedded preview-document, browser-document, Select/Combobox listbox, code,
and dialog scrolling intentionally remain native. The prior custom native
scrollbar styling was removed without adding a parallel scrolling model.

Verification passed 679 unit tests, all typechecks and builds, Storybook
94/94, Workbench 122 passed with two established viewport-specific skips,
Design Command 1/1, 19 registry resources, 11 mutation operations, and zero
serious/critical axe findings. No Theme v2 schema, mutation operation,
persistence format, Jev behavior, credential path, network boundary, or paid
capacity changed.

### Workbench Sidebar Preview Follow-up v1

Accepted on 2026-09-26 at product commit
`d3ce5ec5822da47db94b509f8848203520154eb6`. PUI-51 through PUI-55 were
delivered as one bounded follow-up under WSPF-01 through WSPF-13.

It gives the category-navigation ScrollArea the full sidebar width, corrects
tab state styling, adds the semantic sidebar-header divider, restores the
shared collapsible trigger's `muted`/`muted-foreground` pairing, ghosts the
preview Select, tightens the preview root to `gap-4 p-4`, and gives the embedded
PreviewFrame document exactly one vertical shadcn ScrollArea without creating
an outer iframe scroll owner.

Two semantic theme-token debts remain explicit rather than locally worked
around. The Default-light compact ControlSection trigger measures 4.349:1 for
`muted-foreground` on `muted`. Inactive-tab hover remains the owner-required
`text-muted-foreground/80`, measuring 3.234:1 in Default light, 4.885:1 in
Default dark, 4.468:1 in Quiet Editorial light, and 5.634:1 in Quiet Editorial
dark. No component substitutes another token family, and the tab-hover debt is
not hidden behind an axe suppression.

Verification passed 684 unit tests, all typechecks and builds, Storybook
94/94, Workbench 142 passed with two established viewport-specific skips,
Design Command 1/1, the exact 19-resource registry, 11 mutation operations,
and the frozen/bundle/credential/network scan. No schema, persistence, mutation,
Jev, credential, network, dependency, or lockfile boundary changed.

### Tactile UI Effects v1

Accepted PUI-113 at product commit `be63bef26f0f654a2c449533ee83d12f91a80454`.
The Effects tab adds UI EFFECTS with Tactile, Outline buttons and Tabs toggles,
and Strength. Semantic-token styling is limited to Outline Buttons and active
surface Tabs; non-outline variants, inactive/line Tabs, Inputs and unrelated
components stay flat. Theme v3 old imports, new exports, save/reload, history,
Undo/Redo/Reset and Design Command staging retain their boundaries.

Verification recorded 413 Workbench browser passes, 18 established skips,
and one intermittent legacy Bitcoin width-sweep failure; the unchanged test
failed 2/5 repeats on the freshly built prior accepted base. New tactile
browser checks passed 10/10, Storybook 118/118, and the Design Command boundary
1/1. Four narrow/wide light/dark captures and decoded axe checks found no new
blocking issue; 899 unit tests, typecheck, and Workbench/Storybook/registry
builds passed. The full Workbench suite is not recorded as a clean pass.

### Workbench Performance v1

Accepted PUI-118 at product commit `e3f7410033966326785cf74f59429eba8d0d68f0`.
A committed accepted-base profile found about 1,300 preview component renders
per theme edit. Memo boundaries around prop-independent Cards, App shells and
States previews, plus the Design system sheet keyed by posted CSS, reduce that
to about 177 without changing DOM, iframe messages, history or visual output.
In a paired 4× CPU browser run, color-edit medians fell from 152–161 ms
to 116–121 ms and preview-tab medians from 68–77 ms to 37–40 ms across three
fresh sessions per build. Twenty narrow/wide light/dark screenshot pairs were
byte-identical. Radius-slider total work and other non-targeted hotspots
remain neutral; no broader architecture change was made.

The Workbench suite passed 414 tests with 18 established skips; Storybook
passed 118 and the credential-empty Design Command boundary passed. A separate
four-parallel-process keyboard-scroll stress passed 40/40. An earlier
observation of 5/140 intermittent failures under parallel load versus 0/140 on
the accepted base remains explicitly recorded, alongside the prior
accepted-phase intermittency. 899 unit tests, typecheck, and all builds passed.
Measurements are in `docs/evidence/workbench-performance-v1/` and
`docs/WORKBENCH_PERFORMANCE_BASELINE.md`.

### UI Effects Showcase Polish v1

Accepted PUI-119, PUI-120, PUI-121, and PUI-122 together at product commit
`a30f4d3c6a2fad98852fc51ad5e7520d919c7850`. The Theme v3 UI Effects
editor now offers Off/Tactile and one Strength control. Exact prior toggle
payloads migrate by the any-active-target rule; absent older themes stay
flat. Tactile applies automatically to Secondary Buttons and selected surface
Tabs with a shared semantic light/dark treatment. Default, Outline,
destructive, ghost and link Buttons, line Tabs, and Inputs remain flat.

Both Workbench tab groups use content-width default surface Tabs. Storage
gains an inert Manage storage Secondary action; compact section triggers and
GitHub/Google specimens use Secondary without changing their measured
geometry or adding workflows. The Design system Colors preview uses a
clearer hierarchy and contextual Sidebar display labels while token keys,
CSS variables, editor labels, aliases and import/export keys remain intact.

Final checks passed 422 Workbench browser tests with 18 established skips,
118 Storybook browser tests, the credential-empty Design Command boundary,
907 unit tests, typecheck, and all builds. Accepted-base comparison showed identical geometry for 19 compact
triggers and both social Buttons. Decoded candidate axe results had no new
serious or critical findings; the moderate landmark/region findings matched
the base, while the old Default-light muted-trigger contrast finding was
absent on Secondary triggers. Earlier Bitcoin, Type scale, Default contrast
and WCN residuals remain distinct.

### Amber Dusk and shell refinement v1

Accepted PUI-123 through PUI-128 at product commit
`5ea846de50c9206fcb7a9e16d3bdf441d1d48d8a`. Amber Dusk maps the owner
palette into the existing Theme v3 preset architecture, including light/dark,
chart and dedicated Sidebar tokens. The original source remains traceable in
the frozen ticket and conversion report. After review found serious
text contrast failures, the owner authorized narrow changes to light
`muted-foreground`, light `primary`, and dark `primary-foreground`. The observed
text pairs now measure at least 4.5:1, and eight decoded axe captures on
the corrected candidate show no serious or critical findings.

Tactile surface Tabs now receive only `ring-1 ring-ring/20` on TabsList while
Secondary Buttons alone respond to Strength. The effect helper is shown only
for Tactile. Design system color labels and headings, larger App shells and
Inset styling, full-width Manage storage, and the locally circular Chat send
button passed the focused narrow/wide light/dark browser matrix. The earlier
full Workbench run passed 446 tests with 18 established skips; Storybook passed
118 and the credential-empty Design Command boundary passed. Following the
three-token correction, the owner directed focused verification: 24 browser
tests and the contrast unit assertion passed.

A possible future use of light `primary` as normal text on the light background
would have 4.37:1 contrast; it is not rendered in the accepted UI. Earlier
Bitcoin, Type scale, Default contrast, and keyboard-scroll residuals remain
separate.

### Tactile border and Design system type v1

Accepted PUI-129 and PUI-131 together at product commit
`b2f937a66508bb0a1978dc35c2a4b2bb89c46c83`. The Tactile surface TabsList
decorative edge changed from `ring-ring/20` to `ring-border/80`. Off still adds
no decorative ring, Strength still affects Secondary Buttons alone, and tab
focus-visible continues using the semantic `ring` token. Design system Colors
group headings are `text-sm` and uppercase; labels, HEX values, swatches,
grouping, and layout remain unchanged.

Focused checks passed 44 targeted unit tests, touched-package typecheck,
the Workbench build, and 16 narrow/wide browser cases covering Amber Dusk
light/dark, strength invariance, keyboard focus, and Colors layout. Four
decoded axe attachments had no violations.

### Accepted implementation review and inset TabsList v1

Accepted PUI-132 and PUI-133 together at product commit
`5d0536d038d7ebce5429fa1460c0d7af21af51ef`. The committed audit records
12 findings before source edits. Three stale comments now correctly identify
the TabsList as the effect target, and focused browser assertions distinguish
an inset edge from an outer one. Shared CSS render/parse duplication was
documented and deferred because its small benefit would require changing the
shared editor and preview path. No broader runtime refactor was selected.

The sole behavior change is the decorative Tactile surface TabsList edge:

`inset-ring-1 inset-ring-border/80` replaces the outer ring equivalent. The
installed Tailwind 4.3.3 compiler confirmed the generated inset declarations.
Off remains edge-free; Tabs remain Strength-invariant; Secondary Button
tactility, selected triggers, line Tabs, and semantic focus-visible rings are
unchanged. Theme 3.0, 13 mutations, 23 registry resources, persistence,
Design Command, dependencies, and public APIs remain intact.

Checks passed 242 targeted unit tests, touched-package typechecks, the
Workbench build, and 14 focused narrow/wide browser cases. Eight decoded axe
captures had no violations, and the final bundle was verified to contain the
inset rule. The audit findings are retained in
`docs/evidence/accepted-implementation-review-inset-tabs-v1-001/producer/findings.md`.

### Theme action Export dialog v1

Accepted PUI-134, PUI-135, and PUI-136 together at product commit
`e16bc37051915954fb39196636245c11070bf309`. Export opens an accessible
shadcn Dialog without downloading. JSON is the unchanged canonical Theme v3
export; CSS / Tailwind v4 is generated by the existing renderer. Each selected
format uses the same bytes for preview, clipboard, and explicit download.
Custom-theme Delete moved to the right toolbar immediately before dark mode,
with the same confirmation and built-in protection. Existing custom Save, built-in
Save As, and custom Delete successes now use transient Base UI toasts. Their shared
surface uses popover foreground/background and semantic border tokens. Reset
retains its guarded history Undo, Dismiss, and timing; errors remain explicit.

Verification passed 22 focused browser cases plus four Reset cases across
narrow/wide and light/dark, with 40 decoded axe attachments and no blocking
findings, along with focused unit tests, touched-package typechecks, and the
Workbench build. Theme 3.0, 13 mutation operations, 23 registry resources,
dependencies, and public APIs remain intact.

### Jev Design Command interpretation research

PUI-137 closed as successful research-only work. The Stage 1 proposal at
`d5cb9d91e6925bb5008da96e5a93607cb8fcbb43` maps the current closed
Design Command mutation and preview boundaries, product-local Jev integration,
and the tradeoffs among deterministic, frontier LLM, Jev, and hybrid intent
interpretation. An initial review found missing enforceable Jev
credit limits and an unspecified LLM route; the proposal was corrected and
the final document passed review. The owner declined
Stage 2 for this phase and assigned the comparison to PUI-142 in Backlog.

The existing bounded Jev architecture is safe, but its literal question
catalog has not demonstrated strong indirect or reference-style intent
handling. Jev must show incremental value against an LLM plus deterministic
Personal UI admissibility, mutation, validation, history, and persistence
before its future role is decided. This phase made no live Jev or LLM API
calls, accessed no credentials, authorized no network or paid spend, and made
no product, Theme v3, mutation-contract, or accepted-behavior change. The
proposal and official-source check are retained in
`docs/evidence/jev-design-command-interpretation-v1-001/`.

### Theme code, header, shell, and selection polish v1

Accepted PUI-138, PUI-139, PUI-140, and PUI-141 together at product commit
`7e2746e5e43dd6f6d39fb0df94242e4956c3fb19`. The header action is now
`Code`; its `Theme code` dialog retains canonical Theme v3 JSON and the existing
CSS renderer, shows the exact supporting copy, and places Copy in an attached
toolbar over a scrollable read-only code panel. Opening it never downloads a
file, and preview text is the clipboard source. Icon-only header actions use
Workbench-private tooltips and independent accessible names; Delete matches
the shared resting icon treatment and retains its custom-only confirmation.

All three App shell outer frames now use a restrained semantic border without
an outer shadow. Inset project's connected outer/sidebar surface uses dedicated
Sidebar tokens; internal elevation and per-shell collapse/Workbench isolation
remain. The shells have more vertical space and one-step-larger labels.
PUI-141 was reproduced and traced to Chromium clipping native selection inside
two borderless embedded Inputs whose invisible `rounded-md` radius followed
Geometry. Those Inputs now use `rounded-none`; visible row radius, the public
Input primitive, selection colors, and native selection remain unchanged.

Verification passed 21 focused dialog/header browser cases with one
intentional mobile selection-sweep skip, 10 shell/isolation cases, 126 focused
unit tests, touched-package typechecks, and a Workbench build. Twelve decoded
browser axe attachments had no findings; additional shell scans found only the
established moderate landmark/region findings. The PUI-141 selection diagnosis
is retained in
`docs/evidence/theme-code-header-shell-selection-v1-001/producer-selection-diagnosis.md`.
Theme 3.0, 13 mutation operations, 23 registry resources, dependencies, and
public component APIs are unchanged.

### Landing and Workbench routes v1

Accepted PUI-143 and PUI-144 together at product commit
`8f847c7b1f784ab6f0deb49c6d6b10a71e4a4499`. The root landing page uses
accepted shadcn primitives and built-in Theme v3 data to show real Personal UI
compositions in light and dark mode. Its primary call to action opens the
Workbench. The page describes the current Design Command flow as experimental
and does not claim future reference-style interpretation is shipped.

The existing editor moved to `/workbench`. Explicit stable links for Default,
Quiet Editorial, and Amber Dusk select the named built-in on initial load
without overwriting the stored selection. Subsequent built-in selection updates
the URL; local custom themes use plain `/workbench`. Unknown built-in slugs
normalize safely to `/workbench`. The preview iframe now uses
`/workbench?preview=1`; its isolation and message behavior remain. `/themes`
and `/themes/:slug` remain reserved. Deployment-host deep-link HTML fallback
remains a separate infrastructure concern; local Vite production preview served
direct links during verification.

Verification passed 32 landing/route browser cases, 69 representative
Workbench cases with three established skips, one credential-empty Design
Command boundary case, 89 focused unit tests, typechecks, and the Workbench
build. Sixteen decoded axe attachments had no blocking findings. A post-merge
smoke covered root, CTA, back/forward, all three built-in links, and
invalid-slug normalization. A broad Workbench run was not clean: 495 passed,
19 skipped, and four WGPE-10 cases failed. The same four stale Inset `muted`
assertions fail on the accepted pre-phase base, whose product already uses the
`sidebar` surface.

Package manifests, lockfile, registry, Theme 3.0, 13 mutation operations, and
23 public resources are unchanged.
