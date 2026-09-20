# Technical Spike 001 — V1 Source Boundaries

**Recommendation:** make V1 a three-workspace monorepo: `packages/core`,
`packages/ui`, and `apps/workbench`. `core` is the only canonical data and
policy package; `ui` is the canonical pilot component source plus its
shadcn-facing metadata; the workbench is a replaceable local consumer. Keep
Storybook and shadcn-generated files as supporting build/test/distribution
artifacts. This is the smallest shape that proves AC-01 through AC-07 without
making a preview tool, a registry, or a model conversation authoritative.

This is an architecture recommendation, not an implementation or a dependency
compatibility result. The dependency-backed experiment at the end must pass
before the stack is admitted.

## Exact V1 boundaries and dependency direction

```text
packages/core  <-  packages/ui  <-  apps/workbench
       ^                  ^                ^
       |                  |                |
  Node/Vitest          Storybook      browser storage
  contract client      (supporting)   (ephemeral only)

packages/core  <-  scripts/verify-boundaries (development-only consumer)
```

`packages/core` is framework-free TypeScript. It contains these source modules
in one package, rather than prematurely publishing five packages:

- `theme`: the versioned theme schema, fixtures, validator, deterministic CSS
  renderer, and DTCG-shaped export adapter.
- `contracts`: versioned per-item component/pattern contracts, a keyed lookup,
  and their validator.
- `constraints`: stable rule IDs and pure checks over a theme, contract, and
  mutation candidate.
- `mutations`: the closed operation union, candidate/result/provenance types,
  preview/apply functions, and validation ordering.

`packages/ui` contains the Button, Input, and responsive Dialog/Drawer
composition. It may depend on React, Radix/shadcn dependencies, Tailwind, and
`@personal-ui/core`; it must not make `core` depend on any of them. Component
source and its small authored `component-id -> shadcn primitive/registry-item`
metadata are canonical. The Dialog/Drawer item is one pattern contract and one
public component entry point, which selects its declared primitive at the
declared breakpoint; it is not two competing agent-facing contracts.

`apps/workbench` consumes the public exports of both packages. It owns routes,
preview state, viewport/mode controls, and browser persistence for unsaved UI
state. A saved named theme is serialized through `core` and written/exported as
an ordinary portable theme file; browser storage is never a source of truth.

Only these arrows are allowed:

- `ui -> core`; `workbench -> ui, core`; stories/test harnesses -> `ui, core`.
- No `core -> ui`, `core -> workbench`, `ui -> workbench`, or package ->
  Storybook import.
- The CSS renderer in `core` returns text/data only. It does not import a
  Tailwind plugin, React, a filesystem API, or a workbench persistence API.

This gives AC-01 a mechanical check: scan package import graphs and run
`core`'s tests in Node with neither `ui` nor `workbench` installed as runtime
imports. It also leaves room to split `core` later only after separate release
or ownership needs appear.

## Canonical theme schema and mapping boundary

The canonical file is a project-owned, versioned JSON document with a
DTCG-shaped *token leaf* (`$type`, `$value`) but an explicit personal-system
envelope. It is not represented as generated CSS, a shadcn preset, or a
claim of complete DTCG conformance.

```json
{
  "$schema": "https://personal-ui.local/schema/theme-1.json",
  "schemaVersion": "1.0",
  "kind": "personal-ui-theme",
  "id": "quiet-editorial",
  "name": "Quiet Editorial",
  "revision": 1,
  "modes": {
    "light": { "color": { "background": { "$type": "color", "$value": "oklch(0.99 0.002 250)" } } },
    "dark": { "color": { "background": { "$type": "color", "$value": "oklch(0.16 0.01 250)" } } }
  },
  "typography": { "sans": { "$type": "fontFamily", "$value": ["Inter", "sans-serif"] } },
  "radius": { "md": { "$type": "dimension", "$value": "0.5rem" } },
  "space": { "density": { "$type": "number", "$value": 1 }, "4": { "$type": "dimension", "$value": "1rem" } },
  "shadow": { "card": { "$type": "shadow", "$value": [] } },
  "motion": { "durationFast": { "$type": "duration", "$value": "150ms" }, "reducedMotion": { "$type": "string", "$value": "reduce" } },
  "$extensions": { "personal-ui-system": { "displayName": "Quiet Editorial" } }
}
```

The schema requires both modes and fixed, complete V1 semantic color sets:
`background`, `foreground`, `card`, `card-foreground`, `popover`,
`popover-foreground`, `primary`, `primary-foreground`, `secondary`,
`secondary-foreground`, `muted`, `muted-foreground`, `accent`,
`accent-foreground`, `destructive`, `border`, `input`, `ring`, and `chart-1`
through `chart-5`. It also requires the six brief categories: colors,
typography, radius, spacing/density, shadows, and reduced-motion-aware motion.
The actual schema should close token names and value types; it must reject raw
CSS declarations, arbitrary custom-property names, aliases/cycles, and unknown
top-level extension data except the namespaced extension above.

`renderShadcnTailwindCss(theme)` is the sole mapping boundary. It deterministically:

1. emits light semantic values in `:root` and dark values under `.dark` using
   shadcn-compatible custom-property names such as `--background` and
   `--primary`;
2. emits fixed Tailwind v4 `@theme inline` aliases such as
   `--color-background: var(--background)`, font, radius, shadow, spacing, and
   motion aliases; and
3. emits one `@media (prefers-reduced-motion: reduce)` override from the
   declared motion policy.

The renderer has a closed table from canonical paths to CSS variables. It
cannot emit arbitrary declarations. A theme/preset importer or exporter is an
adapter around this API: shadcn consumes CSS/preset-compatible values; DTCG
receives the token leaves plus namespaced metadata. Mode placement and density
policy are personal-system semantics, so V1 must say “DTCG-shaped/exportable,”
not “DTCG conformant,” until round-trip fixtures prove the appropriate profile.

## Contracts, mutations, and deferred agent seams

Each contract is a separate keyed file or keyed record retrievable by
`getContract(id)`; the catalog index contains only IDs and paths. The returned
validated contract has exactly the brief-required fields:
`id`, `purpose`, `use`, `avoid`, `variants`, `responsiveBehavior`,
`accessibility`, `composition`, `examples`, `mistakes`, `mobileReplacement`,
and `constraints`. Enforce the AC-04 8 KiB serialized limit on this response,
not by truncating it at runtime. Contracts describe selection and hard
requirements; they do not contain theme values, CSS, or prose from a model.

Mutations are a discriminated, closed union—not JSON Patch and not a generic
JSON Pointer. V1 defines one typed operation per editable domain, for example:

```ts
type ThemeOperation =
  | { op: "setColor"; mode: "light" | "dark"; token: ColorToken; value: Oklch }
  | { op: "setTypography"; token: TypographyToken; value: FontFamily | Dimension }
  | { op: "setRadius"; token: RadiusToken; value: Dimension }
  | { op: "setSpace"; token: SpaceToken; value: Dimension | Density }
  | { op: "setShadow"; token: ShadowToken; value: Shadow }
  | { op: "setMotion"; token: MotionToken; value: Duration | ReducedMotionPolicy };

type MutationRequest = {
  schemaVersion: "1.0";
  requestId: string;
  base: { themeId: string; revision: number };
  intent?: { source: "workbench" | "future-agent"; summary: string };
  operations: readonly ThemeOperation[];
};
```

`validateMutation` performs schema/type checks, path allowlisting, capability
checks, then deterministic constraints before `previewMutation` returns a
candidate theme plus CSS and before `applyMutation` creates the next revision.
Failures carry a stable rule ID and canonical path. There is no operation for
raw CSS, an arbitrary file/path, a contract edit, a constraint edit, rule
promotion, or a direct browser-storage write.

The future language pipeline feeds this same request shape. Its adapter can
attach candidate provenance (`commandId`, model/provider metadata, source
excerpt hash, timestamp) outside the theme itself. After deterministic
filtering, a `MutationCandidateSet` contains only valid requests and a
reproducible validation report. When multiple candidates remain and selection
is genuinely probabilistic, it can produce a narrow Jev packet containing
candidate IDs, their permitted diffs, applicable contract IDs/rule IDs, and a
fixed `Choice`/`Score`/`Noul` question. Jev can select only an offered ID;
selection is recorded, then normal apply runs. One admissible candidate bypasses
Jev. No Jev client, LLM client, or natural-language input is in V1.

## Generated and supporting artifacts

Canonical artifacts are `core` schemas/data/validators/renderer, `ui` source,
and authored component-to-primitive metadata. These are reviewed and versioned.

Supporting artifacts are:

- shadcn CLI scaffolding/configuration (`components.json`), copied primitive
  files, and the built registry JSON/output. They are regenerated or validated
  from canonical `ui` source/metadata; the registry is a distribution surface,
  not the contract store.
- Storybook configuration, generated manifests, static Storybook output, and
  Storybook MCP/preview data. Colocated stories are executable examples and
  verification fixtures, not component-contract authority.
- generated theme CSS, workbench browser storage, screenshots, test reports,
  and Playwright traces.

If a generated shadcn primitive needs a local adaptation, retain it as normal
reviewed `ui` source and record its upstream primitive dependency; do not edit
the build output. The source-inspection check for AC-02 must verify that no
pilot reimplements focus trapping, roving focus, or dialog dismissal.

## Alternatives rejected

1. **One package per concern now.** It creates internal versioning and import
   overhead before V1 proves independent consumers. Modules inside `core` keep
   the same ownership boundaries and can split later.
2. **A DTCG-native schema as the whole model.** DTCG is useful exchange shape,
   but it does not own responsive replacement, personal density policy, or
   contracts; its current status also does not justify a conformance claim.
3. **shadcn preset/CSS as canonical theme data.** It loses portable metadata,
   typed constraints, deterministic mutation addressing, and the full V1
   categories.
4. **Storybook manifest/MCP as contract retrieval.** Research identifies these
   APIs as preview/unstable; they cannot be the only durable agent contract.
5. **Generic JSON Patch or CSS text mutation.** Either permits addresses beyond
   the declared authority and fails AC-05's no-arbitrary-CSS/files requirement.
6. **Two independent Dialog and Drawer contracts.** It makes responsive
   selection ambiguous to agents; one pattern contract with a hard replacement
   is the intended V1 behavior.

## Risks and controls

| Risk | Control / decision gate |
| --- | --- |
| Current shadcn registry or generated files do not support this monorepo layout | Run the experiment below against installed public CLI/schema behavior; do not rely on undocumented internals. |
| Tailwind v4/shadcn CSS conventions drift | Pin admitted versions, snapshot byte-identical renderer output, and test generated CSS in the component fixture. |
| DTCG mode/extension interpretation differs between tools | Keep the personal envelope canonical, namespace metadata, and test only the declared export profile. |
| A thin workbench becomes a second state store | Route save/load through `core`; treat browser storage as cache/UI state only. |
| Future agent plumbing gains excessive authority | Keep closed mutation operations and deterministic filtering; defer model/MCP clients. |
| Storybook preview APIs change | Use stories for verification only and retain contract lookup from `core`. |

## Next dependency-backed experiment for the Lead

Run this as one throwaway vertical slice after normal dependency admission; it
is intentionally the smallest test of the architecture, not a workbench build.
The Lead, not this spike, may install dependencies.

```sh
pnpm --version
node --version
pnpm add -Dw typescript vitest vite @vitejs/plugin-react tailwindcss @tailwindcss/vite storybook @storybook/react-vite @storybook/addon-a11y @storybook/test @playwright/test axe-core @axe-core/playwright
pnpm add -w react react-dom @radix-ui/react-dialog @radix-ui/react-slot class-variance-authority clsx tailwind-merge zod
pnpm dlx shadcn@latest init --cwd packages/ui
pnpm dlx shadcn@latest add button input dialog drawer --cwd packages/ui
pnpm exec shadcn build --cwd packages/ui
pnpm exec vitest run packages/core
pnpm exec storybook build -c packages/ui/.storybook
pnpm exec playwright test --project=chromium
```

Before the last four commands, create only: (a) a valid and invalid theme
fixture using the schema above, (b) a one-operation `setColor` fixture and a
rejected raw-CSS/unknown-operation fixture, (c) three component/pattern
contracts, (d) a Button and responsive Dialog/Drawer story, and (e) a boundary
test that rejects imports from `apps/workbench` into `packages/core`.

**Pass evidence:** every command exits zero; the registry build validates all
three pilot items using the installed public behavior; `core` runs without a
React/workbench import; valid theme -> CSS output is byte-identical on two
runs; invalid/raw-CSS mutation reports a stable rule ID/path; Storybook builds;
and Playwright at 390x844 observes Drawer at `<=640px` while 1440x900 observes
Dialog, with zero critical/serious axe findings for the fixture. Preserve the
command output, package lockfile versions, generated registry validation
report, CSS hashes, and browser reports as evidence.

**Fail evidence:** a non-zero command, an undocumented-only registry path, an
unrepresentable required token, a prohibited reverse import, failure to render
the responsive primitive pattern, or a critical/serious axe finding blocks
stack admission. Record the exact installed versions and raw output; do not
paper over a failure by making Storybook, the registry, or generated CSS
canonical.

## Traceability

- **Brief:** V1 product contract items 1–7; Architecture direction; Design
  boundaries; Future natural-language design-command pipeline; AC-01 through
  AC-07 and AC-09; current owner choices.
- **Research findings:** findings 1–6, especially shadcn as distribution
  substrate, semantic CSS-variable/Tailwind mapping, Storybook preview API
  instability, DTCG's candidate-recommendation status, and focused MCP
  resources/tools.
- **Preflight checkpoint:** the admitted worker route is non-escalating and
  network-free; this document therefore specifies a Lead-run future experiment
  and makes no dependency installation or external call.
