# Producer checkpoint — workbench-theme-controls-polish-v1-001

Start: `2b840d0531c129e4a8bba3bb8078408c13f8e22a`.
Branch: `loop/workbench-theme-controls-polish-v1-001`.
Scope: PUI-31–PUI-37 / WTCP-01–WTCP-13. Producer candidate only;
no acceptance, promotion, protected verdict, or phase completion claimed.

## Implementation checkpoint

- Explicit square swatches, semantic rings, straight ordered rows, divider-free selector header.
- Default radius 0.7rem with 0.45/0.575/0.7/0.95rem derived scale; spacing 0.25rem.
  Historical conversion values are untouched; `ownerOverrides` records the approved changes.
  Fixture CSS and retrieval provenance hash match the new canonical Default.
- Toolbar uses direct Tailwind structure, p-4, official ghost Buttons and Lucide Download/Save.
  An internal UI library bridge consumes its existing dependency; manifests and registry are unchanged.
- Shared numeric row is label (w-24, flex-none), slider (flex-1), input (w-14, flex-none),
  unit (w-6, flex-none). Empty units retain the alignment slot. Visible Spacing keeps setSpacingBase.
- Shared content-width section trigger has muted tokens, uppercase tracking, and ring-1 ring-border/50.
  Intra-group gap is 8px and inter-group gap 24px under Default; divider/nested content padding removed.
- Sidebar selector, tabs, editor controls and preview/toolbar use a 16px main inset under Default.
- Exact Default system stacks show the approved ellipsis copy. Exact catalog matches show family names.
  Other stacks show category-specific custom copy; their full original stack is an accessible description.

## Criteria and evidence mapping

| Criteria | Producer evidence / Lead definitions |
| --- | --- |
| WTCP-01,12 | Phase verifier: exact path allowlist, all other tracked product files frozen, registry 18, operations 11, unchanged dependencies/schema/persistence/Jev/transport, bundle scan |
| WTCP-02 | Default fixture/conversion/CSS, default.test.ts and theme.test.ts; exact derivation, renderer golden comparison, provenance test |
| WTCP-03 | lifecycle.test.ts historical custom/save-selection regression; unchanged Quiet Editorial fixtures and persistence; existing default-equivalence browser suite |
| WTCP-04,05 | New phase browser definitions: swatches, computed geometry, toolbar padding/ghost/icons, keyboard export and Save As; existing theme-row/lifecycle browser tests |
| WTCP-06,07,08 | New phase browser definitions: numeric flex/width/center/containment, section styling/rhythm/focus/keyboard/pointer, 16px insets |
| WTCP-09 | fontControlCopy unit cases; new browser default/custom/catalog/accessibility/persistence cases; existing 24-font browser test |
| WTCP-10 | Existing Workbench, theme-v2-live-controls, proposal-preview, design-command and live-boundary suites retained; updated intentional baseline/ghost expectations |
| WTCP-11 | New phase browser test runs both configured viewports, light/dark × reduced/no-preference motion; decoded axe attachments, screenshots, focus and containment |
| WTCP-13 | Offline commands below; full browser matrix remains Lead-owned |
| WTCP-14 | Excluded from producer claim; protected verifier/Lead only |

## Commands and results

- `pnpm test`: initial run blocked before collection by system temporary-directory permissions.
- `mkdir -p dist/tmp`; `TMPDIR="$PWD/dist/tmp" pnpm test`: 37 files / 671 tests pass.
  First workspace-temp run identified one obsolete spacing mutation input equal to the new baseline;
  corrected it to 0.3rem and reran successfully. Negative CLI fixtures emit expected error JSON.
- `pnpm typecheck`: pass (core, UI, Workbench, e2e, Jev). Initial direct Lucide import failed;
  resolved through the existing UI dependency without modifying manifests.
- `TMPDIR="$PWD/dist/tmp" pnpm registry:build`: pass, 18 resources.
- `TMPDIR="$PWD/dist/tmp" pnpm build:workbench`: pass.
- `TMPDIR="$PWD/dist/tmp" STORYBOOK_DISABLE_TELEMETRY=1 pnpm build:storybook`: pass.
- `node tools/verify-workbench-theme-controls-polish.mjs`: pass, 273 frozen files,
  registry 18 / operations 11. The scanner excludes `.loop/` from file reads entirely.
- `git diff --check`: pass.
- Browser execution: not attempted, as assigned to Lead. No localhost permission expansion.
- Initial Git staging/commit: blocked by external worktree-index write permissions;
  product changes preserved in this worktree. Narrow local Git escalation requested separately.

Non-failing build advisories: Workbench large chunk (>500kB), Storybook dependency
module-level `use client` directive notices. No dependency changes made to address advisories.

## Exact changed files

1. `apps/workbench/src/App.tsx`
2. `apps/workbench/src/LiveControls.tsx`
3. `apps/workbench/src/controls.ts`
4. `apps/workbench/src/lifecycle.test.ts`
5. `apps/workbench/src/styles.css`
6. `e2e/quiet-workspace.spec.ts`
7. `e2e/theme-v2-live-controls.spec.ts`
8. `e2e/workbench-theme-controls-polish.spec.ts`
9. `packages/core/src/context/provenance.ts`
10. `packages/core/src/theme/default.test.ts`
11. `packages/core/src/theme/fixtures/default.conversion.json`
12. `packages/core/src/theme/fixtures/default.css`
13. `packages/core/src/theme/fixtures/default.json`
14. `packages/core/src/theme/theme.test.ts`
15. `packages/ui/src/lib/workbench-icons.ts`
16. `playwright.workbench.config.ts`
17. `tools/verify-workbench-theme-controls-polish.mjs`
18. `docs/WORKBENCH_THEME_CONTROLS_POLISH_CHECKPOINT.md`

## Remaining work and safe handoff

Browser definitions are typechecked, not execution evidence. Layout, focus, axe,
responsive toolbar wrapping and narrow numeric rows require Lead's exact-candidate matrix.
Run all three browser suites (Workbench, Storybook, Design Command live boundary),
attribute decoded reports/screenshots to the candidate commit, then obtain protected
cross-provider verification. No acceptance or promotion is authorized by this checkpoint.
