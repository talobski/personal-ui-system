# Workbench Cards Gallery Curation v1 — producer checkpoint

Phase: `workbench-cards-gallery-curation-v1-001` (PUI-81 to PUI-85).
Producer: Claude `claude-opus-5-5` (STRONG, medium), run 1. Start: clean `73e2c6e472e393fcf82d25938383a1eeee6eb98f`
on `loop/workbench-cards-gallery-curation-v1-001`; accepted product base `696e7c4e1af19be88bcac308dda2227acc9323f6`.
Authority: `docs/WORKBENCH_CARDS_GALLERY_CURATION_CONTRACT.md`. This checkpoint is producer evidence only; a worker
completion claim is not project completion. Lead owns browser evidence (CGCR-10), protected verification (CGCR-11), and
acceptance/promotion (CGCR-12). The candidate SHA is the commit containing this file, reported in the producer handoff.

## Admission checks

- Worktree HEAD `73e2c6e`, status clean.
- SHA-256 of all five `linear/PUI-8x.json` payloads, all five `.comments.json` responses, `linear-ticket-snapshots.md`,
  `task.md`, and the contract match `snapshot-hashes.json`. Every comments file is `{"comments":[],"hasNextPage":false}`.
- The packet has no `admission.json` in this worktree (task.md says the Lead records it before dispatch). Nothing here
  depends on it; the phase verifier checks its closed flags only if it exists.
- No live Linear, network, credential, or canonical `.loop` access was used. All Corepack commands ran with
  `COREPACK_ENABLE_NETWORK=0` against the cached pnpm; no download occurred.

## Units, in the owner-approved order

### PUI-83 — curation (CGCR-03)

`apps/workbench/src/Gallery.tsx`: the configuration and recipe now hold exactly eight compositions, each rendered once.
Left: Storage (`plan-usage`), Quick find, A productive week, Support request. Right: Studio revenue, the local pair
This week / Recent activity, Launch checklist. Account profile, Notifications, Team access, Workspace settings, and Room
to think are removed from gallery imports, configuration, and rendering, along with their now-empty second local group.

Retained, not deleted: all five removed modules and their stories. Each is independently used (Storybook stories;
`composition-account-profile`, `-notification-preferences`, `-workspace-settings` specs; `avatar.spec.ts` and
`avatar.test.ts` use Team access and Account profile). No shared/public primitive changed. No gallery-only dead code
remained to remove.

### PUI-84 — stable gallery interaction (CGCR-04)

Each interactive survivor gained an optional `stable` prop (default `false`) that the gallery passes. Default stories keep
the fuller behaviour; a thin `Gallery` story (`{ args: { stable: true } }`) exposes each presentation in Storybook.

| Card | Removed from the gallery presentation | Kept |
|---|---|---|
| Storage | appended "Upgrade preview only" line | Upgrade button states; status announced via an always-present `sr-only` live region |
| Quick find | row filtering (rows added/removed), empty-state line, appended "Opened" line | live search; all five rows stay, non-matches become `disabled` (dimmed); opened row marked `aria-current` with accent; polite count and `sr-only` status |
| This week | Add focus block footer; variable-length agenda | day buttons (`aria-pressed`); agenda always renders the busiest day's row count (3), padding with "Open time" rows |
| Launch checklist | advance buttons (tasks moving between columns) | read-only board, progress bar, done styling |
| Support request | visible appended error and status lines; auto-growing, resizable textarea | topic select, typing, validation state on the field (`aria-invalid`, destructive label/border); error kept as an `sr-only` `role=alert` linked by `aria-describedby`; `sr-only` status; `resize-none field-sizing-fixed` keeps the textarea at its resting size |

A productive week and Recent activity had no geometry-changing interaction. No fixed pixel height was introduced.

### PUI-85 — Studio revenue (CGCR-05)

`packages/ui/src/compositions/revenue-overview.tsx` only. The visible header (title and "Income against costs…") is gone;
the range tabs are the first visible content. A visually hidden `<h2>Studio revenue</h2>` keeps the card's heading for
assistive technology. The three metrics share one `grid-cols-3 divide-x divide-border` row with no nested tile border,
radius, or background. Each keeps a fixed label/value/badge structure, so switching range never rewraps the row, and the
value size steps from `text-xl` to `@md:text-2xl` on the card's own container. Trend badges are kept, one under each
value. The Revenue/Costs legend, the dashed Costs series, the Costs chart config, and the unused costs data are removed.
The chart keeps the Revenue area and gradient, grid, x-axis labels, tooltip, and a Revenue-only `sr-only` caption. The
tabs are the unchanged `SingleToggleGroup`. No shared Chart primitive changed.

### PUI-81 — gap-4 (CGCR-06)

The frame, both regions, and the local pair drop their `@4xl/gallery:gap-6` override and use `gap-4` at every width.
Breakpoints, spans (6/6, 5/7, 4/8), and card padding are unchanged.

### PUI-82 — the one equal-height pair (CGCR-07)

`LocalGroup` (now used only by This week / Recent activity) is `items-stretch` and gives its cards `h-full`. Side by side,
both surfaces match the taller card. Stacked, each card sits in its own auto row, so stretch resolves to its natural
height. The frame keeps `items-start`, and no other card is equalized.

## Tests and definitions

Unit (`apps/workbench/src/gallery.test.ts`, `packages/ui/src/quiet-workspace.test.ts`): tests migrated to the curated
set and new CGCR-03/04/05/06/07 tests added, including server-rendered markup checks of the gallery's stable
presentations. Two migrations are worth noting. The Heading display-size assertion became an exact list of three,
because the removed Room to think carried the fourth. The shared-modules test now asserts that the gallery imports exactly
eight modules and that the five removed modules and stories are retained.

Browser definitions (Lead-executed):

- New `e2e/workbench-cards-gallery-curation.spec.ts` (Workbench), covering:
  - exact order and region membership at 390, 1100, and 1440;
  - 16px computed and measured gaps;
  - pair stretch versus natural height, measured against each card's natural height;
  - a nine-width container sweep plus sidebar open/collapsed;
  - independent stacks;
  - before/after card geometry for every surviving interaction, with normal and reduced motion;
  - Studio revenue: first visible content, one divided row with `--border` dividers, one area and no dashes, range
    ticks, keyboard roving/Space, stable height;
  - Default/Quiet Editorial × light/dark token resolution;
  - decoded axe.
- New `e2e/composition-gallery-presentations.spec.ts` (Storybook): each Default story keeps its full behaviour, and each
  Gallery story keeps its height and passes axe in light and dark.
- Migrated, and not weakened except as recorded:
  - `quiet-workspace` (removed-card workflows replaced by Support/Revenue/This week interactions; preview state
    round-trip now uses the Message value and the Week tab; the reduced-motion probe uses Upgrade);
  - `workbench-container-gallery-showcase` (curated order, 16px track maths, pair now equal, Room-to-think cover probe
    removed, live-edit probes moved to the Storage title and upgrade tile, CGS-09 now uses stable semantics);
  - `workbench-nested-gallery-interaction-polish` (curated order, 16px, `stretch`, equal pair heights, exact tabbable
    list; the distinct-height floor is now ≥6 because the pair shares a height by design and Quick find and Studio
    revenue can coincide; NGIP-03's live half now proves independence by growing Studio revenue 1200px and showing
    Quick find does not move, replacing a check that failed on a coincidental equal edge);
  - `workbench-sidebar-preview-followup` (frame gap 16px at all widths).
- Both Playwright configs register the new Workbench spec.
- Radix toggle-group roving focus moves asynchronously, so the keyboard path confirms focus after each arrow press.

`tools/verify-workbench-cards-gallery-curation.mjs` checks:

- packet, contract, and hash integrity;
- the admitted-path allowlist, trailing whitespace, and a single final newline;
- no deletions and byte-frozen everything else, including shared components, removed modules and stories, App, styles,
  schema, persistence, history, mutations, and Jev;
- 19 registry items and 12 operations;
- exact gallery structure, gaps, pair stretch, stable wiring, and Studio revenue source shape;
- raw-colour, network, and credential scans plus a bundle scan.

Diff hygiene: `support-request.tsx` had a pre-existing extra blank line at EOF. Because this phase changes that file, it
was normalized to one final newline.

## Integrated regression (producer, offline, final content)

Browser runs are producer smoke, not formal evidence.

| Command | Result |
|---|---|
| `corepack pnpm test` | 42 files, 797 passed (baseline 789, the 6 superseded failures migrated) |
| `corepack pnpm typecheck` | exit 0 |
| `corepack pnpm registry:build` | exit 0; 19 items |
| `corepack pnpm build:workbench` | exit 0 |
| `corepack pnpm build:storybook` | exit 0 |
| `corepack pnpm exec playwright test` (Storybook) | 106 passed |
| `WORKBENCH_PORT=5342 corepack pnpm exec playwright test -c playwright.workbench.config.ts` | 289 passed, 9 intentional skips |
| `WORKBENCH_PORT=5343 corepack pnpm exec playwright test -c playwright.designcommand.config.ts` | 1 passed |
| `node tools/verify-workbench-cards-gallery-curation.mjs` | `ok`, 24 changed, 405 frozen, 12 operations, 19 registry, 8 compositions |
| `git diff --check 73e2c6e` | clean |

The nine skips are the six established ones plus three new intentional one-project runs of desktop-width checks. The new
spec also passed with `--repeat-each 2`. The producer reviewed screenshots at 1440 light, 1440 dark with the sidebar
collapsed, and the 390 Studio revenue card.

## Criteria mapping

| Criterion | Producer evidence |
|---|---|
| CGCR-01 | Admission hash check; verifier re-checks packet, comments, index, task, contract, and base immutability |
| CGCR-02 | Verifier allowlist, frozen set, no deletions or dependency/lockfile/schema/registry/operation changes; removed modules and stories retained |
| CGCR-03 | `gallery.test.ts` CGCR-03; verifier region order; `workbench-cards-gallery-curation` order tests |
| CGCR-04 | Stable presentations; unit markup tests; Workbench CGCR-04 before/after geometry (normal and reduced motion); Storybook Default-versus-Gallery spec |
| CGCR-05 | Revenue source/markup unit tests; verifier; Workbench CGCR-05 spec and screenshot |
| CGCR-06 | Unit and verifier `gap-4` only; browser computed and measured 16px at 390/1100/1440 and a 9-width sweep |
| CGCR-07 | Unit and verifier single stretch/`h-full`; browser pair equals the taller natural height side by side, natural when stacked, others natural |
| CGCR-08 | Unchanged breakpoints and proportions (sweep maths), DOM/focus order, no overflow, themes × modes, reduced motion, keyboard, decoded axe |
| CGCR-09 | Regression table above |
| CGCR-10 to 12 | Lead-owned; not claimed |

## Remaining risks

- The metric dividers span each metric block's height (label to badge). That keeps them contained within the row, but
  they are not shorter than the content. If the owner's "short" means shorter still, a later tweak could add
  inner-element separators.
- Stable Quick find shows non-matching commands dimmed and disabled rather than hiding them. An all-dimmed list is the
  visual empty state; the polite result count ("0 results") is announced, and no "No matches" line is shown.
- In the gallery, Storage Upgrade and Support request confirmation feedback is announced but not shown visibly (the
  owner asked that no notice be appended); Support's invalid state remains visible on the field.
- This week's stable agenda pads quieter days with three "Open time" rows, which is a content choice in service of
  stable geometry.
- The removed-card modules are still referenced by earlier phase verifiers (`tools/verify-*-*.mjs`), which are
  historical and pinned to their own bases.
- `test-results/`, `storybook-static/`, `apps/workbench/dist/`, and `public/r/` are ignored build/test outputs.
