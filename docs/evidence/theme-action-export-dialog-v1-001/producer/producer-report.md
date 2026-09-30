# Producer report — theme-action-export-dialog-v1-001

Producer: Claude Opus 5.5 (bounded single producer). Base prepared commit
`431fab08c30b8d2e03a7dc5597e6212d42c1031e`. Scope TAED-01..06 only. This report is not Lead acceptance; TAED-07
evidence, verification and closeout remain Lead-owned.

Packet check: `shasum -a 256` of `PUI-134.json`, `PUI-135.json` and `PUI-136.json` matched `snapshot-hashes.json`.

## Changes

| Criterion | Change |
| --- | --- |
| TAED-01 | Toolbar Export is now the trigger of an `Export theme` shadcn `Dialog` (`@personal-ui/ui/components/dialog`, not the Drawer-switching ResponsiveDialog). Opening downloads nothing. Format selector is the existing shadcn `Tabs` (`JSON`, `CSS / Tailwind v4`, arrow-key roving), resetting to JSON on each open. The active tabpanel is the focusable, internally scrolling preview (`overflow-auto`, `min-h-0`), containing a read-only `<pre><code>` in `font-mono whitespace-pre`. Footer: polite status line, `Copy` (outline), `Download` (default). Dialog is `max-h-[calc(100dvh-2rem)]`, `sm:max-w-2xl`, keeping the accepted close button, Escape, overlay and focus trap. |
| TAED-02 | New `exportThemeCss(theme)` in `apps/workbench/src/lifecycle.ts` returns `renderShadcnTailwindCss(theme)` unchanged (`:root`, `.dark`, `@theme inline`, utilities, and the UI Effects block while Tactile) with filename `<id>.theme.css`. `exportThemeJson` is untouched (`<id>.theme.json`). `exportFile(theme, format)` produces one `{ filename, content, type }` per selected format, memoized on open/theme/format; preview text, `navigator.clipboard.writeText` and the download `Blob` all use that `content`. The download helper is generalized from JSON-only to `{ filename, content, type }` (`application/json` / `text/css`). No second renderer, no highlighting dependency. |
| TAED-03 | Delete moved out of the Sidebar header (`SidebarMenuAction`) into the toolbar right cluster, rendered only for an active saved custom theme, immediately before the dark-mode Switch and followed by the shared `ToolbarSeparator` (`bg-border`, `role="separator"`). Ghost icon Button, existing `TrashIcon`, `aria-label` and `title` `Delete theme`; resting `text-muted-foreground`, destructive text/background tint on hover and destructive ring/text on focus-visible. Confirmation dialog, copy, `deleteActive` guard (`locked || builtInCopy || !Object.hasOwn(saved.themes, …)`), persistence and history untouched. The now-dead `group-has-data-[sidebar=menu-action]/menu-item:pr-11` select-trigger padding was removed. |
| TAED-04 | Custom Save success → toast `Theme saved`; built-in Save As success → toast `Theme saved as custom theme`; both clear the inline notice instead of setting one. Audit below. |
| TAED-05 | Same Base UI toast manager and single `Toast.Root` surface; class gains explicit `border-border` (already `bg-popover text-popover-foreground shadow-lg`). Success toasts use one id (`workbench-success`), update in place, Base UI default timeout, no action; Dismiss remains. Reset toast id/copy/Undo guard/Dismiss/8 s timeout unchanged; its `data-testid="reset-toast"` is preserved and other toasts use `success-toast`. |
| TAED-06 | No change to core, Theme v3 (3.0), mutations (13), registry (23), persistence, history, Design Command, dependencies/lockfile, UI package components or public APIs. |

### TAED-04 theme-action success audit

| Action | Before | After |
| --- | --- | --- |
| Save (custom) | inline `Saved "…" locally.` | toast `Theme saved`; `Not saved: …` error stays inline |
| Save As (built-in) | inline `Saved "…" as a custom theme. … is unchanged.` | toast `Theme saved as custom theme`; field validation/errors stay in the dialog |
| Delete (custom) | inline `Deleted "…". Default is now active.` | toast `Theme deleted`, description `“…” was removed. Default is now active.` (routine success of the same kind; the active-theme change is still announced); `Not deleted: …` error stays inline; confirmation unchanged |
| Reset | toast (PUI-115) | unchanged, shared surface |
| Export | immediate download, no feedback | dialog; no open feedback added. Copy shows an in-dialog polite status (`Copied to clipboard.`) and an explicit failure message; no toast |
| Import | no Workbench import action exists | nothing to change |
| Theme selection, Undo/Redo | no success feedback (clear notice) | unchanged |
| Design Command stage/apply/discard | inline proposal status in the Command panel | unchanged (Design Command boundary; review status, not a local theme action) |

## Test updates

Existing source-contract unit tests that pinned the old Export `onClick`, Sidebar Delete, inline success strings,
toolbar order and TabsList count were updated to the new contract (`lifecycle`, `history`, `resetToast`, `uiEffects`).
New `apps/workbench/src/exportDialog.test.ts` covers CSS/JSON identity and the source contract.

E2E: new shared helper `downloadExport` in `e2e/workbench-navigation.ts` (open Export → optional format → Download →
Escape). Eight specs that relied on immediate download now use it; `workbench.spec.ts` and `quiet-workspace.spec.ts`
assert toasts instead of inline Save As/Delete notices, and the quiet-workspace delete test asserts the toolbar
placement. New `e2e/theme-action-export-dialog.spec.ts` is registered in `playwright.workbench.config.ts`.

## Checks (offline, `COREPACK_ENABLE_NETWORK=0`, `TMPDIR=<worktree>/.worker-tmp`)

Dependencies: gitignored `node_modules` symlinks into the canonical checkout (as in the prior phase). Core is not
changed by this phase and canonical `packages/core` is identical to the base, so canonical-core resolution does not
affect results.

| Check | Result |
| --- | --- |
| Packet hashes (`shasum -a 256` vs `snapshot-hashes.json`) | 3/3 match |
| Workbench typecheck (`apps/workbench`: `tsc --noEmit`) | pass |
| e2e typecheck (`tsc -p e2e --noEmit`) | pass (also after the post-run spec fixes) |
| Unit (`vitest run apps/workbench/src packages/core/src/theme packages/core/src/mutations`) | 20 files, 542 passed |
| Workbench build (`vite build`) | built |
| Boundary diff vs base (`pnpm-lock.yaml`, `package.json`s, `registry.json`, `packages/`) | empty; registry 23 items |
| Phase browser spec `theme-action-export-dialog.spec.ts` (`playwright.workbench.config.ts`, 1 worker, port 5391, 390x844 + 1440x900) | 14/14 passed (the first run hit 4 failures from a test locator matching Radix's hidden inactive tabpanel; the locator was fixed and those 6 TAED-01/02 cases then passed; the other 8 passed in the first run) |
| Affected existing specs (10 files: quiet-workspace, workbench, amber-dusk-shell-refinement, ui-effects-showcase-polish, workbench-container-gallery-showcase, workbench-nested-gallery-interaction-polish, theme-v2-live-controls, workbench-theme-controls-polish, workbench-preview-interaction-polish, semantic-typography-history-grid) | **216 passed, 7 failed, 9 skipped (14.7m)**; log `.worker-tmp/affected-e2e.log` (not committed) |

### The 7 affected-spec failures (test-only assumptions; fixed in specs, not rerun)

1. `theme-v2-live-controls.spec.ts:124` (WTEP-08), mobile and desktop, and `workbench.spec.ts:63` (lifecycle), light
   and dark on mobile and desktop (6 failures): after Save or Save As, an unscoped `page.getByRole("dialog")` was
   asserted to have count 0. Base UI `Toast.Root` exposes `role="dialog"`, as the accepted Reset toast already did,
   so the new success toast matched. Fix: scope the assertion to `{ name: "Save as a custom theme" }` and assert the
   success toast. The phase spec's Reset confirmation locator was scoped similarly as a precaution.
2. `workbench-nested-gallery-interaction-polish.spec.ts:610` (NGIP-12/13), mobile only (1 failure): the Export flush
   assertion passed, but the test opens Export programmatically while the modal mobile editor sheet is open. The
   Radix Export dialog dismisses that sheet, so the Save half could not find the Primary field. A real mobile user
   cannot reach Export while the modal sheet covers the toolbar. Fix: reopen Colors (`editorCategory`) before the
   Save half.

These fixes were made after those files had already been loaded by the run. The owner then directed no further broad
tests, and the targeted rerun of these 7 cases was declined, so the fixes are **unverified in a browser**. Lead
should rerun these 7 cases on the candidate.


## Residuals

- The 7 affected-spec fixes above have not been rerun (see Checks).
- Producer browser checks are self-checks only; Lead owns exact-candidate evidence and decoded axe review (TAED-07).
- Delete success toast title `Theme deleted` is a producer choice under the TAED-04 audit (no approved copy exists).
- The Export format TabsList is an ordinary surface list, so it receives the fixed Tactile TabsList ring when the
  active theme is Tactile, like the editor category list.
- Accepted residuals (Bitcoin gallery height, narrow Type scale ellipsis, Default contrast debt, intermittent browser
  tests, deferred CSS parse duplication) untouched.
