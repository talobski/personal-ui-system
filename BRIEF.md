# Personal UI System — Project Brief

Status: ACTIVE — `jev-design-command-mvp-001` is owner-approved and begins with
a mandatory official-documentation research gate. All nine narrow-V1 acceptance criteria passed; the
post-V1 shadcn workbench alignment is also DONE(verified)
and owner-accepted. `theme-mutation-coverage-001` is DONE(verified) and
owner-accepted at main `2d913c0`. `preview-feedback-completion-001` is
DONE(verified) and owner-accepted at main `719ef63`. All completed phases remain
owner-accepted and none is reopened. See the Phase 3 sections
below, and `docs/PROJECT_HANDOFF_CHECKPOINT.md` for handoff state. See the Phase 2 sections below, and
`docs/PROJECT_HANDOFF_CHECKPOINT.md` for handoff state and deferred decisions.

Last updated: 2026-09-22

## Goal

Build a local-first, self-hostable, agent-first personal UI system on top of shadcn/ui. It will give Paseo Leads, Jev/TypeSafe, Codex, Claude Code, verifier agents, and the owner a compact source of truth for producing interfaces that follow the owner's preferences without forcing every project into one visual identity.

V1 proves a narrow vertical slice: structured theme data and design-system rules can drive both reusable shadcn-based components and a local visual editor, while remaining directly consumable without running that editor.

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
- Jev deciding or editing hard rules. V1 may define typed decision packets and fixtures, but does not invent missing Loop gate/Jev infrastructure.

## Why this is the smallest useful V1

Theme editors and component explorers already exist. shadcn has first-party visual presets, registry schemas/APIs, and registry MCP support; tweakcn provides a mature visual editor; Storybook provides component-state exploration, tests, agent-readable manifests, and an MCP server. Rebuilding those surfaces first would spend effort on commodity capability.

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

All criteria are mandatory for `DONE(verified)` unless explicitly re-scoped by the owner.

### AC-01 — Independent core

- **assertion:** Theme, contract, constraint, and mutation packages can be imported, validated, and tested without starting or importing the workbench app.
- **method:** code
- **capability:** Node/TypeScript test runner and dependency-boundary inspection.
- **threshold:** Core test suite passes; an automated dependency check finds no import from `apps/workbench` into a core package.
- **result + evidencePath:** verified 2026-09-21; `.loop/runs/core-policy-audit-001/evidence/ac-01.json`

### AC-02 — shadcn foundation

- **assertion:** The three pilot components extend/adapt shadcn rather than reimplementing primitives, and the local registry is valid under the installed shadcn public schema/API.
- **method:** code
- **capability:** shadcn registry loader/schema validator plus source inspection script.
- **threshold:** Registry validation passes for all pilot items; each declares its shadcn/primitive dependency and contains no bespoke implementation of focus trapping, roving focus, or dialog dismissal.
- **result + evidencePath:** verified 2026-09-21; `.loop/runs/core-policy-audit-001/evidence/ac-02.json`

### AC-03 — Structured themes

- **assertion:** A named theme contains versioned light/dark values for every V1 token category and generates deterministic Tailwind/shadcn-compatible CSS.
- **method:** code
- **capability:** Schema tests, fixtures, and snapshot/hash comparison.
- **threshold:** Valid fixture round-trips without semantic loss; invalid fixtures are rejected; identical input produces byte-identical CSS; both color modes and all six categories are present.
- **result + evidencePath:** verified 2026-09-21; `.loop/runs/core-policy-audit-001/evidence/ac-03.json`

### AC-04 — Compact agent contracts

- **assertion:** Each pilot component/pattern has a validated compact contract and can be retrieved alone without loading the full catalog.
- **method:** code
- **capability:** Contract validator and lookup test.
- **threshold:** All required fields validate for three pilots; single-item lookup returns only that item's contract and is at most 8 KiB serialized for each pilot.
- **result + evidencePath:** verified 2026-09-21; `.loop/runs/core-policy-audit-001/evidence/ac-04.json`

### AC-05 — Deterministic constraints and safe mutations

- **assertion:** Hard rules reject inadmissible component/theme state before it becomes active; structured patches cannot address arbitrary CSS or files.
- **method:** code
- **capability:** Unit/property tests against declared mutation operations and constraint fixtures.
- **threshold:** Every predeclared invalid fixture is rejected with a stable rule ID and path; valid fixtures apply; unknown operation/path is rejected; no operation accepts raw CSS or filesystem paths.
- **result + evidencePath:** verified 2026-09-21; `.loop/runs/core-policy-audit-001/evidence/ac-05.json`

### AC-06 — Local visual workbench

- **assertion:** A human can inspect pilot states, edit supported tokens, switch color mode and viewport, fork a named theme, save it locally, reload it, and compare current versus baseline values.
- **method:** browser
- **capability:** Real Chromium via Playwright with screenshot and interaction evidence.
- **threshold:** One automated path completes every listed action at 390×844 and 1440×900; saved state survives reload; validation errors prevent invalid activation; no external network is required after install.
- **result + evidencePath:** verified 2026-09-20; `.loop/runs/workbench-lifecycle-001/evidence/ac-06.json`

### AC-07 — Accessibility and responsive behavior

- **assertion:** Pilot components remain keyboard-operable and free of automated critical/serious accessibility violations in both modes and representative viewports; the responsive dialog pattern uses its declared mobile replacement.
- **method:** browser
- **capability:** Playwright, axe, keyboard interaction, viewport inspection.
- **threshold:** Zero critical/serious axe violations across the declared matrix; documented keyboard flows pass; at ≤640 px the dialog fixture renders the declared drawer behavior and at ≥1024 px the dialog behavior.
- **result + evidencePath:** verified 2026-09-21; `.loop/runs/accessibility-browser-001/evidence/ac-07.json`

### AC-08 — Reusable-rule promotion remains human-controlled

- **assertion:** A recorded correction can become a candidate, but no candidate becomes active without an explicit owner-approved status transition.
- **method:** code
- **capability:** State-machine tests and fixture audit.
- **threshold:** Direct candidate-to-active mutation without approval receipt is rejected; approved fixture preserves provenance, owner response, and timestamp.
- **result + evidencePath:** verified 2026-09-21; `.loop/runs/core-policy-audit-001/evidence/ac-08.json`

### AC-09 — Documentation and agent handoff

- **assertion:** A fresh coding agent can discover the source-of-truth files, retrieve one contract/theme, apply a valid structured change, and run the relevant verification command from repository instructions.
- **method:** rubric
- **capability:** Fresh-context verifier with filesystem and command execution.
- **threshold:** 5/5 rubric items pass with cited files and command output: discovery, targeted retrieval, valid mutation, invalid-mutation rejection, verification execution.
- **result + evidencePath:** verified 2026-09-21; `.loop/runs/fresh-agent-handoff-001/evidence/ac-09.json`

## Verification matrix and freshness

Browser criteria require an actual renderer; jsdom is insufficient. Code evidence records commands, environment, exit result, artifact hash, raw report, and observation time. Rubric evidence includes the predeclared items and inspected artifacts. Evidence predating a material change to the evaluated artifact is stale.

V1 verification environments:

- Desktop: Chromium, 1440×900.
- Mobile: Chromium, 390×844.
- Color modes: light and dark where applicable.
- Accessibility: axe plus explicit keyboard paths; automated checks do not claim full accessibility.

## Budgets

These are conservative project ceilings pending a global owner policy:

- Paid spend: 0. No metered API, purchased credit, overage, or new subscription.
- Agent runs: maximum 8 for V1.
- Total delegated provider calls/turns: maximum 80 for V1; retries, replacement, and resume do not reset this ceiling.
- Worker concurrency: maximum 2; start with 1. A second worker requires proven independence and recorded benefit.
- Spawn depth: 1.
- Attempts per task: maximum 3; unchanged retries are forbidden.
- Provider/model policy: included subscription routes only; standard class by default, strong only for difficult synthesis/red-team with a logged reason, max not admitted for V1 without explicit owner approval and gate support.
- Research task: ≤20 fetched primary-source pages, ≤45 minutes wall clock, checkpoint after each source cluster.
- Implementation task: ≤12 calls/turns per admitted worker when the provider can enforce it, ≤90 minutes wall clock per run, soft target 40k tokens, checkpoint after each criterion-sized unit.
- Verification task: ≤10 calls/turns per admitted verifier when enforceable, ≤60 minutes wall clock, soft target 25k tokens, checkpoint after each criterion.

Prompt-only token and turn targets are telemetry, not hard controls. Formal dispatch remains paused if the required external controls cannot be proven.

## Capabilities required before implementation dispatch

- Local package manager and Node runtime compatible with selected dependencies.
- Git repository and isolated worktree support for code producers.
- Accessible Paseo control plane and labelled agent/workspace operations.
- Eligible provider profile with tested spawn depth/concurrency and `.loop/` write denial.
- Browser renderer and accessibility tooling for AC-06/07.
- Deterministic schema/test runner for AC-01–05/08.
- Fresh-context verifier for AC-09.

## Authority boundaries

The owner retains authority over public publishing, production deployment, destructive production changes, financial liability, and promotion of design-rule candidates. Agents may prepare but not execute those actions.

Within the local repository, the Lead may create and edit project files, install zero-cost dependencies when admitted, run local tests/builds, create reversible worktrees, and operate the local development server. Secrets, credentials, raw sensitive data, and canonical `.loop/` state must not enter worker workspaces or commits.

## Expected bounded outcomes

- `verified`: every mandatory criterion has fresh passing evidence.
- `negative`: the spike proves a core premise infeasible within the declared stack/budget and preserves reproducible evidence.
- `inconclusive`: a required provider, browser, or verification capability remains unavailable after admissible attempts.
- `abandoned`: owner explicitly stops the project.

## Current assumptions and owner choices

Safe defaults applied for scoping:

- V1 defers the natural-language design-command input and custom MCP implementation while preserving typed mutation and decision seams for it.
- V1 uses three pilot components/patterns rather than broad catalog coverage.
- Data is local filesystem data committed with the system; ephemeral workbench UI state may use browser storage, but saved themes must be ordinary portable files or exports.
- Storybook is supporting infrastructure, not the canonical contract store.
- No public release optimization or deployment work occurs in V1.

Owner confirmation received on 2026-09-20 for this narrow V1. Deferred capabilities remain potential later phases, not architectural exclusions.

## Post-V1 phase: shadcn workbench alignment

This bounded cleanup begins only after the completed V1 checkpoint and does not
change V1 scope, results, evidence, or its 8/8 agent-run record.

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
and axe/accessibility checks. The phase budget is one worker run, one concurrent
worker, at most 12 worker calls/turns, at most two changed attempts within that
run, 90 minutes wall clock, and paid budget 0. The owner-approved global ceiling
of 10 provides exactly one cleanup slot after accounting for V1's 8 runs and the
post-V1 audit run; the phase-local one-run limit remains controlling.

## Phase 2: theme mutation coverage

Owner-approved on 2026-09-21. This phase does not change V1 scope, results, or
its 8/8 agent-run record, and does not reopen the completed post-V1
shadcn-alignment phase.

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

Acceptance is PH2-01 through PH2-06 in
`.loop/runs/theme-mutation-coverage-001/task.md`: category coverage, closed
boundary, deterministic round-trip, workbench editing across both viewports and
both colour modes, unchanged accessibility, and no regression.

These changes touch code verified under AC-03 and AC-05, so that evidence
becomes stale for the current artifact. The owner accepted this. The new phase
evidence re-establishes the affected invariants; the historical V1 record stands
unchanged.

The phase budget is one worker run, one concurrent worker, at most 12 worker
calls, at most two changed attempts within that run, 120 minutes wall clock, a
50k soft token target, spawn depth 1, and paid budget 0. The owner raised the
project lifetime agent-run ceiling from 10 to 11 to admit exactly this run. If
the run cannot complete the phase, the project pauses rather than raising the
ceiling again.

## Phase 2 result — 2026-09-21

`theme-mutation-coverage-001` is `DONE(verified)` at main commit `2d913c0`
(artifact `e8481f5`, core work `f6f3ed6`), pending owner acceptance.

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

### Lead-run acceptance evidence

Every command was rerun by the Lead against `e8481f5`.

| Command | Result |
|---|---|
| `corepack pnpm test` | 13 files, 245 tests passed (191 before, +54) |
| `corepack pnpm typecheck` | passed |
| `corepack pnpm registry:build` | passed |
| `corepack pnpm build:workbench` | passed |
| `corepack pnpm build:storybook` | passed |
| `WORKBENCH_PORT=5199 corepack pnpm test:browser` | Storybook 4/4, workbench 8/8 |

The Lead decoded all 40 axe attachment bodies directly: every one is an empty
array, across 20 distinct checkpoints including the three new settings states.

The Lead also wrote and ran an independent probe of the closed boundary rather
than trusting the worker's own fixtures. Sixteen escape-hatch attacks — a raw
`setCss` operation, extra `css` / `path` / `file` / `$ref` fields, a JSON pointer
patch, a bulk `setMany`, inherited property names including `__proto__`,
negative lengths, out-of-range density, and injection-shaped strings — were all
rejected with stable rule IDs and canonical paths, and the theme was left
untouched on rejection. The probe is retained at
`.loop/runs/theme-mutation-coverage-001/evidence/lead-probe.test.ts` rather than
added to the product suite, to keep the delivered artifact inside the worker's
contracted scope. One probe assertion initially failed on the Lead's own bug —
an empty operations array is rejected by pre-existing request rules — which was
corrected; the product code was not at fault.

`registry.json` is byte-identical to `main` (sha256 `9361b823…`) and the
three-pilot contract data is unchanged. After the merge, `main` at `2d913c0`
re-ran 245 tests and typecheck clean.

Budget at completion: phase agent runs 1/1, worker calls 1/12, attempts 1/2,
lifetime agent runs 11/11, project calls 17/80, paid spend 0.

### Known limitations

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

## Phase 3: preview feedback completion

Owner-approved on 2026-09-21. This phase does not change V1 scope or its 8/8
agent-run record, and does not reopen either completed post-V1 phase.

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

Acceptance is PH3-01 through PH3-07 in
`.loop/runs/preview-feedback-completion-001/task.md`: live updates for all six
categories, deterministic render with a consistent golden, an unchanged mutation
boundary, no pilot regression, unchanged accessibility, a scope guard, and
default visual equivalence.

The golden CSS is the build-time default for the whole system, so AC-03, AC-06,
AC-07, PH2-03, PH2-04, and PH2-05 become stale for the current artifact and are
re-established by PH3-02, PH3-04, PH3-05, and PH3-07. AC-01, AC-02, AC-04,
AC-08, PH2-01, PH2-02, and PH2-06 are unaffected. Historical V1 records stand
unchanged.

The phase budget is one worker run, one concurrent worker, at most 12 worker
calls, at most two changed attempts, 120 minutes wall clock, a 50k soft token
target, spawn depth 1, and paid budget 0. The owner raised the project lifetime
agent-run ceiling from 11 to 12 to admit exactly this run. If the run cannot
complete the phase, the project pauses rather than raising the ceiling again.

## Phase 3 result — 2026-09-21

`preview-feedback-completion-001` is `DONE(verified)` at main commit `719ef63`
(artifact `3466767`, baseline capture `5012ddd`), pending owner acceptance.

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

### Lead-run acceptance evidence

| Command | Result |
|---|---|
| `corepack pnpm test` | 13 files, 246 tests passed |
| `corepack pnpm typecheck` | passed |
| `corepack pnpm registry:build` | passed |
| `corepack pnpm build:workbench` | passed |
| `corepack pnpm build:storybook` | passed |
| `WORKBENCH_PORT=5199 corepack pnpm test:browser` | Storybook 4/4, workbench 14/14 |

The Lead decoded all 40 axe attachment bodies — every one empty across 20
checkpoints — and reran its own phase-2 mutation-boundary probe unchanged, 20/20,
confirming the operation union did not widen.

Two checks the Lead added because the worker could not supply them:

- **Independent PH3-07 derivation.** Rather than trusting the captured fixture,
  the Lead hand-derived every expected value from the pre-change golden CSS:
  `shadow-md oklch(0 0 0 / 10%)` resolves to `oklch(0 0 0 / 0.1) 0px 4px 8px
  -2px`, `radius.md 0.5rem` to `8px`, `radius.lg 0.75rem` to `12px`, and the
  input's `shadow-xs` to Tailwind's untouched default. All matched. Git confirms
  the baseline commit touched neither `render.ts` nor the golden, so the fixture
  is a genuine pre-indirection capture.
- **Negative control.** The worker did not run the new live test against the old
  renderer, so it produced no failing-before evidence. The Lead compared compiled
  stylesheets instead: `border-radius:.5rem` became
  `border-radius:var(--radius-scale-md)`, `font-family:"Inter", system-ui,
  sans-serif` became `font-family:var(--font-family-sans)`, and literal shadow
  layers became `var(--shadow-layers-*)`. The three dead categories are live at
  the CSS level, independent of any test assertion.

`registry.json` is byte-identical and the three-pilot catalog is unchanged.
After the merge, `main` at `719ef63` re-ran 246 tests and typecheck clean.

Budget at completion: phase agent runs 1/1, worker calls 1/12, attempts 1/2,
lifetime agent runs 12/12, project calls 19/80, paid spend 0.

### Notes carried forward

- The equivalence fixture's `button-default` shadow entry is uninformative
  (shadow is `none`), and the `input-default` entry samples Tailwind's own
  default `shadow-xs`. The informative shadow samples are the elevation sample
  and the dialog.
- `font-mono` and the `sm` radius and shadow tokens are not sampled, because no
  preview element consumes them.
- The worker reported roughly 20 internal tool calls against a budget written as
  "at most 12 worker calls/turns". The controlled unit is Lead-to-worker turns,
  of which one was used. Recorded as a definitional gap to fix in future phase
  budgets, not a breach.

## Phase 4: mutation proposal preview

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

Acceptance is PP-01 through PP-10 in
`.loop/runs/mutation-proposal-preview-001/task.md`. The phase budget is one
worker run, concurrency one, at most three Lead-to-worker turns, at most three
changed attempts, 120 minutes, a 50,000 soft worker-token target, spawn depth
one, and paid budget zero. The owner raised the lifetime agent-run ceiling from
12 to 13 for exactly this run, then authorized the third turn/attempt only for
staged-state control isolation. No additional worker run or attempt is
authorized.

The implementation was preserved at main `096efc5` while two evidence gaps
were remediated in a separate, owner-authorized test-only run. The completion
gate passed in the isolated worktree before integration. Main `a41caf5` now has
computed-style proposal-preview evidence for all six mutation categories and
explicit keyboard activation evidence for Stage, Discard, second Stage, and
Apply. No product file changed during remediation. The targeted matrix passed
28/28 at both viewports in light and dark, with 16 decoded axe attachments and
zero serious or critical violations.

The owner accepted `mutation-proposal-preview-001` as `DONE(verified)` on
2026-09-21, including the isolated completion-gate-before-merge process used
for the final remediation.

## Migration Phase B: adopt the shared Loop Engineering runtime

Owner-approved on 2026-09-22. This phase replaces the temporary project-local
Jev implementation with the exact verified private package
`@loop-engineering/jev-core@0.1.0`. The immutable local tarball has SHA-256
`fb3db3792fede89b2a977c120dfe3e4566fe6c303dd4fc2b769c2049304af923`,
verified runtime commit `40eb9cab16ad2ac3974d98e851ff3abf415b2fb8`, and packaged source commit
`d1226c2c92f5682cc1d932b2401b2b628555c7ac`. Registry publication and network
dependency resolution are forbidden.

The producer may change only dependency/lock metadata, Jev integration scripts,
the temporary adapter replacement, migration fixtures/tooling, and directly
related tests and documentation. A minimal project-specific configuration shim
may remain, but it must not duplicate decision acceptance, sanitization,
persistence, locking, budgets, provider-state handling, or policy logic. Product
behavior and completed product work are out of scope.

The migration must preserve historical agent runs 14, model/provider requests
23, Jev requests 2, every task and attempt counter, completed history and
evidence, accepted product commit `a41caf5f90eea760cf245addf1d70f7e34e9c443`,
later control checkpoint `dedf949702e9b869670cbb3bc344d4e1b220f4dd`,
historical provider observations, owner pause/acceptance records, paid spend 0,
and all human-only authority boundaries. These values may evolve only through
new Phase B execution; they must never reset.

The phase allocation began with 2 normal agent runs and up to 2 conditional
remediation runs. After the bounded remediation was exhausted, the owner
approved one final control-metadata verification slot, followed by one bounded
live-shape sanitization correction after the mandatory dry-run found numeric
token-counter false positives: hard phase ceiling 6, lifetime ceiling 20,
8 Lead-to-worker turns, 6 phase attempts, concurrency 1, and paid spend 0. The
sixth run is reserved for the protected fresh verifier.
Remediation headroom retains the previously
approved materially-changed, failure-bound conditions.

The canonical `.loop/state.json` remains worker-inaccessible. Only after the
exact candidate passes protected fresh verification may the Lead back up and
atomically migrate it to state schema v2. The verified live transaction is
authorized to harden mode `0644` to `0600`; success retains `0600`, while any
failure restores the exact prior bytes, hash, and `0644` mode. The global policy
declaration cap was separately changed from 14 to 23 without changing any other
policy field; the personal project remains independently capped at 20.

## Phase 5: Jev-native design command MVP

Owner-approved on 2026-09-22. This phase adds a focused natural-language
command input to the workbench. One command is evaluated through one batched
Jev request containing atomic Choice, Score, and Noul questions. Deterministic
code maps accepted typed decisions into the existing closed `ThemeOperation`
union and stages exactly one existing `MutationProposalV1`; preview, Apply,
Discard, stale handling, persistence boundaries, and revision behavior remain
unchanged. Nothing applies automatically.

Architecture corrected and owner-approved on 2026-09-22: this is a
**product-level Jev integration**, separate from the Loop Engineering control
plane. `DESIGN_COMMAND` is the versioned internal product contract
`personal-ui-design-command/1`; it is not a Loop routing contract. Product code
must not import or depend on `@loop-engineering/jev-core`, `.loop` state, Loop
billing or request budgets, `WORKER_FAN_OUT`, or any other orchestration
semantics. The existing shared package and `tools/loop/jev/` remain exclusively
for Loop Engineering control-plane use.

The local product transport boundary is workbench browser -> localhost product
API -> TypeSafe API. Only that server-side product API may read
`TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY`. It must never read or fall back to
`TYPESAFE_LOOP_ENGINEERING_API_KEY` or `TYPESAFE_API_KEY`, and no product AI
credential may enter a Vite client environment variable, browser bundle,
localStorage, IndexedDB, proposal provenance, logs, analytics, or `.loop`.
Missing or empty credentials fail before transport. Rejected credentials,
timeouts, rate limits, malformed or incomplete responses, and answers below
the product confidence policy fail closed with no retry, no staged proposal,
and no active-theme mutation. The local environment-variable path is
development infrastructure only; future public BYOK support uses a
backend-managed per-user secret flow rather than direct browser-to-TypeSafe
calls.

The phase begins with a mandatory research gate against the current official
TypeSafe documentation starting at <https://docs.typesafe.ai/introduction>.
The researcher, producer, and verifier must each read the applicable official
documentation and the retained research checkpoint. Required coverage includes
state design, Choice/Score/Noul, confidence versus probability, speculative
fan-out, intent routing, the smart-home demo, the function-calling cookbook,
the JavaScript SDK/API contract, current model information, current model
jaggedness, and transport/retry/error behavior. The research artifact must map
documented limitations to the question graph, composition rules, and negative
fixtures before product implementation is admitted.

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

Acceptance is JDC-01 through JDC-12 in
`.loop/runs/jev-design-command-mvp-001/task.md`: documentation-grounded design,
bounded six-category interpretation, one-call speculative fan-out,
deterministic composition, fail-closed outcomes, unchanged proposal lifecycle,
transparent evidence, a closed mutation boundary, jaggedness defenses, full
browser/accessibility verification, zero-paid operation, and no regression.

Execution is sequential with one worker at a time: research/contract,
producer, protected fresh verifier, and at most one informative
correction/reverification slot. The hard phase ceiling is 4 agent runs (3
expected), 6 Lead-to-worker turns, 4 phase attempts, concurrency 1, spawn depth
1, at most 16 live Jev requests with no silent retries, and paid spend 0. The
owner raised the project lifetime ceiling from 20 to 24 solely for this phase.
Claude is the owner-preferred producer while fresh owner/provider evidence says
its included capacity is comfortable. If the owner later reports low Claude
capacity, the Lead checkpoints at the next coherent boundary, preserves the
worktree/branch/evidence/counters/next action, stops further Claude dispatch,
and hands off only work that can safely continue on an admissible Codex route.
Completed work is never replayed; a materially risky provider switch finishes
or safely pauses the current unit first.
