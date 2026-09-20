# Technical Spike 002 — Dependency-backed vertical slice result

Observed: 2026-09-20 (worktree `loop/technical-spike-002`, base `d893286`)

**Recommendation: ADMIT the stack** (TypeScript 7, React 19, Vite 8, Tailwind 4,
shadcn CLI 4.21, Storybook 10, Vitest 5, Playwright 1.63 + axe-core 4.13) for the
V1 vertical slice, with the limitations below recorded. Every command in the
slice exited zero. This is a worker's result against the spike's pass criteria,
not a verification of any brief acceptance criterion and not a project
completion claim.

## Environment and installed versions

Installed by the Lead (`corepack pnpm install --offline --frozen-lockfile`);
no dependency, lockfile, or network change was made by this spike.

| Item | Version |
| --- | --- |
| Node | v22.22.2 |
| pnpm (corepack) | 12.5.1 |
| typescript | 7.0.2 |
| vite / vitest | 8.3.0 / 5.0.1 |
| react / react-dom | 19.3.0 |
| tailwindcss / @tailwindcss/vite | 4.3.3 |
| shadcn (CLI) | 4.21.0 |
| storybook / @storybook/react-vite / addon-a11y | 10.6.0 |
| @playwright/test / playwright-core (Chromium 1243) | 1.63.0 |
| axe-core / @axe-core/playwright | 4.13.0 |
| serve | 14.2.6 |
| zod (core) | 4.6.5 |
| radix-ui / vaul / lucide-react | 1.6.7 / 1.1.2 / 1.47.0 |

## Commands and results

Run from the repo root, in order, from a clean state (`public/`, `storybook-static/`,
`test-results/` removed first). Each exited 0.

| Command | Result |
| --- | --- |
| `corepack pnpm test` (`vitest run`) | 4 files, 32 tests passed |
| `corepack pnpm typecheck` (`pnpm -r --if-present typecheck && tsc -p e2e`) | core, ui, e2e clean |
| `corepack pnpm exec shadcn build` | `Building button…`, `input…`, `responsive-dialog…`, `✔ Building registry.` → `public/r/{button,input,responsive-dialog,registry}.json` |
| `corepack pnpm build:storybook` | `Storybook build completed successfully` (2022 modules) |
| `corepack pnpm test:browser` (`playwright test`, serves `storybook-static`) | 4 passed: 2 projects × 2 tests |

Measured evidence:

- **Theme/CSS:** valid fixture round-trips (`toEqual`); invalid fixture rejected
  with rule `theme.invalid` at `modes.light.color.primary.$value`,
  `modes.dark.color.ring`, and the root (unknown key). Rendering is
  byte-identical across runs and across reversed input key order, and equals the
  committed golden `packages/core/src/theme/fixtures/quiet-editorial.css`
  (sha256 `6b34ac8043367a643c147d344492af97cc74d1a6d031435fcc90d802ef37018b`).
  Both modes, 23 semantic colors each, and all six categories are present.
- **Contracts:** `getContract(id)` loads exactly one contract module. Serialized
  sizes: button 1720 B, input 1561 B, responsive-dialog 2216 B (limit 8192 B).
  Unknown and prototype-chain ids (`__proto__`, `constructor`) return `undefined`.
- **Mutation:** valid `setColor` applies, bumps revision, does not mutate its
  input. 14 rejection cases return stable `{ruleId, path}` (e.g.
  `mutation.unknown-operation` at `operations[0].op`, `mutation.unknown-field`
  at `operations[0].css`/`.path`, `mutation.invalid-value` for raw CSS
  `red; } body {…`, `mutation.stale-revision` at `base.revision`).
- **Boundary:** the scanner rejects `apps/workbench` relative/bare imports,
  `@personal-ui/ui`, and React in core; it finds none in the current core source.
- **Registry:** three items only. `button.json` sha256 prefix `b2e89f25d516f0d4`,
  `input.json` `964dba53b76e697f`, `responsive-dialog.json` `129e59eab8a988aa`,
  `registry.json` `9361b823f8ae68ce` (first 16 hex chars, this run).
- **Browser:** at 390×844 the story renders `[data-slot="drawer-content"]` and
  no dialog content; at 1440×900 the reverse. At widths 640 and 641 the pattern
  is Drawer and Dialog respectively. Axe (4.13.0) reported zero violations
  (33 rules passed) at both sizes; a sanity check that injected an image without
  alt text was flagged `image-alt: critical`, so the scan is not vacuous.
  Escape closes the modal and returns focus to the trigger.
- **Primitives preserved:** `button.tsx`, `input.tsx`, `dialog.tsx`, `drawer.tsx`
  are byte-unchanged from `d893286` (`git diff` empty).

## Authored files

Core (`packages/core/src`): `theme/{schema,render}.ts`, `theme/fixtures/{valid,invalid}.json`,
golden CSS, `contracts/{contract,catalog}.ts` + `contracts/data/*`,
`mutations/mutation.ts`, four test files. UI: `responsive-dialog.tsx`, two
stories, `.storybook/{main,preview}.ts`, `styles/globals.css`. Root: `registry.json`,
`playwright.config.ts`, `vitest.config.ts`, `e2e/`, script and ignore updates.

## Limitations and findings

1. **Not a full AC verification.** No workbench, constraints package, promotion
   state machine, dark-mode browser matrix, or keyboard flows beyond Escape/focus
   return. Only light mode was browser-tested.
2. **`serve` clean URLs drop the story query string** (`/iframe.html?id=…` → 301
   `/iframe`, "No Preview"). Worked around with authored `e2e/serve.json`
   (`cleanUrls: false`), passed via `--config ../e2e/serve.json` (resolved relative
   to the served directory).
3. **TypeScript 7 removed `baseUrl`**; `packages/ui/tsconfig.json` uses `paths`
   only. The root script `tsc -b` had no root tsconfig, so `typecheck` now
   runs per-workspace. `packages/core` sets `types: ["node"]` for its tests.
4. **Registry validation is schema-level.** `shadcn build` does not resolve
   `registryDependencies` (`button`, `dialog`, `drawer`); resolving them against
   shadcn's public registry needs network and was not attempted. The Dialog/Drawer
   files are not registry items here (exactly three items were requested).
5. **Generated primitives import `cn` from the `cn` npm package** (and `radix-ui`),
   not a local `lib/utils`. The alias `@personal-ui/ui/*` is mapped in
   `tsconfig` and in Storybook's Vite config only; workbench would need the same.
6. **`animate-in`/`fade-in` classes in the shadcn Dialog/Drawer require
   `tw-animate-css`, which is not installed**; overlays appear without those
   animations. Vaul's own drawer motion still works.
7. **Theme schema choices to confirm:** spacing uses `space.base` + `space.density`
   (rendered as `--spacing: calc(var(--space-base) * var(--density))`) rather than the
   sketch's `space["4"]`; `reducedMotion` admits only `"reduce"` in V1; motion
   variables are `--motion-duration-*` plus `--default-transition-duration`.
8. **Theme CSS reaches Storybook through a package export**
   (`@personal-ui/core/theme/fixtures/quiet-editorial.css`), i.e. the committed golden
   file; it is drift-tested against the renderer but is not regenerated by a build step.
9. **Build warnings:** Rolldown `MODULE_LEVEL_DIRECTIVE` ("use client") notices
   from lucide-react/vaul; non-fatal.
10. The `@personal-ui/ui` import-boundary check covers `packages/core` only; `ui →
    workbench` is not yet checked.

## Recommendation

**Admit** the stack for continued V1 work: all four dependency-backed risks in
`TECHNICAL_SPIKE.md` (registry layout, Tailwind v4/shadcn CSS mapping, responsive
primitive rendering, axe cleanliness) passed on installed public behavior without
making Storybook, the registry, or generated CSS canonical. Carry limitations 1, 4,
and 7 forward as explicit follow-ups; none blocks admission.
