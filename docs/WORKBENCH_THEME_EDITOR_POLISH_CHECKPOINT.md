# Workbench Theme Editor Polish v1 — producer checkpoint

Phase: `workbench-theme-editor-polish-v1-001` · contract: `docs/WORKBENCH_THEME_EDITOR_POLISH_CONTRACT.md`
Branch: `loop/workbench-theme-editor-polish-v1-001` · prepared base `f366fad60da41d6c379b2546847eb5b50eb66a3f` ·
accepted base `89b74d821e2e3dad9733c8a39131633e27a852a8`

Provider-neutral. A continuation reads this file, the contract, and `git log f366fad..HEAD`; completed units are
not replayed. Everything below is **producer evidence** for the Lead. It is not Lead-rerun evidence, not protected
verifier evidence, and not acceptance.

## Status (2026-09-24/25)

- Producer: `claude/claude-opus-5-5` (one-use owner-approved MAX envelope). No provider substitution.
- All producer scope for WTEP-01..14 is implemented and committed. WTEP-15 (owner visual review) is external.
- Candidate: the commit containing this file (`git rev-parse HEAD`); worktree clean after it.
- Unit commits: `e985315` product + unit tests · `1fba497` browser matrix · final commit: frozen-boundary scan +
  this checkpoint.
- Unit in progress: none. Known product defects: none.

## What changed

| File | Change |
|---|---|
| `apps/workbench/src/App.tsx` | Active-theme `<style id="workbench-active-theme">` for chrome; compact selector (NativeSelect with Built-in/Custom optgroups + status/id/rev line); grouped colour rows; toolbar = Switch "Dark mode" + Proposal / Export JSON / Save; Save As via ResponsiveDialog; preview iframe fills panel; fork, baseline diff, width selector removed; subtle divider classes on `ResizableHandle`; staged status text |
| `apps/workbench/src/LiveControls.tsx` | `LiveColorField`: native `<input type=color>` + canonical text Input, both via one `setColor` apply path |
| `apps/workbench/src/controls.ts` | `COLOR_GROUPS` (24 tokens, 8 groups); display-only `pickerHex` (OKLCH→sRGB hex); `pickedColorInput` (keeps alpha) |
| `apps/workbench/src/lifecycle.ts` | `forkTheme`/`diffThemes` replaced by `customThemeId` + `createCustomTheme` (Save As, deterministic id, revision 1) |
| `apps/workbench/src/layout.ts` | `initialPreviewWidth` removed |
| `apps/workbench/src/styles.css` | full-height preview column/body/viewport; compact selector; baseline styles removed |
| tests | `lifecycle.test.ts`, `packages/ui/src/quiet-workspace.test.ts`, 8 e2e files (see commits) |
| `tools/verify-workbench-theme-editor-polish.mjs` | phase frozen-boundary scan |

Nothing under `packages/core`, `packages/ui/src/{components,compositions,styles}`, `registry.json`, persistence,
preview messaging, product API/server, Design Command, Jev, dependencies, or lockfile changed (the scan asserts this).
`persistence.ts` is unchanged, so the internal `bases` record is still written on save and read on load; it isn't
shown in the UI.

## WTEP mapping

| ID | Evidence |
|---|---|
| 01 | scan: every changed file is in the admitted Workbench/test/doc/tool set |
| 02 | `quiet-workspace.spec` "preview fills the real right panel…" (iframe = panel width ±1px, ≥480px tall, inner `innerWidth` = frame width, tracks 390↔1440 resizes; no radios/fixed style); unit test: no fixed width in `App.tsx` |
| 03 | `theme-v2-live-controls.spec` colour test: `--primary` equal in chrome and preview after each edit; Save button's computed background = active primary; light/dark via Switch in `quiet-workspace`/`workbench` specs (html `.dark` + preview `data-mode`) |
| 04 | TSV2-13 staged test: preview `--radius` 0.5rem vs chrome 1.475rem, `#workbench-active-theme` revision unchanged, `staged-status` "not yet active" |
| 05 | unit: 24 tokens exactly once across the 8 approved groups; e2e: headings/triggers via `ControlSection`, per-group row order, one text input + one picker per token |
| 06 | unit: every built-in token's picker hex round-trips through `editColor` to canonical OKLCH, alpha kept; e2e: 5 formats live, invalid draft kept/inert/section forced open, picker → canonical OKLCH, export canonical |
| 07 | e2e: no fork/baseline text, `diff-empty` absent, no Fork button while locked or unlocked; proposal diff list still asserted; scan: terminology absent from presentation source |
| 08 | unit: `createCustomTheme`/`customThemeId` (derived ids, collisions, invalid names, source untouched); e2e: Save As cancel (focus returns to Save) / invalid / Enter-submit / selected + persisted / built-in unchanged / custom Save updates in place / reload; v1 legacy saved theme still loads |
| 09 | e2e: optgroups Built-in/Custom, `aria-label="Active theme"`, selection persists across reload, disabled while locked |
| 10 | `quiet-workspace.spec` divider test: 1px, border colour, no grip, hover colour change beside the line, resize cursor, focus ring, ARIA, End/Home/Arrow/pointer/clamps |
| 11 | Switch "Dark mode" enabled while locked and synchronizes shell + preview; toolbar has only Proposal / Export JSON / Save |
| 12 | proposal-preview, design-command, live-boundary, TSV2 specs pass unchanged in semantics (fork steps → Save As) |
| 13 | 390x844 + 1440x900, light/dark, reduced motion, containment, keyboard; decoded axe: 0 serious/critical |
| 14 | scan: registry 13 items byte-identical, 11 operations, frozen core/components/styles/server/messages/persistence, deps/lockfile identical, no credential/network surface in bundle or sources |
| 15 | **pending, external**: owner visual review |

## Commands and results (producer, darwin, Node v22.22.2, pnpm 12.5.1, Chromium 1243)

| Command | Result |
|---|---|
| `corepack pnpm install --offline --frozen-lockfile` | ok, local store only (node_modules was absent at dispatch) |
| `corepack pnpm test` | 35 files, 597 tests passed (595 at base; +Save As/groups/picker, −fork/diff) |
| `corepack pnpm typecheck` | passed |
| `corepack pnpm registry:build` | passed; `registry.json` unchanged |
| `corepack pnpm build:workbench` | passed |
| `corepack pnpm build:storybook` | passed |
| `WORKBENCH_PORT=5199 corepack pnpm test:browser` | Storybook 58 passed; Workbench 73 passed + 1 expected skip (desktop-only divider test at 390); Design Command live boundary 1 passed |
| Workbench matrix with JSON reporter, attachments decoded | 88 axe attachments, 48 distinct checkpoints, 0 serious/critical. The design-command spec attaches every impact level: 6 moderate `region`/`landmark-one-main` results (the shell has no `<main>` landmark, same as the base) |
| `node tools/verify-workbench-theme-editor-polish.mjs` | pass; frozen 164 files, sha256 `55a013c0…`, registry 13 (sha256 `a84137ef…`), 11 operations |

Scratch evidence (git-ignored, not committed): `coverage/wtep/evidence/` (logs, JSON report, decoded axe) and
`coverage/wtep/*.png` (producer screenshots for desktop/mobile, light/dark, staged, and Save As). The Lead should
regenerate its own evidence.

## Notes for owner review (not defects)

- The chrome now uses the active theme, so on fresh state it takes Default's large radius (pill inputs and buttons).
- Colour groups all start expanded, so every token is visible at once. Collapsing is per group.
- At 390px the toolbar wraps onto two rows: Dark mode, then the actions.
- Save As prefills `<built-in name> Custom`. A name matching an existing id gets `-2`, `-3`, … (e.g. `default-2`).

## Remaining

- WTEP-15 owner visual review; Lead acceptance evidence; protected fresh Codex STANDARD verification.
- **Single next safe action:** the Lead reruns the verification commands above on the candidate commit plus the
  scan, then arranges owner visual review before protected verification. No producer work is pending.
