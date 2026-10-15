# Tactile Border and Design System Type — Phase Contract

Phase `tactile-border-designsystem-type-v1-001` admits **PUI-129 and PUI-131 together** as one low-end Tier 2 phase. Accepted product base: `5ea846de50c9206fcb7a9e16d3bdf441d1d48d8a`; accepted BRIEF/control base: `fc71295ff636594302f55aeb87953942936ee43f`. The shared Theme CSS renderer is touched, but only its decorative surface TabsList rule changes. The Colors preview change is presentation-only. The frozen admission packet is `docs/evidence/tactile-border-designsystem-type-v1-001/linear/snapshot-hashes.json` (SHA-256 `25d1d269c5ecfe3dfb479f4649d040bda1e8eb47436f9a5d5f87d321ac2d6fae`). This contract resolves source/ticket conflicts; later Linear edits do not alter execution.

## Product scope

1. **PUI-129:** In generated UI Effects CSS, Tactile surface-style TabsList uses exactly the decorative equivalent of `ring-1 ring-border/80` (1px Tailwind ring slot, semantic `--border` at 80%). The runtime CSS is not Tailwind-processed, so equivalent declarations are expected. Off emits no extra decorative ring. Strength never affects the TabsList rule. Selected surface TabsTrigger remains default shadcn styling; line/minimal Tabs are excluded. Secondary Button tactile styling and Strength mapping remain unchanged. Actual focus-visible indicators continue using `--ring`; do not globally replace focus ring semantics. Preserve dimensions, layout, keyboard, focus, disabled and selected behavior. Amber Dusk's chromatic `ring` token must not color this decorative edge.
2. **PUI-131:** In Design system → Colors preview, semantic color group headings become `text-sm`, retaining uppercase, base foreground, current weight, spacing, group order and structure. Token labels remain title case at their smaller supporting size. HEX values, swatches, two-column pairing, Colors/Type scale section headings, Sidebar display-label mapping, actual token keys and CSS variables stay unchanged.
3. **Boundaries:** Theme v3 remains `3.0`; UI Effects persistence, history/Reset, import/export, Design Command Preview/Apply/Discard, public component APIs, exactly 13 mutation operations and 23 registry resources remain unchanged. No dependency, lockfile, network, credential, paid, or external publishing change. Existing test/guard expectations may be updated only for the two superseded visual assertions. Frozen historical packets, contracts, checkpoints and receipts are immutable.

## Verification and gates

- **TBDS-01:** Both full Todo ticket snapshots, metadata, comments/attachments state, references, timestamps and hashes match the one frozen packet and this separately hashed contract.
- **TBDS-02:** Focused source/unit/browser evidence proves Tactile TabsList border/80, Off removal, Strength invariance, Amber Dusk light/dark restrained edge, unchanged semantic ring focus treatment and keyboard/selected behavior.
- **TBDS-03:** Focused Colors preview evidence proves `text-sm` uppercase foreground group headings, unchanged title-case label size/HEX/swatches/order/two-column layout, and narrow/wide containment.
- **TBDS-04:** Touched-package typechecks, targeted unit/component tests, and a Workbench build for browser execution pass. Lead owns exact-candidate focused browser evidence. Do not repeat unrelated full regression suites unless the source diff reveals a wider blast radius; explain any expansion.
- **TBDS-05:** Source/contract/boundary audit confirms Theme `3.0`, 13 mutations, 23 resources and no public schema, persistence, dependency, network or focus-ring regression.
- **TBDS-06:** Fresh protected opposite-family STANDARD verifier audits the unchanged exact candidate and Lead evidence, logically read-only with pre/post Git integrity and no repair. Producer self-checks are not acceptance.
- **TBDS-07:** Lead records acceptance before local fast-forward promotion, then verifies promoted identity, clean state and focused smoke before durable closeout. No remote push or automatic owner visual gate.

## Likely edit surface

`packages/core/src/theme/render.ts`, `apps/workbench/src/DesignSystemPreview.tsx`, and direct unit/browser assertions. This guidance grants no unrelated scope.
