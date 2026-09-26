# Workbench Sidebar Theme Polish checkpoint

Phase: `workbench-sidebar-theme-polish-v1-001` (PUI-56 to PUI-62, WSTP-01 to WSTP-17)

Status: producer candidate. The offline checks pass. A worker smoke run of the browser
definitions also passed, but it is not authoritative. Lead browser acceptance, the fresh
protected verifier, acceptance, promotion, and closeout have not happened. This document
claims none of them.

- Producer: `loop_worker_claude_strong`, `claude/claude-opus-5-5`, STRONG, medium, auto, included subscription only.
- Accepted product base: `d3ce5ec5822da47db94b509f8848203520154eb6`.
- Prepared HEAD: `82cd428e294bc9f52b041af244002f4f20252344`.
- Candidate SHA: the single commit on `loop/workbench-sidebar-theme-polish-v1-001` that adds
  this file (`git log -1 --format=%H -- docs/WORKBENCH_SIDEBAR_THEME_POLISH_CHECKPOINT.md`).
  The exact SHA is also in the producer completion report.

## What changed

| Area | Delivery |
| --- | --- |
| Theme v2.1 (WSTP-03) | `THEME_SCHEMA_VERSION` is `"2.1"` and the URI `theme-2.json` is unchanged. `COLOR_TOKENS` is now the 24 `BASE_COLOR_TOKENS` plus 8 `SIDEBAR_COLOR_TOKENS` (`sidebar`, `-foreground`, `-primary`, `-primary-foreground`, `-accent`, `-accent-foreground`, `-border`, `-ring`), stored in both modes as ordinary canonical colours with the same normalization. There is a new strict `sidebar` object with `useDedicatedTokens: { $type: "boolean", $value }` and a bare boolean `dedicatedValuesInitialized`. A refine rejects an uninitialized set that is on. No `sidebar-input` or `sidebar-card` exists. |
| Migration (WSTP-04) | A frozen strict `themeV2_0Schema` handles v2.0 input. `validateTheme` chains v1 → v2.0 → v2.1 through `migrateThemeV1` and the new `migrateThemeV2_0`. v2.0 → v2.1 copies every value unchanged, adds each Sidebar colour from its base alias in that mode, and starts the set off and uninitialized. Default (`default.json`) is now a literal complete v2.1 fixture. Quiet Editorial stays the accepted v1 fixture and is served migrated to a complete v2.1 theme that round-trips through direct v2.1 validation. The storage key and container format are unchanged. |
| Initialization (WSTP-05) | While a set is uninitialized, parsing (`syncUninitializedSidebarColors`, a schema transform) keeps the dedicated values equal to their resolved base aliases, so they track base edits. In `applyMutation`, the first `setColor` on a Sidebar token, or `setSidebarTokensEnabled(true)`, snapshots both modes from the current resolved aliases, including earlier operations in the same request, and marks the set initialized. After that, the values are independent and are preserved while off. Disabling an uninitialized set is a no-op. |
| Source selection (WSTP-06) | `renderShadcnTailwindCss` emits `--sidebar*` in both `:root` and `.dark`. When off, each is `var(--<alias>)` of exactly the approved base token (sidebar → background, not card). When on, the stored dedicated values are emitted. `@theme inline` adds the `--color-sidebar*` aliases. The golden `default.css` and `quiet-editorial.css` were regenerated from the renderer. The public Sidebar now uses the official `bg-sidebar`/`text-sidebar-foreground`/`sidebar-accent`/`sidebar-border`/`sidebar-ring` utilities instead of card/accent/border/ring. `SidebarInput` keeps `bg-background`, and inputs keep `input`. The Workbench chrome renders only `current`, so a staged candidate reaches only the preview iframe. |
| Workbench controls (WSTP-07) | `COLOR_GROUPS` adds one final `Sidebar` group. It holds the official shadcn `Switch` "Use sidebar tokens" (`SidebarTokensSwitch`, applied immediately through `setSidebarTokensEnabled`) and the helper text "Sidebar tokens are currently not applied." or "Sidebar tokens are active.", wired as the switch's description. Eight shared `LiveColorField`s follow, with visible labels Background, Foreground, Primary, Primary foreground, Accent, Accent foreground, Border, and Ring. Each has a screen-reader-only "Sidebar" prefix so accessible names stay unique. The fields render and stay enabled in both states. Only the existing staging lock disables them. |
| Mutation, proposal, diff, context (WSTP-08) | `setColor` admits the eight tokens. `setSidebarTokensEnabled { op, value: boolean }` is the only added operation, for a total of 12. The mutation and proposal request versions stay `1.0`. `diffThemeTokens` now includes the `sidebar` group. Only `sidebar.useDedicatedTokens` is a `$value` leaf, so `dedicatedValuesInitialized` never appears. While both sides are uninitialized, the generated Sidebar copies are also omitted, so a base edit reports only the base token. Context publishes `themeSchemaVersion` `2.1` and the tokens (theme payload, `setColor` description), plus a `setSidebarTokensEnabled` capability. The Default provenance hash and the Sidebar contract provenance hash were updated. Proposal lifecycle code is untouched. |
| Portability (WSTP-09) | Export emits canonical v2.1. Import and reload accept v1, v2.0, and v2.1. `default.conversion.json` now records `schemaVersion` `2.1` and a `sidebarTokens` section (1:1 mapping, alias-derived defaults, disposition), and keeps `sidebar-input` unsupported. |
| ScrollArea (WSTP-10) | Shared public `ScrollBar`: a physical `w-[0.5rem]`/`h-[0.5rem]` bar on a transparent track. Tailwind `w-2` would scale with the editable theme spacing in this system, so it is not used. The thumb is `rounded-full`: `bg-muted-foreground/25` at rest, `/40` while the root (`group/scroll-area`) is hovered or holds focus, and `/55` on thumb hover or `:active` drag. The Workbench-only transparent/70% thumb override was removed so every consumer inherits the shared treatment. Radix ownership and input are unchanged. |
| Sidebar geometry (WSTP-11) | `SidebarProvider` `--sidebar-width: 28rem` is the only width setting. Mobile stays 18rem (`SIDEBAR_WIDTH_MOBILE`). The Sidebar contract example and responsive text now name the official variable and 28rem. |
| Typography rows (WSTP-12) | New `LABELLED_ROW_CLASS` is `grid-cols-[5rem_minmax(0,1fr)]` and `NUMERIC_ROW_CLASS` is `grid-cols-[5rem_minmax(0,1fr)_max-content]`, both with physical `gap-[0.375rem]`. Font rows show visible Sans, Serif, and Mono labels. The search input is "Search Sans fonts". The visible section title is `Spacing` (rendered SPACING) and the field label is `Tracking`. `typography.tracking` and `setTracking` are unchanged. |
| Selector, tabs, pointer (WSTP-13) | The active theme name and every built-in and custom option name are wrapped in `font-medium` spans (computed 500). The span is needed because `.quiet-control` forces 400 on the trigger. The visible tab reads `Effects` and keeps value `other`, the same order, and the official Tabs. `CATEGORY_TRIGGER_CLASS` changes only `px-3` → `px-2`. `cursor-pointer` was added at bounded call sites only: ControlSection trigger, Export JSON, Save, SidebarTrigger, Dark mode and Sidebar-token switches, font Combobox triggers (with `disabled:cursor-not-allowed`), Evaluate, Apply/Discard proposal, Review changes, and dialog Delete/Cancel/Save theme. Disabled Buttons keep `disabled:pointer-events-none`. The public Button, labels, sliders, and static text are unchanged. |
| Constraints | `sidebar.semantic-tokens` now admits the canonical `sidebar-*` set plus shared base tokens, including `input`. It still rejects literal colours and `sidebar-input`. |

## Acceptance criteria

| Criterion | Evidence | State |
| --- | --- | --- |
| WSTP-01 | Snapshots and contract supplied verbatim in the producer packet. The prepared base adds only the admission files; the verifier records their git blob ids (snapshots `db83ffad`, task `9de7e0be`, BRIEF `d3db68b1`, contract `dd927916`; contract sha256 `358b53a8fe6e6219060289db58c861f617c798eb898984407767fe9e3e543cad`). Ticket-to-criterion mapping follows the contract. No Linear or network access. | Complete (producer side) |
| WSTP-02 | The verifier enforces the admitted file set, no deletions, and whitespace hygiene | Complete |
| WSTP-03 | `sidebar-tokens.test.ts`, `theme.test.ts` strict rejections, verifier schema checks | Complete |
| WSTP-04 | v2.0/v1 migration tests (core and Workbench storage), Default fixture v2.1 test, Quiet Editorial round-trip | Complete |
| WSTP-05 | Initialization tests (sync, first activation snapshot including in-request order, first dedicated edit, independence, off no-op, parse re-sync) | Complete |
| WSTP-06 | Renderer alias/on tests, golden CSS, Sidebar utility test, generated-CSS evidence, staged-isolation tests | Complete offline; browser pending Lead |
| WSTP-07 | Workbench source/unit tests and phase browser spec | Complete offline; browser pending Lead |
| WSTP-08 | Operation union exactly 12 (verifier plus tests), diff/proposal/context tests, capabilities test | Complete |
| WSTP-09 | Save/reload/export/import tests (core, Workbench storage, browser spec), conversion report test | Complete offline; browser pending Lead |
| WSTP-10 | `scroll-area.test.ts`, generated CSS, browser spec (thickness, 25/40/55%, no reserved width, drag/wheel/keyboard) | Complete offline; browser pending Lead |
| WSTP-11 | Source tests, browser spec (448px desktop, inset remainder, Ctrl/Cmd+B, 288px sheet) | Complete offline; browser pending Lead |
| WSTP-12 | Source tests, browser spec (80px column stable across spacing 0.5rem, single-line unclipped labels) | Complete offline; browser pending Lead |
| WSTP-13 | Source tests, verifier, browser spec (weight 500, Effects/`other`, 8px padding, pointer/disabled) | Complete offline; browser pending Lead |
| WSTP-14 | Registry 19 and unchanged; package.json, lockfile, and public Button byte-frozen; no network/credential additions; bundle scan | Complete |
| WSTP-15 | `e2e/workbench-sidebar-theme-polish.spec.ts` (both projects × light/dark × reduced/default motion; migration, OFF/ON/no-jump/edit/save/reload/proposal, ScrollArea input, geometry, pointer/keyboard, axe via the unchanged known-debt helper) plus updated existing specs | Definitions complete; **Lead execution required** |
| WSTP-16 | Offline unit, typecheck, registry, both builds, phase verifier, and diff check pass | Offline portion complete; Lead browser matrix and fresh Codex STANDARD verifier remain |
| WSTP-17 | — | Not started (Lead-owned; no acceptance or promotion claimed) |

## Commands and results (offline, worker-run)

`pnpm -r …` refuses to run in this worktree with `ERR_PNPM_UNSAFE_TASK_RUN_STATE_PATH`,
because `node_modules` is a symlink to the canonical checkout. `pnpm typecheck` and
`pnpm build:workbench` were therefore run as their exact underlying commands. The logs
record this.

- `pnpm test`: 39 files, 716 tests passed. The baseline was 38 files and 684 tests.
- Typecheck: `tsc --noEmit` passed in packages/core, packages/ui, and apps/workbench, and `tsc -p e2e` and `tsc -p tools/loop/jev` passed.
- `pnpm registry:build`: passed. `registry.json` is byte-unchanged with 19 items.
- `vite build` (apps/workbench): passed, with the existing large-chunk warning. `generated-css.log` confirms the sidebar utilities, the off alias, the 25/40/55% thumb states, the 0.5rem bar, the 5rem grids, and `cursor-pointer`, and that the 6rem grid is absent.
- `STORYBOOK_DISABLE_TELEMETRY=1 pnpm build:storybook`: passed.
- `node tools/verify-workbench-sidebar-theme-polish.mjs`: pass (`boundary.json`).
- `git diff --check 82cd428`: clean.

Evidence is in `docs/evidence/workbench-sidebar-theme-polish/`.

### Worker browser smoke run (not authoritative)

Run on localhost with the cached Chromium; see `worker-browser-smoke.log`.

- Phase spec: 40/40.
- Storybook suite: 94/94.
- Full Workbench suite: 181 passed, 2 pre-existing skips, 1 failure. The failure was in the
  `workbench-control-navigation-scroll` mobile dark/reduce variant: keyboard `Home` left
  scrollTop at 672. The same spec passed 48/48 with `--repeat-each=4` and passed in an
  earlier rerun, so the Lead should watch it as intermittent.

The existing specs were updated only for admitted changes:
- Effects label.
- Sans/Serif/Mono labels and the `fonts` search name.
- Tracking label.
- The 80px label column and 8px tab padding.
- 28rem width.
- Shared thumb states.
- `schemaVersion` `2.1` on export.
- The Sidebar colour group (32 rows).
- Sidebar story background now resolves to `background`.
- A width-aware gallery column assertion.

## Risks and notes for the Lead

1. **Preview gallery columns at 1440px.** The admitted 28rem sidebar leaves a 992px preview at
   1440×900. That is below the existing 1000px three-column gallery breakpoint in the preview
   document, so the Cards gallery now stacks in one column there. It still shows three columns
   on wider screens. Preview content was not changed. The affected assertion now follows the
   real preview width.
2. **Sidebar background change is intended.** The Workbench Sidebar and category bar now follow
   `background` instead of `card`. In Default dark this is visibly darker than before.
3. **ScrollArea visibility.** Workbench thumbs are now faintly visible at rest (25%). Before, they
   were transparent until hover. This follows the contract's "every consumer inherits".
4. **Derived diff omission.** While a set is uninitialized, generated Sidebar colour copies are
   omitted from token diffs. This keeps proposals free of noise, because those values are not
   independent state. Once either side is initialized, they diff normally.
5. **Hover contrast.** A section trigger measured by axe while hovered (`hover:bg-muted/80`,
   #737373 on #f7f7f7, 4.42:1) is an accepted pre-existing state, not a new one. Like the
   accepted specs, the phase spec measures resting states. The known-debt helper is unchanged.
6. **Quiet Editorial is not a v2.1 JSON file.** It remains the v1 source fixture, served as a
   complete migrated v2.1 theme. No separate v2.1 JSON copy was added.

## Dependency and provenance state

- No dependency, lockfile, package manifest, or public resource changes.
- Registry: 19 items. Operations: 12, with `setSidebarTokensEnabled` the only one added.
- The Default theme fixture and Sidebar contract provenance hashes in `context/provenance.ts` were updated to the new file bytes.
- No network, credentials, paid capacity, external actions, Paseo/native agents, or canonical `.loop` access were used.
- The worker browser runs used only a localhost preview server.
