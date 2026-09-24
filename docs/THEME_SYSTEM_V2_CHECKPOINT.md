# Theme System v2 — producer checkpoint

Phase: `theme-system-v2-default-live-controls-001` · contract: `docs/THEME_SYSTEM_V2_IMPLEMENTATION_CONTRACT.md`
Branch: `loop/theme-system-v2-default-live-controls-001` · prepared base `f3f1812` · accepted base `2ffaf6d`

Provider-neutral. A continuation reads this file, the contract, and `git log f3f1812..HEAD`; completed units are
not replayed.

## Current state

- HEAD: see `git log -1` (this file is committed with each unit; the unit table records each unit's commit).
- Unit in progress: none between units.
- Next safe action: Unit 4 — write `e2e/theme-v2-live-controls.spec.ts` (already registered in `playwright.workbench.config.ts` and ignored by `playwright.config.ts`) and update the Workbench specs that still drive the removed Apply-edit/Apply-setting controls or assume a fresh `quiet-editorial`.

## Units

| Unit | Scope | Status | Commit |
| --- | --- | --- | --- |
| 1 | Core Theme v2: colour normalization, strict v2 schema, v1 migration, Default fixture + conversion report, renderer, five new operations, context/provenance | done | `a358417` |
| 2 | Slider + Collapsible public resources (component, contract, constraints, retrieval kind, provenance, registry, stories, Storybook e2e) | done | `812ef48` |
| 3 | Workbench: Default fresh state, built-in selection persistence, live Typography/Other controls, live colour input, staged-proposal lock | done (code + unit tests; browser specs in unit 4) | `git log --grep "live manual controls"` |
| 4 | Workbench/browser specs (both viewports, light/dark, keyboard/pointer, reduced motion, containment, decoded axe), docs, full regression | next | — |

## Criteria

| Criterion | Status | Evidence so far |
| --- | --- | --- |
| TSV2-01 strict canonical v2, v1 migration | core done | `theme.test.ts`, `migrate.test.ts`, `context.get.test.ts` |
| TSV2-02 Default exact + conversion report | done | `default.test.ts` (contract values typed independently), `fixtures/default.conversion.json` |
| TSV2-03 Quiet Editorial selectable, migrates, character preserved | core done; Workbench selection in unit 3 | `migrate.test.ts`; golden `quiet-editorial.css` |
| TSV2-04 fresh = Default, persisted selection kept | pending (unit 3) | |
| TSV2-05 four colour families -> canonical OKLCH | done | `color.test.ts`, `mutation.v2.test.ts` |
| TSV2-06 sans/serif/mono + tracking render/export | core done | `theme.test.ts` render tests |
| TSV2-07 radius/spacing/shadow tiers + profile derivation | core done | `default.test.ts`, `mutation.v2.test.ts` |
| TSV2-08 Slider | resource done; Workbench use in unit 3 | `e2e/slider.spec.ts` 10/10 (both viewports), `foundation.test.ts`, `component-state` fixtures, `context.get.test.ts` |
| TSV2-09 Collapsible | resource done; Workbench use in unit 3 | `e2e/collapsible.spec.ts` 8/8, same unit tests |
| TSV2-10 Workbench controls, no manual Apply | pending (unit 3) | |
| TSV2-11 live computed styles; invalid drafts inert | pending (units 3-4) | |
| TSV2-12 persistence/fork/save/export/reload/v1 migration | pending (unit 3) | |
| TSV2-13 proposal lifecycle unchanged alongside manual editing | pending (unit 3) | |
| TSV2-14 catalog exactly 13 | done (catalog); scans in unit 4 | `contracts.test.ts`, `context.list.test.ts`, `foundation.test.ts` registry names, `shadcn build` 13 items |
| TSV2-15 full regression + browser matrix | pending (unit 4) | |

## Design decisions (unit 1)

- **Shape.** v2 is `schemaVersion: "2.0"`, `$schema: .../theme-2.json`, and moves colours to `colors.{light,dark}.<token>`
  as the contract names them. DTCG `{ $type, $value }` token wrappers are kept. `COLOR_TOKENS` gains
  `destructive-foreground` after `destructive`.
- **Normalization.** `packages/core/src/theme/color.ts`. Own anchored parser (culori is used only for colour-space
  maths because its parser silently clamps out-of-range input). Precision: L/C/H/A to 6 decimals, hue in [0,360) and 0
  for achromatic, alpha omitted at 1; gamut is Display P3 with 1e-4 tolerance (the contract's Default destructive
  value is P3 but just outside sRGB after rounding, so sRGB would reject the contract's own fixture). Named colours
  are rejected (only the four contracted families). Lengths: 4 decimals. The v2 schema *transforms* colour/length
  leaves, so `validateTheme` returns canonical output from any supported spelling and is idempotent.
- **v1 migration.** `schema-v1.ts` is the frozen v1 schema (grammar byte-identical to the accepted one);
  `migrate.ts` declares every added value in `V1_MIGRATION_DEFAULTS`. `radius.base` = v1 `md` (v1 rendered `--radius`
  from `md`). Tiers v1 could not express (`radius.xl`, shadow `2xs`/`xs`/`xl`/`2xl`) take the Tailwind v4.3.3 defaults
  those themes actually rendered, so Quiet Editorial's rendered look is unchanged; shadow `default` copies v1 `sm`.
- **Renderer.** Adds `--font-family-serif`, `--tracking-base` (+ `@theme inline --tracking-normal`), `--radius` from
  `radius.base`, `--radius-scale-xl`, eight `--shadow-layers-*` tiers (`default` -> Tailwind `--shadow`), and one
  `@layer base { body { letter-spacing: var(--tracking-base) } }` rule so tracking applies from the rendered CSS alone.
- **Operations.** Added exactly `setFontFamily`, `setTracking`, `setRadiusBase` (derives sm = base-0.25rem,
  md = base-0.125rem, lg = base, xl = base+0.25rem, clamped at 0), `setSpacingBase`, `setShadowProfile` (derives all
  eight tiers; tweakcn-style: 2xs/xs alpha x0.5, sm/default/md/lg/xl add a fixed second layer, 2xl alpha x2.5 capped
  at 1). The profile is read back from `shadow.default[0]` — no parallel store. One new rule id:
  `mutation.invalid-family`. `setColor` now accepts the four families and stores canonical OKLCH. Bounds are in
  `MANUAL_CONTROL_BOUNDS` (`theme/derive.ts`), shared with the Workbench.
- **Existing ops preserved.** `setRadius` still targets `radius.md` (now rendered only as `--radius-md`; `--radius`
  follows `radius.base`). `mutation.missing-target` is retained but unreachable from a valid v2 theme (tiers are
  non-empty).
- **Chrome/Storybook golden.** `packages/ui/src/styles/globals.css` still imports the Quiet Editorial golden, so the
  Workbench chrome and Storybook keep their accepted look; the Workbench preview receives the active theme at runtime.
  A Default golden (`fixtures/default.css`) is committed for render determinism.
- **Context.** `personal-ui-context/1` unchanged; identity reports theme schema `2.0`; themes are `default` and
  `quiet-editorial`; `theme:default` provenance entry added.

## Design decisions (unit 2)

- Components import the pinned standalone packages `@radix-ui/react-slider` / `@radix-ui/react-collapsible` (as the
  prepared base linked them), not the `radix-ui` umbrella. Registry items declare `@radix-ui/react-slider@1.4.7` and
  `@radix-ui/react-collapsible@1.1.20`.
- Slider's single adaptation of the shadcn source: `aria-label`/`aria-labelledby`/`aria-describedby`/`aria-valuetext`
  are forwarded to the Radix thumb (the `role="slider"` element) so the focusable control is named.
- Both are retrieval kind `component`. Constraint rules: `slider.accessible-name`, `slider.range`,
  `slider.visible-value`, `collapsible.trigger-name`, `collapsible.controls`, `collapsible.hidden-error`.
- Radix Collapsible unmounts closed content (no `forceMount`), so collapsed controls leave the tab order and tree.

## Design decisions (unit 3)

- **Built-ins and selection.** `lifecycle.ts` `loadBuiltInThemes()` = [Default, Quiet Editorial]. Storage key is
  unchanged (`personal-ui-workbench/v1`) so existing saved themes load (v1 themes migrate on read). `activeId` is now
  the persisted *selection* and may name a built-in; `saveSelection` writes only the selection. Fresh or
  invalid/removed selection falls back to Default. A saved theme using a built-in id is ignored (built-in wins).
  `bases` records each saved fork's built-in baseline so the baseline diff survives reload.
- **Built-ins are never saved.** Save refuses every built-in id (`workbench.save.reserved-id`); edited built-ins show
  status `edited built-in, fork to save`. Manual edits never write storage; Save stays explicit.
- **One manual path.** `App.applyManual`: control value -> `ThemeOperation` -> `editTheme` (core `applyMutation`) ->
  active in-memory theme -> preview. No Apply button. Rejected values return issues and change nothing; an edit that
  changes no token creates no revision. Builds against a ref of the latest theme so rapid slider events never use a
  stale base. Blocked (`workbench.manual.locked`) and every control disabled while a proposal is staged or a command is
  evaluating; a visible note says so. Proposal stage/preview/Apply/Discard/stale code is untouched.
- **Controls.** `controls.ts` (models, all bounds from core `MANUAL_CONTROL_BOUNDS` except density 0.5-2 / motion
  0-1000ms) and `LiveControls.tsx` (`ControlSection` = Collapsible, `LiveNumberField` = Slider + numeric Input +
  visible unit, `LiveTextField`). Typography: Font families (sans/serif/mono stacks) + Letter spacing. Other: Radius,
  Spacing (base + existing density), Shadow (colour, opacity, blur, spread, offset X/Y), Motion (existing duration).
  Colours: the existing token select plus a live `Color value` field accepting the four families with a
  `Stored as <canonical>` note. The superseded single-target Radius (md) / Shadow blur (md) settings UI is removed;
  those operations remain in core (Design Command recipes use them).
- **Invalid drafts.** Numeric drafts that are not a finite in-range number stay in the field with a visible error and
  never reach core; text drafts that core rejects stay local with the rule id. A section holding an invalid draft is
  forced open (`collapsible.hidden-error`). Fields resync to the canonical value on blur unless the draft is invalid.
- `settings.ts` was removed (replaced by `controls.ts`).

## Environment / dependency provenance

- No install and no network. This worktree had no `node_modules`; it links the main checkout's already-installed
  pnpm store (`/Users/emmantalob/dev/personal-ui-system/node_modules/.pnpm`) with per-package `node_modules`
  directories whose workspace links (`@personal-ui/*`) point back into this worktree. `node_modules/` is gitignored.
- Pinned by the prepared base and present in the store: `culori@4.0.2` (core), `@radix-ui/react-slider@1.4.7`,
  `@radix-ui/react-collapsible@1.1.20` (ui). `pnpm-lock.yaml` unchanged by this phase so far.
- culori ships no types and `@types/culori` is not installed: `packages/core/src/theme/culori.d.ts` declares only the
  `converter` signatures used.

## Commands and results

| Unit | Command | Result |
| --- | --- | --- |
| baseline | `vitest run` at `f3f1812` | 31 files, 420 passed |
| 1 | `vitest run packages/core` | 474 passed |
| 1 | `vitest run` (all) | 503 passed, 2 failed — both in `apps/workbench/src/lifecycle.test.ts` (old `#fff` rejection and v1 shadow shape); rewritten in unit 3 |
| 1 | `tsc --noEmit` core, ui, workbench; `tsc -p e2e`; `tsc -p tools/loop/jev` | pass |
| 2 | `vitest run packages` | 505 passed |
| 2 | `shadcn build` | 13 items built (`public/r`, gitignored) |
| 2 | `storybook build -c packages/ui/.storybook -o storybook-static` | success |
| 2 | `playwright test` (Storybook config, 390x844 + 1440x900) | 58 passed (40 existing + 18 new Slider/Collapsible) |
| 3 | `vitest run` (all) | 34 files, 544 passed |
| 3 | `tsc --noEmit` workbench; `vite build` workbench | pass; build ok (pre-existing >500 kB chunk warning) |

## Unresolved defects / open items

- e2e specs still reference the v1 Workbench flow (Apply buttons, fresh `quiet-editorial`); updated in units 3-4.
- `packages/core/README.md` / `docs/AGENT_CONTEXT_RETRIEVAL.md` theme-format prose to refresh in unit 4.
