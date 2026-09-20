# Personal UI System — Project Brief

Status: RUNNING — narrow V1 confirmed; Jev adapter and included-capacity live route verified

Last updated: 2026-09-20

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
- **result + evidencePath:** unevaluated; `.loop/runs/<verification-run>/evidence/ac-01.json`

### AC-02 — shadcn foundation

- **assertion:** The three pilot components extend/adapt shadcn rather than reimplementing primitives, and the local registry is valid under the installed shadcn public schema/API.
- **method:** code
- **capability:** shadcn registry loader/schema validator plus source inspection script.
- **threshold:** Registry validation passes for all pilot items; each declares its shadcn/primitive dependency and contains no bespoke implementation of focus trapping, roving focus, or dialog dismissal.
- **result + evidencePath:** unevaluated; `.loop/runs/<verification-run>/evidence/ac-02.json`

### AC-03 — Structured themes

- **assertion:** A named theme contains versioned light/dark values for every V1 token category and generates deterministic Tailwind/shadcn-compatible CSS.
- **method:** code
- **capability:** Schema tests, fixtures, and snapshot/hash comparison.
- **threshold:** Valid fixture round-trips without semantic loss; invalid fixtures are rejected; identical input produces byte-identical CSS; both color modes and all six categories are present.
- **result + evidencePath:** unevaluated; `.loop/runs/<verification-run>/evidence/ac-03.json`

### AC-04 — Compact agent contracts

- **assertion:** Each pilot component/pattern has a validated compact contract and can be retrieved alone without loading the full catalog.
- **method:** code
- **capability:** Contract validator and lookup test.
- **threshold:** All required fields validate for three pilots; single-item lookup returns only that item's contract and is at most 8 KiB serialized for each pilot.
- **result + evidencePath:** unevaluated; `.loop/runs/<verification-run>/evidence/ac-04.json`

### AC-05 — Deterministic constraints and safe mutations

- **assertion:** Hard rules reject inadmissible component/theme state before it becomes active; structured patches cannot address arbitrary CSS or files.
- **method:** code
- **capability:** Unit/property tests against declared mutation operations and constraint fixtures.
- **threshold:** Every predeclared invalid fixture is rejected with a stable rule ID and path; valid fixtures apply; unknown operation/path is rejected; no operation accepts raw CSS or filesystem paths.
- **result + evidencePath:** unevaluated; `.loop/runs/<verification-run>/evidence/ac-05.json`

### AC-06 — Local visual workbench

- **assertion:** A human can inspect pilot states, edit supported tokens, switch color mode and viewport, fork a named theme, save it locally, reload it, and compare current versus baseline values.
- **method:** browser
- **capability:** Real Chromium via Playwright with screenshot and interaction evidence.
- **threshold:** One automated path completes every listed action at 390×844 and 1440×900; saved state survives reload; validation errors prevent invalid activation; no external network is required after install.
- **result + evidencePath:** unevaluated; `.loop/runs/<verification-run>/evidence/ac-06.json`

### AC-07 — Accessibility and responsive behavior

- **assertion:** Pilot components remain keyboard-operable and free of automated critical/serious accessibility violations in both modes and representative viewports; the responsive dialog pattern uses its declared mobile replacement.
- **method:** browser
- **capability:** Playwright, axe, keyboard interaction, viewport inspection.
- **threshold:** Zero critical/serious axe violations across the declared matrix; documented keyboard flows pass; at ≤640 px the dialog fixture renders the declared drawer behavior and at ≥1024 px the dialog behavior.
- **result + evidencePath:** unevaluated; `.loop/runs/<verification-run>/evidence/ac-07.json`

### AC-08 — Reusable-rule promotion remains human-controlled

- **assertion:** A recorded correction can become a candidate, but no candidate becomes active without an explicit owner-approved status transition.
- **method:** code
- **capability:** State-machine tests and fixture audit.
- **threshold:** Direct candidate-to-active mutation without approval receipt is rejected; approved fixture preserves provenance, owner response, and timestamp.
- **result + evidencePath:** unevaluated; `.loop/runs/<verification-run>/evidence/ac-08.json`

### AC-09 — Documentation and agent handoff

- **assertion:** A fresh coding agent can discover the source-of-truth files, retrieve one contract/theme, apply a valid structured change, and run the relevant verification command from repository instructions.
- **method:** rubric
- **capability:** Fresh-context verifier with filesystem and command execution.
- **threshold:** 5/5 rubric items pass with cited files and command output: discovery, targeted retrieval, valid mutation, invalid-mutation rejection, verification execution.
- **result + evidencePath:** unevaluated; `.loop/runs/<verification-run>/evidence/ac-09.json`

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
