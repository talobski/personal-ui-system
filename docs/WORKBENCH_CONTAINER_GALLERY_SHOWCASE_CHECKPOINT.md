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

## Unit 3 — PUI-80 toolbar colour-mode Switch

Files: `apps/workbench/src/App.tsx`, `apps/workbench/src/lifecycle.test.ts`, `packages/ui/src/components/switch.tsx`,
`packages/ui/src/components/switch.stories.tsx`, `packages/ui/src/foundation.test.ts`, `packages/ui/src/lib/workbench-icons.ts`,
`packages/core/src/contracts/data/switch.ts`, `packages/core/src/context/provenance.ts`, `e2e/switch.spec.ts`,
`e2e/semantic-typography-history-grid.spec.ts`, new `e2e/workbench-container-gallery-showcase.spec.ts`, both Playwright configs.

- Toolbar: `[SidebarTrigger] … [Switch] | [Undo Redo Reset] | [Export Save]`. The Switch leads the existing `ml-auto`
  right cluster. Both separators are one local `ToolbarSeparator` component, so the new boundary is identical to the
  accepted Reset/Export separator by construction (its existing `h-8 w-px bg-border` treatment is reused, not
  introduced as a new requirement). Toolbar height stays 64px; actions, handlers, export payload and Save are unchanged.
- The visible `Dark mode` Label is removed; the Switch has the stable name `Toggle dark mode`, keeps Radix
  `role="switch"`/`aria-checked`, Space activation, and the shared focus-visible ring. The thumb shows a Lucide `Sun` in
  light mode and `Moon` in dark mode (`aria-hidden`, `text-foreground` on the `bg-background` thumb).
- Switch inspection and decision: the shared Switch renders the Radix Thumb with no children. A Workbench-local
  composition would have had to either rebuild the track/thumb (listed as a mistake in the Switch contract) or overlay
  an icon coupled to the thumb's private size/translate geometry. The cleaner reusable option is an optional
  `thumbContent` prop rendered inside the Thumb; when omitted the component renders exactly as before (the only class
  addition is conditional). The contract gained one accessibility and one composition line; its provenance hash was
  updated; a `ThumbIcon` story and a Storybook browser test were added. No registry item, dependency, or resource was
  added (still one `switch` item).
- Colour-mode persistence: the accepted product holds mode as session state initialised to light (no storage). That is
  preserved exactly — the mode survives theme switches and layout changes; a reload returns to light — as PUI-80
  forbids persistence changes. CGS-11 asserts this unchanged behaviour and that no new storage key appears.

## Unit 4 — Integrated regression and phase verifier

All commands ran offline with `COREPACK_ENABLE_NETWORK=0` (cached pnpm 12.5.1; no download). Browser runs are
**producer-only smoke**, not formal evidence; the Lead owns formal browser evidence.

| Command | Result |
|---|---|
| `corepack pnpm test` | 42 files, 789 passed (baseline 782) |
| `corepack pnpm typecheck` | exit 0 |
| `corepack pnpm registry:build` | exit 0; 19 items |
| `corepack pnpm build:workbench` | exit 0 |
| `corepack pnpm build:storybook` | exit 0 |
| `corepack pnpm exec playwright test` (Storybook) | 96 passed |
| `WORKBENCH_PORT=5312 corepack pnpm exec playwright test -c playwright.workbench.config.ts` | 268 passed, 6 intentional viewport skips |
| `WORKBENCH_PORT=5313 corepack pnpm exec playwright test -c playwright.designcommand.config.ts` | 1 passed (forced-empty credential, no outbound call) |
| `node tools/verify-workbench-container-gallery-showcase.mjs` | `ok`, 34 changed, 377 frozen, 12 operations, 19 registry items, 13 compositions |

The six Workbench skips are two established cross-viewport skips (desktop-only sidebar shell, mobile-only sheet) plus
four intentional one-project runs of desktop-width checks (NGIP 1100px, CGS-03 sweep, CGS-04 flow, CGS-05 1100px).

The first full Workbench run found five failures in definitions, not product: NGIP-11 now sees two toolbar separators
(it was re-targeted to the Reset/Export one, after asserting exactly two), and the CGS-03 sweep measured the 760px step
before the Recharts ResizeObserver settled (it now polls until width and containment settle, then measures). Both
passed three repeats each, then the complete second run passed.

## Criteria mapping

| Criterion | Evidence produced (producer) |
|---|---|
| CGS-01 | Admission hash check (above); verifier re-checks packet, contract, and admission manifest hashes |
| CGS-02 | Verifier admitted-path allowlist; no dependency, lockfile, schema, persistence, Jev, or credential change |
| CGS-03 | `CGS-03` spec: fixed 1440×900 viewport, gallery constrained to 600/760/1000/1300px plus sidebar open (960) → collapsed (1408): 1 → 6/6 → 5/7 → 4/8, groups 2 → 1 → 2; right > 1.3 × left when wide; NGIP-04/05 migrated |
| CGS-04 | `CGS-04` spec: a 1400px-tall left card leaves every right card in place and vice versa; stacked gaps exact; local pair starts together at different natural heights |
| CGS-05 | `CGS-05` spec at 390, 1100, 1440: exact 13-id order, no clipped control or overflow; NGIP focus-order sweep visits every tabbable composition once in DOM order |
| CGS-06 | `gallery.test.ts` and verifier: `@container/gallery`, 12-track spans, no viewport breakpoints, no legacy classes, no gallery CSS left in `styles.css` |
| CGS-07 | Composition choices above; screenshots reviewed; `CGS-07/08` unit guards. Formal rubric screenshots are Lead-owned |
| CGS-08 | `CGS-08` spec for Default and Quiet Editorial in light and dark (chart/primary marks resolve to live tokens, decoded axe) plus live edits to chart-1, Heading font, radius, spacing, and shadow blur restyling the showcase without reload |
| CGS-09 | `CGS-09` spec (normal and reduced motion): range toggle, day selection and add, board advance with progressbar, search filter/empty/status, upgrade status, expand and bookmark; existing interactions in `quiet-workspace.spec.ts`; decoded axe light and dark |
| CGS-10 | `CGS-10/11` spec: exact order `Toggle Sidebar, switch, \|, Undo, Redo, Reset, \|, Export, Save`; identical short separators centred with the Switch; 64px; no "Dark mode" text; containment at 390 |
| CGS-11 | Sun/moon in the thumb (centred), name/role/checked, keyboard Tab → Space, focus-visible ring, session persistence, no revision/history change, byte-identical export across modes; Storybook `ThumbIcon` test |
| CGS-12 | Regression table above |
| CGS-13 | Verifier: 19 items, 12 operations, frozen schema/persistence/history/mutations/proposal/Jev files, minimal Switch diff, provenance mirror, bundle scan |
| CGS-14/15 | Lead-owned |

## Remaining risks

- Visual quality (CGS-07) is a judgement; the producer reviewed screenshots at 390 light/dark, 1440 light in Default
  and Quiet Editorial, and 1440 dark with the sidebar collapsed. At the 6/6 frame (672–895px gallery) regions are about
  350px wide and the right region runs taller than the left; that is acceptable under independent stacks but is the
  least balanced width.
- The Launch checklist goes three-column from its own 28rem content width, so at the 5/7 desktop split its task
  titles wrap to two or three lines.
- The shared Switch gained a public optional prop. It is backward compatible and guarded, but it is still a change
  to an accepted resource's surface (admitted by the contract as optional).
- `aria-label` on the gallery's generic root `div` is carried over unchanged from the accepted gallery.
- `test-results/`, `storybook-static/`, `apps/workbench/dist/` and `public/r/` are build/test outputs ignored by git.
