# Workbench Container Gallery Showcase v1 — producer checkpoint

Phase: `workbench-container-gallery-showcase-v1-001` (PUI-78, PUI-79, PUI-80).
Producer: Claude `claude-opus-5-5` (STRONG, medium), run 1. Start: clean `6f99c15bccb141f942e4d2615c6a3a40c99ec836`.
Authority: `docs/WORKBENCH_CONTAINER_GALLERY_SHOWCASE_CONTRACT.md`. This checkpoint is producer evidence only; a worker
completion claim is not project completion. Lead owns formal browser evidence, protected verification, and closeout.

## Admission checks

- Worktree HEAD `6f99c15`, branch `loop/workbench-container-gallery-showcase-v1-001`, status clean.
- SHA-256 of `linear/PUI-78.json`, `PUI-79.json`, `PUI-80.json`, `linear-ticket-snapshots.md`, and the contract all
  match `snapshot-hashes.json`.
- Offline baseline: `COREPACK_ENABLE_NETWORK=0 corepack pnpm test` — 42 files, 782 tests passed. Corepack used the
  cached pnpm 12.5.1; no download occurred.

## Unit 1 — PUI-78 container-responsive nested gallery

Files: `apps/workbench/src/Gallery.tsx`, `apps/workbench/src/styles.css`, `apps/workbench/src/gallery.test.ts`.

- The gallery root is a named Tailwind 4 container (`@container/gallery`, marker `data-gallery="cards"`). All layout
  uses direct utilities and `@`-container variants; no viewport media query places the gallery.
- The obsolete `.quiet-gallery`, `.quiet-stack`, `.quiet-gallery-principal`, `.quiet-gallery-pair` rules and both
  `@media` wrappers were removed from `styles.css`, as were the semantic `activity` / `profile-actions` / `local-pair`
  region names. The shadowless-root presentation moved onto the `Composition` wrapper as utilities. No gallery CSS
  remains in `styles.css`.
- The eight accepted compositions are preserved exactly once (layout-refactor baseline).

Recipe (gallery container width → frame):

| Gallery width | Frame | Left / right span | Gap |
|---|---|---|---|
| < 42rem (672px) | one column; left stack then right region | full / full | 16px |
| ≥ `@2xl` 42rem | 12-track grid, one row | 6 / 6 | 16px |
| ≥ `@4xl` 56rem (896px) | 12-track grid, one row | 5 / 7 (right larger) | 24px |
| ≥ `@6xl` 72rem (1152px) | 12-track grid, one row | 4 / 8 (rebalanced) | 24px |

Each region (`data-gallery-region="left|right"`) is an independent `flex flex-col` natural-height stack and an unnamed
`@container`. Local groups (`data-gallery-group`) are `grid grid-cols-1 items-start` and switch to two columns from their
own region width (`@lg`/`@xl`), so the same group can be stacked, side by side, or full-region at different widths.

Producer smoke (not formal evidence; local `vite preview`, Chromium, fixed 1440×900 viewport unless stated):

| Case | Gallery | Left | Right | Local groups |
|---|---|---|---|---|
| 390×844 | 358 | 358 (stacked) | 358 | 1 col, 1 col |
| 1100×900 | 620 | 620 (stacked) | 620 | 2 col, 2 col |
| 1200×900 | 720 | 352 | 352 | 1 col, 1 col |
| 1440×900 sidebar open | 960 | 386 | 550 | 2 col, 1 col |
| 1440×900 sidebar collapsed | 1408 | 453 | 931 | 2 col, 2 col |

The 1440 open → collapsed pair proves the frame and local groups recompute from container width at a fixed browser
viewport. No composition overflowed. Browser definitions are migrated with the final composition set in Unit 2.
