# Producer report — accepted-implementation-review-inset-tabs-v1-001

Producer: Claude Opus 5.5, concurrency 1, $0, no network, no dependency install, no agents/schedules. Base
`4baca4f412124dab4fdf16736d67723db9044518`. AIR-01 findings checkpoint: `e8c1ede` (`findings.md`,
`tailwind-inset-ring-probe.{mjs,txt}`), committed before any product source edit. Producer self-checks below are not
acceptance; Lead owns exact-candidate browser evidence and a fresh protected verifier follows.

## Changes (candidate commit follows `e8c1ede`)

| Path | Reason |
|------|--------|
| `packages/core/src/theme/render.ts` | PUI-133 / AIR-03: `TABS_LIST_RING` now emits the locally verified `inset-ring-1 inset-ring-border/80` declarations (`--tw-inset-ring-shadow: inset 0 0 0 1px var(--tw-inset-ring-color, currentcolor)`, `--tw-inset-ring-color: color-mix(in oklab, var(--border) 80%, transparent)`) with the unchanged Tailwind composition. The outer `--tw-ring-*` slot is no longer set. Doc comment updated. Nothing else in the module changes (guarded). |
| `packages/core/src/theme/schema.ts` | F1: comment-only ("surface TabsLists", not "active surface Tabs"). Comment-stripped source is byte-identical to base (guarded). |
| `apps/workbench/src/PreviewFrame.tsx` | F2: comment-only (list, not active trigger, takes the edge). Guarded as comment-only. |
| `apps/workbench/src/workbenchTabs.ts` | F3: comment-only. Guarded as comment-only. |
| `packages/core/src/theme/ui-effects.test.ts` | Directly superseded exact-rule assertion and property set; adds a check that the TabsList rule sets no outer `--tw-ring-*` variable. |
| `e2e/tactile-ui-effects.spec.ts` | F4: `listRing` now requires one inset 1px layer and no outer 1px layer (the redundant first regex disjunct is gone); Off uses `anyListRing` (no 1px layer of either kind). Header notes PUI-133. |
| `e2e/amber-dusk-shell-refinement.spec.ts` | F4: the Tactile reading requires the inset 1px layer and rejects an outer one. Width/height/background invariance, `--border` 80% colour, Strength invariance and keyboard/focus checks are unchanged. |
| `e2e/ui-effects-showcase-polish.spec.ts` | F4: `ring` requires the inset 1px layer. |
| `tools/verify-accepted-implementation-review-inset-tabs.mjs` | Phase-local offline boundary guard (packet/contract integrity, scope, comment-only files, exact TabsList declarations vs. the Tailwind probe, render.ts unchanged outside `TABS_LIST_RING`, Tabs/Button/package.json/lockfile unchanged, registry 23, Theme 3.0, 13 operations). |
| `docs/evidence/…/producer/candidate-core-resolution/*` | Evidence tooling for the resolution hazard below (not product config). |

Not changed: Theme schema/version, persistence, history/reset, import/export, Design Command (including
`capability-descriptions.ts`), mutation operations, registry, public components (`tabs.tsx`, `button.tsx`),
dependencies/lockfile, Secondary recipe, selectors, trigger styling, focus-visible rings, line Tabs.

## Environment hazard (important for Lead and verifier)

The worktree's `node_modules` and `apps/workbench/node_modules` are symlinks into the canonical checkout, where the
`@personal-ui/core` workspace link resolves to `/Users/emmantalob/dev/personal-ui-system/packages/core` (**canonical
source, not this worktree**). `@personal-ui/ui` is unaffected (Vite alias and tsconfig `paths` point at the worktree).
Consequently a plain `vite build` / Workbench `tsc` / Workbench vitest run in this worktree silently exercises the
canonical core. Observed: the first plain build's bundle still contained the old
`--tw-ring-shadow: var(--tw-ring-inset,) 0 0 0 calc(1px …` and the focused browser run failed 12/14 on the new
inset assertions (a useful negative control: the tightened assertions reject the outer ring). No canonical file was
read for content or written; only module resolution followed the symlink.

`candidate-core-resolution/` pins every `@personal-ui/core` export to this worktree without touching product config:

- `vite.workbench.config.mjs` — `cd apps/workbench && ../../node_modules/.bin/vite build --config ../../docs/evidence/accepted-implementation-review-inset-tabs-v1-001/producer/candidate-core-resolution/vite.workbench.config.mjs`
- `vitest.config.mjs` — `./node_modules/.bin/vitest run --config <dir>/vitest.config.mjs <files>`
- `tsconfig.workbench.json` — `./node_modules/.bin/tsc -p <dir>/tsconfig.workbench.json`
- `resolution-check.mjs` — prints `@personal-ui/core -> …/accepted-implementation-review-inset-tabs-v1-001/packages/core/src/index.ts` and the posted TabsList rule.

Bundle check after the override build: `grep -c "tw-inset-ring-shadow: inset 0 0 0 1px" apps/workbench/dist/assets/index-*.js` → 1;
old outer-ring declaration → 0.

## Checks run (all offline, `COREPACK_ENABLE_NETWORK=0`)

| Check | Result |
|-------|--------|
| Tailwind probe (`tailwind-inset-ring-probe.mjs`, installed 4.3.3) | declarations recorded in `tailwind-inset-ring-probe.txt` |
| `tsc --noEmit` in `packages/core` | pass |
| Workbench typecheck with worktree core (`tsc -p …/tsconfig.workbench.json`; trace shows worktree resolution) | pass |
| `tsc -p e2e --noEmit` | pass |
| Targeted unit (vitest, override config): `ui-effects`, `amber-dusk`, `sidebar-tokens`, `mutation.v2` (core); `uiEffects`, `amberDusk`, `lifecycle`, `previewViews` (workbench) | 8 files, 242 passed |
| Workbench build (override config) | built; bundle contains candidate declarations |
| Producer browser self-check (`playwright.workbench.config.ts`, 1 worker, port 5391, both projects): ADSR-04 ×4 (default/amber-dusk × light/dark), TUE-05/06, TUE-05 focus, IESP-06 | 14/14 passed on the candidate bundle (12/14 failed on the canonical-core bundle before the override, as expected) |
| Phase guard `node tools/verify-accepted-implementation-review-inset-tabs.mjs` | run after commit (see final report) |
| Prior guards `verify-tactile-border-designsystem-type.mjs`, `verify-amber-dusk-shell-refinement.mjs` | already fail at the clean base on `BRIEF.md` scope (F11); left unchanged, not relabelled |

Not broadened: the only runtime change is one rule's declarations in the Tactile block; no shared runtime/component
infrastructure refactor was selected, so the full Workbench/Storybook suites were not run by the producer.

## Residuals

- F5 deferred (redundant render/parse in `previewVariablesCss`).
- The `tactile()` e2e predicate (`backgroundImage` gradient **and** `inset` shadow) is applied only to triggers/buttons;
  a TabsList now carries an `inset` layer but no gradient, so it still reads non-tactile. Noted for future spec authors.
- Lead-owned: exact-candidate Off/Tactile, Strength invariance, Amber Dusk light/dark border colour, inward edge and
  clipping visuals, focus/keyboard/selected state, decoded axe — using the override build (or an equivalent that
  proves worktree core resolution).
