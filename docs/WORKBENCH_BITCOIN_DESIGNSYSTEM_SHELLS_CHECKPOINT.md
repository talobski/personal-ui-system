# Workbench Bitcoin, Design system and App shells — producer checkpoint

Phase: `workbench-bitcoin-designsystem-shells-v1-001` (PUI-108 through PUI-110)
Implementation base: `364464d252a462b4f093d5a60a45fcd55811735c` (accepted product `c4393eb`, accepted control `d886704`)
Producer: Claude (`claude-opus-5-5`), run 1 of the phase. This is authoring evidence only. It is not Lead browser
evidence, protected verification, acceptance or promotion.

## Preflight

- Base HEAD was `364464d` and the worktree was clean.
- Before any edit, the producer read `AGENTS.md`, `BRIEF.md`, the whole contract, all three complete snapshots,
  `index.md`, `snapshot-hashes.json` and `btc-reference-data.md`. The SHA-256 of the contract (`e168a525…`), the index
  (`a5b64a35…`), the BTC reference (`a0237cca…`) and every ticket snapshot matched the manifest. Linear and market data
  were not re-fetched; the packet, contract and reference are byte-unchanged.
- Every pnpm invocation ran with `COREPACK_ENABLE_NETWORK=0` against the dependencies already provisioned offline.
  Nothing was installed, updated or downloaded. No network, credentials, subagents, Paseo agents or canonical `.loop`
  state were used. Browser smoke used `127.0.0.1` only (`WORKBENCH_PORT=5198`/`5199` and Storybook's fixed 6006).

## Commits

1. `ab95c6e`: product changes (PUI-108 to PUI-110) and unit definitions.
2. The commit containing this file: migrated and new browser definitions, Playwright configs, the read-only phase
   verifier and this checkpoint. That commit is the candidate; it cannot record its own SHA, so the Lead records it
   (`git rev-parse HEAD` on `loop/workbench-bitcoin-designsystem-shells-v1-001`).

## Changed files (21 including this file, all inside the verifier's admitted set)

- Product:
  - New `packages/ui/src/compositions/bitcoin-price.tsx` and its thin story `bitcoin-price.stories.tsx`
    (gallery-only composition; not a registry resource).
  - `apps/workbench/src/Gallery.tsx`: the Bitcoin card is inserted directly after Studio revenue; nothing else changes
    (the verifier checks the diff is exactly that insertion).
  - `apps/workbench/src/DesignSystemPreview.tsx` (PUI-109) and `packages/ui/src/compositions/app-shells.tsx` (PUI-110).
- Unit definitions: `apps/workbench/src/gallery.test.ts`, `previewViews.test.ts`, `packages/ui/src/avatar.test.ts`
  (App shells joins the Avatar-user inventory for its profile footer) and `quiet-workspace.test.ts` (21 modules, 12
  gallery imports).
- Browser definitions (Lead-executed):
  - New `e2e/workbench-bitcoin-designsystem-shells.spec.ts` (WBDS-03 to WBDS-07).
  - Migrated in place: `workbench-gallery-preview-expansion`, `workbench-cards-gallery-curation`,
    `workbench-nested-gallery-interaction-polish`, `workbench-container-gallery-showcase`,
    `workbench-showcase-components-geometry` and `quiet-workspace` specs; `chart.spec.ts` gains a Storybook Bitcoin test.
  - `playwright.workbench.config.ts` registers the new spec; `playwright.config.ts` (Storybook) ignores it.
- Evidence: `tools/verify-workbench-bitcoin-designsystem-shells.mjs` and this file.

No test was deleted or skipped, no axe suppression was added or broadened, and every superseded assertion was replaced
in place. The verifier enforces non-weakening per changed test file (case counts, markers, viewport skips, assertion
counts). Replaced assertions:

| Superseded assertion | Replacement |
|---|---|
| Gallery order/count of eleven; right region starts `revenue-overview, team-chat` | Twelve; `revenue-overview, bitcoin-price, team-chat, …`; right-flow gaps include the Bitcoin card |
| Tab order `… revenue-overview, team-chat …` | `… revenue-overview, bitcoin-price, team-chat …` (the accepted Chart's keyboard-readable surface) |
| CGS-04: chat pair 16px below Studio revenue | Bitcoin 16px below revenue, chat pair 16px below Bitcoin |
| WSCG-11: `|left − right| ≤ 200` | `|left − (right − bitcoin − 16)| ≤ 200` and right > left (see residuals) |
| Design system groups Base/Surfaces/Intent/Boundaries/Charts + Sidebar; h2 `Typography`; Heading/Body/Mono role samples | Exact `COLOR_GROUPS` titles; h2 `Type scale`; nine descending rows; live Body family/weight/tracking; Body font edit (Manrope) updates specimens |
| App shells: no `SidebarInset`, no fixed element, no `input`, three `Sidebar collapsible="none"` in source | Still no `SidebarInset`/gap/container; fixed check excludes only Select's hidden positioner and aria-hidden mirror input; three comboboxes; one `Sidebar collapsible="none"` inside one shared `Shell` rendered three times |

## Criterion map (producer view)

| Criterion | Delivery | Authoring evidence |
|---|---|---|
| WBDS-01 | Packet untouched | Preflight hashes; verifier re-checks manifest/index/contract/BTC-reference hashes, snapshot status and 0/0/0 counts, byte identity with base for the evidence dir, contract, `BRIEF.md`, `AGENTS.md`, and ancestry `c4393eb → d886704 → 364464d → HEAD` |
| WBDS-02 | 21 files, all admitted | Verifier: admitted-path set, no deletions, whitespace/final-newline hygiene, 447 frozen files byte-identical to base (every public component including Sidebar/Select/Avatar/Chart, Theme v3 schema/fixtures/CSS, mutations, persistence, history, Design Command, Jev, `controls.ts`, `PreviewFrame.tsx`, revenue and app-shells story, earlier verifiers), dependency files and lockfile unchanged, no `.loop` change, registry exactly 23 and unchanged, mutation union exactly 12, test non-weakening |
| WBDS-03 | Full-width card as a direct child of the right region, directly after Studio revenue. Small `Bitcoin BTC` h2 (Body) with a muted coin glyph top-left; muted bordered `1Y` top-right; `$88,642.88` in Body `text-3xl @md:text-4xl font-semibold tabular-nums`; `−8.52%` pill with TrendingDown in `text-destructive` and sr-only “over one year”; the date `Jan 1, 2026`. Official Line Chart - Dots on `ChartContainer`: one `type="natural"` `Line` on `var(--chart-1)`, dots `r=2.5` filled with the same token, hidden `XAxis`/`YAxis` (padded domain), the accepted lightweight tooltip; no grid, visible axes, legend or second series. Visible note: “Historical first-of-month BTC/USD, Jan 1, 2025 – Jan 1, 2026. Source: Coinbase via FRED.” sr-only figcaption lists all 13 observations | Unit `WBDS-03/04` block. Browser: placement/width/16px gap, content, Body family, 1 line and 13 dots, no grid/tick/legend nodes, stroke and dot fill = `--chart-1`, hover/keyboard never changes card heights, no external request, container sweep 320–1400 without overflow, axe both modes; Storybook chart test (dot order follows data, keyboard tooltip names the date, axe both modes) |
| WBDS-04 | `BTC_FIRST_OF_MONTH_USD` is exactly the 13 frozen rows; change computed from first/last and rounded to 2 decimals | Unit test parses the frozen markdown table and deep-compares; verifier re-parses both and recomputes `-8.52`; source comment names FRED CBBTCUSD, retrieval date and “not a month-end close or monthly average”; no “live/current/close/monthly average” wording rendered; no fetch/SDK/URL in code or bundle |
| WBDS-05 | `DESIGN_SYSTEM_COLOR_GROUPS = COLOR_GROUPS` (the editor's single order source, all 32 tokens). Each group is a two-column list so every background/foreground pair shares a row and singletons follow in order. Swatches `size-12` (were `size-10`); values `text-xs text-muted-foreground` in Body (Mono removed); names wrap at hyphens. Sidebar heading `Sidebar · base aliases`/`· dedicated` with `= alias` lines while OFF, read from the rendered stylesheet as before. Sections are plain `<section>`s with `p-4 @xl:p-6`, no Card/border/background/shadow, `@3xl` (48rem container) side by side at 5fr/7fr, stacked below | Unit `WGPE-09/WBDS-05/06` block. Browser: flat computed styles and padding, side by side at 1440 / stacked at 390, sweep 340–960 pairs exactly from 768px, pairs on one row, 48px swatches, value family = body, OFF alias → ON dedicated value live, migrated WGPE-09 live primary/sidebar/mode checks, axe both modes |
| WBDS-06 | `Type scale` h2 with a small `Body · family · weight · tracking` line; nine rows `text-5xl … text-xs`, muted `text-xs` class label left (4.5rem), specimen right in `type-body` at that size, one line, truncated rather than overflowing | Unit exact row markup and order, no role groups. Browser: computed sizes 48/36/30/24/20/18/16/14/12, label left of specimen, specimen family = body, no overflow, Body font edit updates specimens |
| WBDS-07 | One `Shell` renders Classic workspace / Inset project / Compact utility in one vertical grid (`gap-8`), each `mx-auto w-full @3xl:w-[72%]`, one shared `h-108` landscape frame. Shared Sidebar: header `SidebarMenu` with the accepted `Select` as a workspace switcher (logo on `sidebar-primary`, name, plan; `aria-label="<shell> workspace"`), grouped icon navigation (Workspace: Home, Inbox·3, Documents; Team: Members, Settings) with local `isActive`/`aria-current`, `SidebarFooter` Avatar profile. Shared main panel: breadcrumb row (`workspace / page`, updates live), three `h-16 bg-muted` blocks and one larger `bg-muted` block (aria-hidden). Variants differ only in treatment: Classic bordered flat sidebar; Inset sidebar-coloured frame with a bordered, shadowed page surface; Compact `sm` density and narrower sidebar. Official `collapsible="none"` branch, one held-open provider, no public API change | Unit `WGPE-10/WBDS-07` block. Browser: vertical stacking, equal width/height, 0.6–0.8 of panel width and centred at 1440, ratio 1.3–2.2, full width at 390, container sweep (full width below 768px, < 0.8 above, no overflow), nav not clipped and footer inside frame, 4 muted blocks = `--muted`, keyboard switcher (Enter, ArrowDown, Enter) updates trigger and breadcrumb with unchanged shell heights, keyboard nav selection, Sidebar ON updates all three shells, migrated WGPE-10 radius/typography/shortcut checks, axe both modes |
| WBDS-08 | Lead-owned | Definitions provided; producer smoke below is not Lead evidence |
| WBDS-09 | — | Commands below |
| WBDS-10/11 | Not producer-owned | — |

## Commands and results (offline, final tree)

| Command | Result |
|---|---|
| `shasum -a 256` over contract, index, three snapshots and BTC reference (preflight) | All match `snapshot-hashes.json` |
| `COREPACK_ENABLE_NETWORK=0 pnpm typecheck` | exit 0 |
| `COREPACK_ENABLE_NETWORK=0 pnpm test` | exit 0: 44 files, 863 tests (858 at base; superseded tests replaced in place, +3 Bitcoin, +2 Design system; none removed) |
| `COREPACK_ENABLE_NETWORK=0 pnpm registry:build` | exit 0, `✔ Building registry.` (23 items; `public/r` is gitignored) |
| `COREPACK_ENABLE_NETWORK=0 pnpm build:workbench` | exit 0 (only the existing >500 kB chunk-size warning) |
| `COREPACK_ENABLE_NETWORK=0 pnpm build:storybook` | exit 0, `Storybook build completed successfully` |
| `node tools/verify-workbench-bitcoin-designsystem-shells.mjs` | exit 0: `{"ok":true,…,"changed":20,"frozen":447,"operations":12,"registry":23,"compositions":12,"btcPoints":13,"btcChange":"-8.52"}` (run before this file existed; 21 with it) |
| Verifier negative checks (temporary edits, reverted) | A byte appended to `components/sidebar.tsx` → `Outside admitted scope`; one BTC price changed by a cent → deep-equal failure against the frozen table |
| `git diff --check 364464d` (new files intent-added) | exit 0 |

## Optional producer browser smoke (not Lead evidence)

Local Chromium, `127.0.0.1` only, against the builds above, all with `COREPACK_ENABLE_NETWORK=0`:

- `WORKBENCH_PORT=5198 pnpm exec playwright test -c playwright.workbench.config.ts` (entire Workbench config,
  including the new spec and every migrated spec): 367 passed, 15 skipped (designed desktop-only sweeps and existing
  viewport skips), exit 0.
- New spec's WBDS-07 tests with `--repeat-each 8`: 40 passed; the whole new spec with `--repeat-each 2` twice: 30/30.
- `pnpm exec playwright test` (entire Storybook config): 112 passed, exit 0.

Every axe run in these specs is decoded against the known-debt helper; no new serious or critical finding appeared
(the only serious node seen in ad-hoc scans was the pre-approved Default muted ControlSection trigger debt).
Corrections to the new spec's own definitions during authoring: iframe-relative versus page coordinates were mixed,
and the switcher's ArrowDown raced its opening animation (now waits for animations, pointer parked). One product
tuning came from smoke evidence: the shell frame grew from `h-104` to `h-108`, Team lost its Projects item so no
navigation is clipped, and muted blocks use full `bg-muted` (the `/60` blocks were barely visible in light mode);
Type scale specimens truncate to one line instead of wrapping to four lines at `text-5xl`.

## Residuals and risks

- WBDS-08 browser evidence, WBDS-10 protected verification and WBDS-11 acceptance/promotion are outstanding and owned
  by the Lead and verifier.
- Gallery balance: the contract places the ~370px Bitcoin card in the right region without reordering the other
  eleven, so at 1440 the right region is now ~400px taller than the left (the pre-phase difference was ~27px). WSCG-11
  now asserts the accepted balance for the eleven accepted cards plus exactly the admitted card and gap. The Lead may
  judge whether that visual imbalance is acceptable; changing it would require moving accepted cards (out of scope).
- `SidebarInset` is not used: it renders a `<main>` and the preview document already has one (duplicate/nested main
  landmarks). Its inset treatment is composed with ordinary elements; the public Sidebar API is unchanged.
- The workspace switcher uses the accepted `Select` (no DropdownMenu resource exists and none may be added). Its
  closed popup positioner and aria-hidden mirror input carry inline `position: fixed`, exactly like the Workbench theme
  selector; the migrated WGPE-10 fixed-element check excludes only those.
- Profile email uses the accepted `text-sidebar-foreground/70` pattern and the Avatar uses its accepted muted pair; no
  contrast finding was observed in either built-in theme, but custom dedicated Sidebar colours could lower it.
- Type scale specimens truncate (ellipsis) in narrow columns; the full sentence stays in the DOM. The Colors column
  keeps all eleven groups, so the sheet is still long on mobile (~2.3k px), though shorter than the former two cards.
- The chart tooltip is the accepted Chart tooltip (keyboard/hover), consistent with Studio revenue and Weekly steps;
  the Chart surface is a tab stop in the gallery, as for those cards.
- The earlier phase verifiers are byte-frozen historical evidence bound to their own bases and are not expected to
  pass against this candidate.
