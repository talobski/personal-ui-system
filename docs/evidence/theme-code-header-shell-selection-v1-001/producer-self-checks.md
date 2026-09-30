# Producer self-checks (PUI-138 to PUI-141)

Producer self-checks only; not acceptance evidence. Lead owns exact-candidate browser evidence and decoded axe.
Worktree-local `node_modules` were per-entry symlinks to the canonical install, with `@personal-ui/core` and
`@personal-ui/ui` pointing at this worktree's packages (verified by `realpath`); nothing was written to canonical.
Temporary files used the ignored repo-local `.worker-tmp/`.

## Commands and results

- `vitest run apps/workbench/src packages/ui/src`: 16 files, 233 tests passed.
- `tsc --noEmit -p apps/workbench`, `tsc -p packages/ui --noEmit`, `tsc -p e2e`: clean.
- `vite build` (apps/workbench): built; bundle contains the new copy and the `rounded-none` embedded inputs.
- `playwright test -c playwright.workbench.config.ts theme-code-header-shell-selection.spec.ts theme-action-export-dialog.spec.ts`:
  21 passed, 1 skipped (selection sweep runs once, desktop).
- Adapted historical specs (amber-dusk-shell-refinement, workbench-bitcoin-designsystem-shells, quiet-workspace,
  semantic-typography-history-grid, workbench-control-navigation-scroll, workbench-container-gallery-showcase,
  workbench-nested-gallery-interaction-polish, workbench-sidebar-theme-polish, workbench-theme-controls-polish,
  theme-v2-live-controls, ui-effects-showcase-polish, workbench.spec): 249 passed, 9 skipped, 4 failed on the first
  run, all in one CGS-10/11 structural probe that read the Switch's parent (now its tooltip wrapper). After adapting
  that probe, the test passed 4/4 in both projects. The full set was not re-run.

## Self-observed behavior

- Theme code: preview text equals clipboard text for JSON and CSS at 1440×900 and 390×844; no download events;
  dialog contained; tab order format tabs → Copy → code viewport → Close; PageDown/End scroll the viewport; Escape closes.
- The toolbar uses `bg-background` so muted copy-status text keeps its accepted contrast pair (on `bg-muted` axe
  reported 4.34:1 in Default light).
- Header: Delete glyph 14px in a 32×32 target with resting `foreground`, destructive on hover/focus; toolbar 64px.
  Tooltips for Toggle sidebar, Delete theme, Toggle dark mode, Undo, Redo, Reset theme; disabled Undo/Redo show their
  tooltip through the wrapper and stay natively disabled; no added tab stops.
- App shells: outer frames `box-shadow: none` with 1px semantic border; Inset body and sidebar resolve to `--sidebar`;
  tabs→first shell 32px (was 16), between shells 48px (was 32), labels 16px (was 14); no horizontal overflow.
- Selection: see `producer-selection-diagnosis.md`.

## Residuals

- Radix Tooltip's default hoverable-content grace area defers an adjacent trigger's tooltip when the pointer jumps
  directly across triggers in a single coarse move; continuous pointer motion behaves normally. The spec approaches
  controls from above the button row for this reason.
- `theme-action-export-dialog.spec.ts` is absent from the Storybook `playwright.config.ts` `testIgnore` at base
  (preexisting); only the new workbench spec was added there.
