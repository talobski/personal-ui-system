# Research Findings

Research date: 2026-09-20

Scope: existing approaches relevant to a local, agent-native personal UI system. Primary/official sources were preferred; tweakcn's own repository is used for its claims.

## Findings that affect V1

### 1. shadcn is already a distribution and agent-integration substrate

shadcn registries can distribute components, hooks, configuration, docs, rules, workflows, design tokens, and MCP configuration—not only React components. Registries have public schemas, local load/resolve APIs, item validation, dependencies, namespaces, and GitHub-backed distribution.

Implication: use a shadcn-compatible registry for consumable code/assets. Do not invent a separate package-delivery protocol in V1.

Sources:

- https://ui.shadcn.com/docs/registry/getting-started
- https://ui.shadcn.com/docs/registry/api-reference
- https://ui.shadcn.com/docs/registry/github
- https://ui.shadcn.com/docs/registry/namespace
- https://ui.shadcn.com/docs/registry/mcp

### 2. first-party shadcn now overlaps basic theme-builder scope

shadcn/create previews visual choices and emits presets; the CLI can encode/decode/resolve/apply presets and apply only theme or font portions. Current theming uses semantic CSS variables, OKLCH, light/dark selectors, and Tailwind v4 mappings.

Implication: interoperate with shadcn presets and CSS-variable conventions where practical. The personal theme schema should add personal semantics and portability, not merely recreate the stock preset picker.

Sources:

- https://ui.shadcn.com/docs/theming
- https://ui.shadcn.com/docs/cli
- https://ui.shadcn.com/docs/changelog/2025-12-shadcn-create
- https://ui.shadcn.com/docs/changelog/2026-04-preset-commands
- https://tailwindcss.com/docs/theme

### 3. tweakcn validates the visual-editor demand but is not the personal-rule layer

tweakcn is an Apache-2.0 local-capable visual editor for Tailwind/shadcn themes with presets and extensive customization. Its mature editor makes a full clone a poor V1 target.

Implication: borrow interaction ideas and evaluate interoperability later. Build only the editing controls needed to prove this project's structured state and contracts.

Source:

- https://github.com/jnsahaj/tweakcn

### 4. Storybook already covers component states, executable examples, manifests, tests, and MCP

Storybook treats stories as component test cases, supports interaction/accessibility/visual workflows, generates compact JSON component/docs manifests for agents, and exposes documentation/development/testing via MCP. The AI/MCP and manifest APIs are explicitly preview/unstable.

Implication: use Storybook stories as fixtures and leverage its workbench/MCP capabilities experimentally. Keep personal contracts in a stable project-owned schema so preview Storybook formats are replaceable.

Sources:

- https://storybook.js.org/docs/writing-tests
- https://storybook.js.org/docs/ai
- https://storybook.js.org/docs/ai/manifests
- https://storybook.js.org/docs/ai/mcp/overview

### 5. structured tokens have an emerging interoperable JSON format

The Design Tokens Community Group published the Design Tokens Format Module 2025.10 as a Community Group candidate recommendation. It defines JSON exchange for tokens but is not a W3C Standard.

Implication: keep the internal schema explicit and versioned; map cleanly to DTCG concepts where they fit. Do not claim full DTCG conformance until tests prove it, and do not let token interoperability dictate component/pattern rules that are outside token scope.

Source:

- https://www.designtokens.org/TR/2025.10/format/

### 6. MCP should expose focused resources/tools, not become the source of truth

MCP distinguishes application-controlled resources from model-controlled tools. shadcn and Storybook already expose relevant MCP integrations.

Implication: defer a custom MCP server. First create compact file/API retrieval and validated mutation operations; a later MCP adapter can expose those primitives without owning state.

Sources:

- https://modelcontextprotocol.io/specification/2025-06-18/server
- https://ui.shadcn.com/docs/registry/mcp
- https://storybook.js.org/docs/ai/mcp/overview

## Novelty worth building

- Personal, durable design rules separated from visual themes.
- Compact per-component/pattern contracts optimized for targeted agent retrieval.
- Deterministic admissibility and structured mutation boundaries.
- Human-approved promotion of repeated corrections into reusable rules.
- Typed Jev decision packets constrained by those rules.
- A workflow joining source data, preview, evidence, and agent use without making the UI or an MCP server canonical.

## Assumptions challenged

1. **“A custom visual workbench is the first product.”** Existing tools already cover much of it. The source-of-truth model is first; the V1 workbench should stay thin.
2. **“Agent chat is necessary to prove agent-first.”** Structured retrieval and safe mutation are the prerequisite. Chat before those exist encourages arbitrary CSS rewriting.
3. **“A custom MCP server is required.”** shadcn and Storybook already have MCP paths. A custom adapter is justified only after project-specific resources/tools stabilize.
4. **“All design knowledge belongs in theme tokens.”** Interaction, responsive replacement, accessibility, and composition rules need separate contracts and deterministic constraints.
5. **“Importing themes from old projects is mostly parsing CSS.”** Extraction needs provenance, semantic mapping, conflict handling, and owner review; it is a separate product slice.

## Open technical spike questions

- Can the current shadcn public APIs validate and build a local monorepo registry without relying on undocumented CLI internals?
- Is Storybook's current Vite/React MCP/manifest preview stable enough for optional local use without contaminating canonical schemas?
- What is the smallest theme schema that maps losslessly to shadcn semantic CSS while representing density/typography/shadow/motion?
- Should saved theme files use a DTCG-shaped token tree plus personal metadata, or a smaller project schema with an export adapter?
- Can a responsive Dialog/Drawer pattern remain one agent-facing contract while composing supported shadcn primitives?

