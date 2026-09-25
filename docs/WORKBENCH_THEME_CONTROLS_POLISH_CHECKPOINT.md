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
  narrow local Git escalation succeeded. Implementation checkpoint commit: `582ecac`.
  The subsequent verification-definition commit is the candidate HEAD; resolve it with `git rev-parse HEAD`.

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
19. `playwright.config.ts` (subsequent admitted routing correction)

## Remaining work and safe handoff

Browser definitions are typechecked, not execution evidence. Layout, focus, axe,
responsive toolbar wrapping and narrow numeric rows require Lead's exact-candidate matrix.
Run all three browser suites (Workbench, Storybook, Design Command live boundary),
attribute decoded reports/screenshots to the candidate commit, then obtain protected
cross-provider verification. No acceptance or promotion is authorized by this checkpoint.

## Bounded harness correction after Lead collection failure

Correction base: `e3f62dbd5a2d5fb98967ea15f63fd5f5d0af64bd`.
Lead reported that the phase spec's direct JSON import failed under Playwright/Node
before any browser case executed (missing JSON import attribute).

The spec now obtains Default through the existing typed `getValidatedTheme("default")`
export in `packages/core/src/context/themes.ts`. That boundary already uses JSON import
attributes and validates the canonical fixture. No product code, fixture, assertions,
acceptance criteria, dependency, or configuration changed. Only the phase spec and this
checkpoint changed in this correction.

Verification:

- `pnpm exec tsc -p e2e`: PASS, exit 0.
- `TMPDIR="$PWD/dist/tmp" pnpm exec playwright test -c playwright.workbench.config.ts e2e/workbench-theme-controls-polish.spec.ts`:
  BLOCKED, exit 1; preview server could not bind `127.0.0.1:5173` (`listen EPERM`).
  No browser case executed; no permission expansion attempted.
- Same Playwright command with `--list`: PASS, exit 0; all 10 cases collected
  across 390x844 and 1440x900, proving config/spec loading and the corrected import.
- `git diff --check`: PASS, exit 0.

Next safe action: Lead reruns the exact corrected candidate's browser matrix in its
authorized localhost environment. Collection success is not browser acceptance or promotion.

## Bounded Storybook routing correction

Correction base: `2f7b99bbd3b0f6b25bb4856ddbd860d6eff37a49`.
Lead reported 88 existing Storybook cases passed, but the Workbench-only phase spec
was also collected by Storybook because its `testIgnore` entry was missing.

Added only `workbench-theme-controls-polish.spec.ts` to `playwright.config.ts`
`testIgnore`. Workbench inclusion remains unchanged. This correction changes only
that config and this checkpoint; product code, test assertions, acceptance criteria,
and dependencies are untouched.

Verification (all exit 0):

- `TMPDIR="$PWD/dist/tmp" pnpm exec playwright test -c playwright.config.ts --list`:
  88 tests in 19 files; zero cases from the phase spec.
- `TMPDIR="$PWD/dist/tmp" pnpm exec playwright test -c playwright.workbench.config.ts --list`:
  102 tests in 7 files; all 10 phase-spec cases retained across both viewports.
- Collection counts independently checked with Node assertions against the output files
  `dist/wtcp-storybook-collection.txt` and `dist/wtcp-workbench-collection.txt` (local, ignored evidence).
- `pnpm exec tsc -p e2e`: PASS.
- `git diff --check`: PASS.

No browser execution or acceptance/promotion claim in this correction. Next safe action:
Lead reruns the corrected exact-candidate matrix. The existing phase verifier still
freezes `playwright.config.ts` and will reject this newly authorized config change;
its allowlist/assertions were not edited under this config-only correction envelope.
Lead must reconcile that explicit boundary-check mismatch before protected verification.

## Bounded accessibility and regression remediation

Remediation base: `15447eaf72c4c683293028585c9865865088eba9`.
Lead evidence for that base: Storybook 88/88 PASS; Workbench 67 passed,
2 intentional viewport skips, 33 failures; Design Command live boundary not reached.
This section supersedes the pending verifier-reconciliation note immediately above.

Diagnosis from the 33 local `test-results/*/error-context.md` reports:

- 25 failures stopped at axe color contrast on the new small section triggers.
  Default light renders muted-foreground approximately #737373 on opaque muted #f5f5f5;
  Lead's measured 4.34:1 is below 4.5:1. Exact opaque bg-muted plus unchanged
  muted-foreground is incompatible with the small-text contrast threshold.
- Four failures compared the deliberately screen-reader-only font label's typography
  against ordinary visible field labels. WTCP-09 intentionally removed that visible label.
- Two failures assumed the previous numeric-input-before-slider tab order; WTCP-06
  now places the slider before its numeric input.
- Two reduced-motion failures expected 1.5 after ArrowRight from the old 1.475 radius;
  WTCP-02 now starts at 0.7, so one 0.025 step produces 0.725.

Correction:

- Use `bg-muted/50` over the existing card surface, retaining exact
  `text-muted-foreground` for both text and icon, text-xs, content-width, rounded,
  uppercase/tracking-wide, and `ring-1 ring-border/50`. Half-strength muted gives
  approximately #fafafa under Default light and calculated contrast about 4.54:1.
  This is a scoped semantic-token-based surface adjustment, with no canonical theme
  changes. Existing ghost hover/focus behavior remains intact.
- Add a unit regression that proves opaque muted fails for Default light and the
  actual half-strength treatment exceeds 4.5:1 for Default light/dark, tied to the source class.
  Browser expectation now requires bg-muted/50; axe rules and impact filtering are unchanged.
- Compare the visible Typography Letter spacing label (textbox selected explicitly,
  since the slider shares its accessible name), preserving all removed-copy assertions.
  Test forward Tab from the section trigger to slider to input, then reverse Tab to slider.
  Update only the obsolete reduced-motion radius expectation to 0.725.
- Admit `playwright.config.ts` to the verifier with an exact whole-file comparison
  allowing only the already-authorized one-line Storybook exclusion. All other config
  content remains frozen. Verifier now passes with 272 fully frozen files plus this
  exact constrained config check; registry 18 and mutation operations 11 remain unchanged.

Exact files changed relative to this remediation base:

1. `apps/workbench/src/LiveControls.tsx`
2. `apps/workbench/src/lifecycle.test.ts`
3. `e2e/quiet-workspace.spec.ts`
4. `e2e/theme-v2-live-controls.spec.ts`
5. `e2e/workbench-theme-controls-polish.spec.ts`
6. `tools/verify-workbench-theme-controls-polish.mjs`
7. `docs/WORKBENCH_THEME_CONTROLS_POLISH_CHECKPOINT.md`

Commands and evidence (local ignored logs under `dist/wtcp-remediation-*`):

| Command | Result / log |
| --- | --- |
| `TMPDIR="$PWD/dist/tmp" pnpm test` | PASS, 37 files / 672 tests; `unit.log` |
| `pnpm typecheck` | PASS; `typecheck.log` |
| `pnpm exec tsc -p e2e` after the last locator edit | PASS |
| `TMPDIR="$PWD/dist/tmp" pnpm registry:build` | PASS, 18 resources; `registry.log` |
| `TMPDIR="$PWD/dist/tmp" pnpm build:workbench` | PASS; `workbench-build.log` |
| `TMPDIR="$PWD/dist/tmp" STORYBOOK_DISABLE_TELEMETRY=1 pnpm build:storybook` | PASS; `storybook-build.log` |
| `node tools/verify-workbench-theme-controls-polish.mjs` | PASS; `boundaries.json` |
| `git diff --check` | PASS |
| `TMPDIR="$PWD/dist/tmp" pnpm exec playwright test -c playwright.workbench.config.ts --list` | PASS, 102 tests / 7 files; `workbench-collection.txt` |
| `TMPDIR="$PWD/dist/tmp" pnpm exec playwright test -c playwright.config.ts --list` | PASS, 88 tests / 19 files; `storybook-collection.txt` |

Focused browser attempt:

```sh
TMPDIR="$PWD/dist/tmp" pnpm exec playwright test -c playwright.workbench.config.ts \
  e2e/workbench-theme-controls-polish.spec.ts e2e/theme-v2-live-controls.spec.ts \
  e2e/quiet-workspace.spec.ts --grep 'WTCP|removed copy|sliders respond|reduced motion' \
  --output dist/wtcp-remediation-browser
```

Blocked before any browser case executed: `listen EPERM 127.0.0.1:5173`, exit 1
(`dist/wtcp-remediation-browser.log`). No permissions broadened; Lead's original
failure artifacts remain untouched. Build advisories remain non-failing large-chunk
and dependency module-level `use client` notices.

Remaining Lead-owned work: rerun the full exact-candidate Workbench matrix, Storybook
regression, and Design Command live-boundary suite, including decoded axe and geometry
evidence, then protected verification. Calculated contrast/unit success does not substitute
for browser-measured contrast. No acceptance, promotion, or phase completion claimed.
