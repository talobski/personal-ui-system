# Workbench preview interaction polish — producer checkpoint

Phase: `workbench-preview-interaction-polish-v1-001` (PUI-111, PUI-112, PUI-114, PUI-115, PUI-116, PUI-117)
Implementation base: `e9079cc9d39dca68d3cb017f51cc0c93ca490649` (accepted product `256c1c7`, accepted control `33f8992`)
Producer: Claude (`claude-opus-5-5`, medium), run 1 of the phase. This is authoring evidence only. It is not Lead
browser evidence, protected verification, acceptance or promotion.

## Preflight

- Base HEAD was `e9079cc` and the worktree was clean.
- Before any edit, the producer read `AGENTS.md`, `BRIEF.md`, the whole reconciled contract, all six frozen snapshots
  and `snapshot-hashes.json`. Every snapshot and the contract (`0e914e26…`) matched the manifest. Linear was not
  re-fetched and no `.loop` path (canonical or tracked historical) was opened or written.
- pnpm 12.5.1 was served from the Corepack cache present since 2026-09-20 (its cache directory is unmodified), so
  nothing was installed, updated or downloaded. No network, credentials, subagents, Paseo agents, paid capacity or
  permission escalation were used. Producer browser smoke used `127.0.0.1` only (`WORKBENCH_PORT=5391`, because 5173
  was already in use, and Storybook's fixed 6006).
- The tactile button surface effect is excluded and untouched.

## Commits

Checkpoint commits on `loop/workbench-preview-interaction-polish-v1-001`, in order: WPIP-07 App shells (the early
isolation checkpoint), WPIP-03/04 Chat and Weather, WPIP-05 Design system, WPIP-08 Bitcoin and order, superseded
geometry assertions, WPIP-06 reset toast, then the commit containing this file (verifier and checkpoint). That last
commit is the candidate; it cannot record its own SHA, so the Lead records it with `git rev-parse HEAD`.

## Changed files (28 including this file, all inside the verifier's admitted set)

- Product:
  - `packages/ui/src/compositions/team-chat.tsx` (PUI-111), `local-weather.tsx` (PUI-112), `app-shells.tsx`
    (PUI-116) and `bitcoin-price.tsx` (PUI-117).
  - `apps/workbench/src/DesignSystemPreview.tsx` (PUI-114), `Gallery.tsx` (PUI-117 order only) and `App.tsx`
    (PUI-115 toast only).
  - New `packages/ui/src/lib/toast.ts`: a re-export-only bridge to the installed Base UI Toast primitive. **Needs Lead
    reconciliation**: it is outside the contract's listed likely surfaces. The Workbench package cannot resolve
    `@base-ui/react` (only `@personal-ui/ui` depends on it), and adding the dependency would change a manifest and the
    lockfile. The bridge follows the accepted `lib/workbench-icons.ts` precedent and adds no registry item or dependency.
  - `packages/ui/src/components/sidebar.tsx` is **unchanged**, so the public Sidebar API and internals are byte-identical.
- Unit definitions: `apps/workbench/src/gallery.test.ts`, `previewViews.test.ts`, new `resetToast.test.ts`,
  `packages/ui/src/avatar.test.ts`.
- Browser definitions (Lead-executed): new `e2e/workbench-preview-interaction-polish.spec.ts` (Workbench config) and
  `e2e/composition-preview-interaction-polish.spec.ts` (Storybook config). Superseded assertions were migrated in place in
  `workbench-bitcoin-designsystem-shells`, `workbench-gallery-preview-expansion`, `workbench-gallery-card-polish`,
  `workbench-cards-gallery-curation`, `workbench-nested-gallery-interaction-polish`, `workbench-container-gallery-showcase`,
  `workbench-showcase-components-geometry`, `semantic-typography-history-grid`, `quiet-workspace` and `chart`.
- Configs: `playwright.workbench.config.ts` registers the Workbench spec; `playwright.config.ts` ignores it.
- Evidence: `tools/verify-workbench-preview-interaction-polish.mjs` and this file.

No test was deleted or skipped, no axe suppression was added or broadened, and no assertion count dropped in any
changed test file (the verifier enforces case counts, markers, viewport skips and `expect` counts against the base).
Replaced assertions, each contradicted by the contract:

| Superseded assertion | Replacement |
|---|---|
| Chat: no Avatar / MessageAvatar anywhere; send disabled, ghost, muted, skipped by Tab | Four decorative single-initial MessageAvatars on the alignment edge; send enabled, default (filled primary), reached by Tab, Enter/Space/click insert nothing |
| Avatar-user inventory excludes `team-chat.tsx` | Includes it (per-message avatars; no header) |
| Weather: forecast shows day, high and low; temperature and place are 600 | Day and high only, no `low` sr-only text; both follow the live Body weight |
| Design system: `Sidebar · base aliases` / `· dedicated` headings, `= alias` lines, OKLCH text, 48px squares, `type-scale-meta` | Plain `Sidebar` heading (rendered `SIDEBAR`), no alias lines, HEX text with the resolved value kept as `data-resolved`, 40px-tall full-width swatches, no summary line |
| Reset shows the inline `notice` | Floating toast with Undo; no inline notice |
| Bitcoin directly after Studio revenue; `1Y range` badge; visible source caption; no buttons | After the Chat pair and before the table; 1Y/3Y/5Y radio group (1Y checked); no caption; three radios |
| App shells share one held-open provider (`sidebar-wrapper` count 1, `h-108`, no trigger) | One provider per shell (count 3), `h-120`, one named trigger per shell; container sweep uses `[data-app-shells]` |
| Gallery order arrays and tab-stop order with Bitcoin second in the right region | Bitcoin fourth (after `recent-activity`); the gap chain is revenue → pair → Bitcoin → table |

## Design notes

- **WPIP-07 isolation.** The preview is a separate iframe document, so the Workbench provider's window listener and
  trigger cannot reach a shell, and a shell cannot reach them. Inside the preview, each shell is its own
  `SidebarProvider` (the frame) with `open` bound to shell-local state and `onOpenChange` ignored. This matters because
  every provider also answers the document-wide Cmd/Ctrl+B, and below the md viewport its toggle drives the unused
  mobile sheet. The shell's `SidebarTrigger` toggles only its own state (`aria-expanded`/`aria-controls` to its own
  Sidebar). Cmd/Ctrl+B inside a shell toggles that shell and stops propagation, so no document-wide listener sees it.
  The Sidebar stays on the in-flow `collapsible="none"` branch, carrying the official `group` /
  `data-state` / `data-collapsible` hooks, so the accepted icon-rail styles apply. The viewport-fixed desktop branch
  and the portalled mobile sheet are never mounted at any width. No Tooltip exists, so icon-only items keep their
  labels in the accessibility tree.
- **WPIP-06 Undo.** The toast's Undo calls the Workbench's existing `stepHistory(undo)` only while the active theme is
  still exactly the post-reset state (same id and revision, no proposal lock). Any later edit, toolbar Undo/Redo, theme
  switch or lock closes the toast. A fixed toast id prevents stacking. Base UI's `Toast.Close` is `aria-hidden` until the
  stack is hovered or focused, so Dismiss is an ordinary Button that closes through the manager.
- **WPIP-08 data.** `BTC_FIRST_OF_MONTH_USD` and its provenance comment are byte-identical to the base. 3Y (13 points)
  and 5Y (21 points) are quarterly. From 2025-01-01 they reuse the frozen observations. The 16 earlier points are
  approximate, rounded illustrative levels written from general knowledge, not retrieved, and labelled as such in code
  only. All ranges end on the recorded 2026-01-01 value, so the headline price is the same across ranges while the
  change differs: −8.52%, +433.99% and +205.67%.

## Commands and results (producer, offline)

- `pnpm exec vitest run` → 45 files, 874 tests passed.
- `pnpm typecheck` → passed (workspace packages, `e2e`, `tools/loop/jev`).
- `pnpm build:workbench`, `pnpm build:storybook`, `pnpm registry:build` → passed. `registry.json` and `public/r` are
  unchanged (23 items); the mutation union is 12 operations.
- `node tools/verify-workbench-preview-interaction-polish.mjs` → passed (27 changed paths before this file).
- Producer smoke (not acceptance): `pnpm test:browser:storybook` → 118 passed. The full Workbench config
  (`WORKBENCH_PORT=5391`) gave 402 passed, 18 skipped (existing desktop-only sweeps) and 2 failed. The two failures
  are listed under residuals.
- Not run by the producer: `test:browser:design-command-live` (Lead-owned) and the earlier phase verifiers, which pin
  their own bases and byte-freeze files that this phase is admitted to change.

## Residuals

1. `packages/ui/src/lib/toast.ts` sits outside the contract's listed surfaces (see above) and needs Lead reconciliation.
2. Some tests fail intermittently only under the full parallel Workbench run: WCN-05 overlay navigation (mobile
   dark), WSPF-09/10 preview ScrollArea and WSTP-10 shared ScrollArea. A different subset failed on each full run.
   Rerun in isolation, they passed (32/32 across two repeats). They are outside the touched surfaces. The producer did
   not rerun the base under the same load.
3. The 3Y/5Y pre-2025 levels are illustrative approximations, not source data (code-only provenance, no UI claim).
4. The Bitcoin card is slightly taller because the range control is `h-9`, where the badge was a small label. The
   accepted gallery-balance tolerance still holds.
5. Design system unpaired tokens (Border/Input/Ring, charts, `sidebar-border`, `sidebar-ring`) keep their token keys,
   because the contract is silent on them. The three Sidebar pairs share Background/Foreground wording; the second and
   third carry an sr-only `Sidebar primary` / `Sidebar accent` qualifier. Translucent tokens show `#RRGGBBAA`.
6. The shell frame height is `h-120` (480px, up from 432px, about 11%) at every width.
7. Accepted residuals are unchanged: the Default-theme contrast debt, the Bitcoin gallery-height consequence, and the
   narrow Type scale ellipsis with full DOM text.
