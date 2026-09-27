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

## Unit 2 — PUI-79 curated token-driven showcase

Files: `apps/workbench/src/Gallery.tsx`, new `packages/ui/src/compositions/{revenue-overview,upcoming-schedule,plan-usage,launch-board,quick-find}.tsx` plus thin stories, refreshed `recent-activity.tsx` and `room-to-think.tsx`, tests `apps/workbench/src/gallery.test.ts`, `packages/ui/src/quiet-workspace.test.ts`, and migrated browser definitions in `e2e/quiet-workspace.spec.ts`, `e2e/workbench-nested-gallery-interaction-polish.spec.ts`, `e2e/workbench-sidebar-preview-followup.spec.ts`.

Final gallery set (13, each rendered once). Left stack: Productive Week, Quick Find, Account Profile, Notifications, Storage (plan usage), Support Request. Right region: Studio Revenue (full); local group [This Week | Recent Activity]; Launch Checklist (full); local group [Team Access | Workspace Settings]; Room to Think (full).

Main composition choices:

- **Studio revenue** — finance dashboard: range ToggleGroup (Week/Month/Quarter) re-derives KPI tiles and an area/dashed-line Chart; KPI tiles recompose 1→3 columns from the card's own container width. Deltas carry sr-only context.
- **This week** — agenda: pressed-state day strip (7 buttons with event counts in accessible names), chart-token rails, Mono times, an "Add focus block" action and an empty-day state.
- **Storage** — commerce/utility: Heading-role numeral, chart-token segmented meter with `role="img"` summary, Mono legend values, and an inner token-elevated (`shadow-md`) upgrade tile with a preview-only status.
- **Launch checklist** — productivity board: progressbar, three columns that go side by side from the card's own `@md` width, tasks advance column by column with named buttons.
- **Quick find** — command utility: search field with a focus ring on its wrapper, live filtering, polite result count, Mono key hints, empty state, preview-only status.
- **Recent activity** (refreshed) — grouped Today/Yesterday timeline with icon badges and Mono times.
- **Room to think** (refreshed) — editorial media card: a generative cover built only from chart/primary tokens and the radius scale, Heading-role statement, expandable essay (`aria-expanded`), and a pressed-state bookmark; the card goes side by side from its own `@xl` width.

The accepted eight modules keep their interactive behaviors (profile save, notification switches and save, support validation, team-access dialog, workspace save) and public fixture variants. No registry item, dependency, or public resource was added; icons come from the UI package's existing pinned `lucide-react`. All colour is semantic (`primary`, `secondary`, `muted`, `accent`, `border`, `destructive`, `chart-1..5`); no raw colour appears in any composition (unit-guarded). Muted-foreground text is only placed on card/background surfaces, never on muted/secondary/accent fills, so no new instance of the documented muted contrast debt was introduced.

Gallery roots remain shadowless via an explicit `box-shadow:none` arbitrary property on the `Composition` wrapper (Tailwind's `shadow-none` computes to a transparent five-layer stack, which would have weakened the accepted exact `none` assertion).

Test migrations (no assertion weakened): exact 8-id lists became the exact 13-id list; `.quiet-gallery*` selectors became `[data-gallery]`, `data-gallery-region`, and `data-gallery-group`; viewport-width thresholds (640/960) became gallery-container thresholds (512/672/896); the 7fr/5fr ratio check became "right region > 1.3 × left at wide"; NGIP-03's live half now proves Quick Find follows Productive Week by exactly one gap while Revenue Overview starts beside it; independent-stack gap checks now cover the whole left stack and every right-region step; the tabbable-composition floor rose from 6 to 11; `items-start` is asserted as its exact computed value `flex-start`.

Producer smoke (not formal evidence): `WORKBENCH_PORT=5312 corepack pnpm exec playwright test -c playwright.workbench.config.ts quiet-workspace.spec.ts workbench-nested-gallery-interaction-polish.spec.ts workbench-sidebar-preview-followup.spec.ts` — after the fixes above, all previously failing cases pass (NGIP-03/04/05 7 passed, 1 intentional skip; quiet-workspace layout light/dark both projects passed); the remaining 86 cases in that run passed on the first attempt. Screenshots were reviewed at 390 light/dark, 1440 light (Default and Quiet Editorial), and 1440 dark with the sidebar collapsed.
