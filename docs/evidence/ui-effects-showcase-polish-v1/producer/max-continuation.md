# MAX producer continuation checkpoint

Phase: `ui-effects-showcase-polish-v1-001`. This is a partial producer checkpoint, not acceptance.

Handoff HEAD remains `b371ea9e435fdaa19ca4bef577c11c6a1da47e2a`, tree
`3a897d83aa0d90f1a42ecee2bc049601d01c22ea`. Both matched the dispatch before edits;
the workspace was clean. The handoff browser log matched SHA256
`318a13db454a1aa245e0039efec5d28bfa61ce523bdc0ab7337fdd140368537c`.
The frozen four-ticket packet, manifest and contract are unchanged. No canonical
`.loop` access, agent launch, network enablement, credential use, escalation,
promotion, or external publication occurred.

## Failure disposition

`max-failure-disposition.json` maps every numbered failure in the original log
to its test, criterion, cause and proposed repair. All browser repairs remain
unverified in a renderer on this edited workspace.

| Original failures | Count | Disposition |
| --- | ---: | --- |
| 1, 32 | 2 | Product accessibility gap: disabled Strength lacked ARIA disabled semantics. Add inherited `aria-disabled` on the Workbench Slider root; retain the public Slider implementation/API. Test the slider role's disabled state, absent tab stop and value. |
| 2, 33 | 2 | Test sampled Cards' active-to-inactive shadow transition. Await iframe animations before complete style equality. |
| 3, 34 | 2 | New test supplied invalid hyphenated theme names. Use valid names with unchanged IDs. Enable Tactile to edit Strength, then return Off to prove retained strength on Save. |
| 4, 35 | 2 | New test used nonexistent `Sidebar primary` editor label. Scope the unchanged `Primary` label to the Sidebar section. |
| 5–8, 23, 36–39, 55 | 10 | PUI-120 adds one inert Storage action. Keep no-promotion/usage coverage, exact button identity, card tail geometry and stable interaction footprints. |
| 9–12, 40–43 | 8 | PUI-120 surface tab list replaces transparent background; retain scrolling and keyboard checks. |
| 13–14, 44–46 | 5 | Add Storage to exact source/focus order; retain visited-order equality. |
| 15–16, 47–48 | 4 | Include default list's 6px total padding in natural-width equation; retain tolerance, containment and keyboard checks. |
| 17–18, 49–50 | 4 | PUI-122 contextual Sidebar wording and title-case heading supersede old labels; preserve painted color, HEX, alias/dedicated value, shape and accessibility checks. |
| 19–22, 28–31, 51–54, 61–64 | 16 | PUI-120 Secondary triggers replace muted/ring chips. Keep geometry, typography, hover, focus, collapse and axe checks. |
| 24–27, 56–59 | 8 | PUI-120 surface tabs and Secondary triggers supersede previous styling. Keep original geometry tolerances and keyboard checks; require measured AA contrast in both modes and absence of old trigger debt. |
| 60 | 1 | Unresolved desktop dark/reduce PageDown failure. Assertion and product scrolling unchanged. Existing intermittency is not proof this occurrence is pre-existing. Requires candidate/base browser evidence. |

Totals: 55 superseded presentation assertions, 6 test defects, 2 instances of
the accessibility gap, 1 unresolved scroll failure. These are classifications
of first failures, not a claim that later assertions or all browser tests pass.

## Changed-path reconciliation

Relative to handoff:

- `apps/workbench/src/LiveControls.tsx`: one ARIA attribute on numeric Slider root.
- `e2e/tactile-ui-effects.spec.ts`: disabled-role assertion and transition settling.
- `e2e/ui-effects-showcase-polish.spec.ts`: valid saved-theme fixtures, correct disabled-strength interaction and scoped Sidebar locator.
- `e2e/workbench-cards-gallery-curation.spec.ts`, `e2e/workbench-container-gallery-showcase.spec.ts`, `e2e/workbench-showcase-components-geometry.spec.ts`: Storage action expectations and preserved geometry/usage checks.
- `e2e/workbench-control-navigation-scroll.spec.ts`, `e2e/workbench-nested-gallery-interaction-polish.spec.ts`: surface tabs and Storage focus order.
- `e2e/workbench-preview-interaction-polish.spec.ts`: Design system display wording.
- `e2e/workbench-rendering-controls-polish.spec.ts`, `e2e/workbench-theme-controls-polish.spec.ts`, `e2e/workbench-sidebar-preview-followup.spec.ts`: Secondary triggers/default surface tabs; geometry, keyboard and accessibility coverage retained.
- `playwright.config.ts`: route the Workbench-only new spec exclusively to its existing Workbench config. Storybook otherwise discovered it incorrectly. No test removed from Workbench or skipped.
- `tools/verify-ui-effects-showcase-polish.mjs`: admit that routing config; inspect pending tracked changes as well as committed changes, preventing stale HEAD-only scans. Frozen boundaries unchanged.
- This report, per-failure JSON and evidence manifest: producer handoff only.

No test cases deleted, new skips added, tolerance broadened, public component
changed, or dependency added. Theme 3.0, 13 operations and 23 registry resources
remain checked by the phase guard. All three prior product commits and the WIP
test checkpoint remain ancestors of the unchanged HEAD.

## Commands and results

All pnpm commands used `COREPACK_ENABLE_NETWORK=0` and ignored repo-local
`TMPDIR=$PWD/.worker-tmp/max-tmp`. Final offline commands ran sequentially.
Raw logs are retained under `.worker-tmp/max-*.log`; the evidence manifest pins
their hashes and the changed tracked bytes.

| Command | Result |
| --- | --- |
| `pnpm test` | PASS, 47 files / 907 tests |
| `pnpm typecheck` | PASS after correcting a test import during editing |
| `pnpm build:workbench` | PASS; existing bundle-size warning |
| `pnpm build:storybook` | PASS |
| `pnpm registry:build` | PASS |
| `node tools/verify-ui-effects-showcase-polish.mjs` | PASS, 36 tracked paths from prepared phase base; frozen hashes, geometry evidence, 13 operations, 23 resources |
| `git diff --check` | PASS |
| `pnpm exec playwright test --list` | Discovery only: 118 Storybook tests / 23 files |
| `pnpm exec playwright test -c playwright.workbench.config.ts --list` | Discovery only: 440 Workbench cases / 22 files, established skips unchanged |
| `pnpm exec playwright test -c playwright.designcommand.config.ts --list` | Discovery only: 1 credential-empty boundary test |
| `pnpm exec playwright test -c playwright.workbench.config.ts ui-effects-showcase-polish.spec.ts --workers=1 --grep IESP-02` | BLOCKED before tests: `listen EPERM 127.0.0.1:5173` |
| `git add` on the 12 initially edited paths | BLOCKED: worktree metadata `index.lock` creation denied |

Two shell heredoc attempts also failed to allocate a temporary file; neither
executed its Python edits. Subsequent edits used the file patch tool or inline
Python without heredoc temporary files. Git/Python's system launcher emitted
`/tmp/xcrun_db` warnings; read-only Git commands and inline Python still completed.
No denied bind or Git write was retried through another tool or permissions.

## Residuals and continuation

The current sandbox permits project-file edits but denies both localhost binding
and writing this worktree's Git metadata outside the writable root. Therefore no
new commit/tree can truthfully be supplied and the workspace is dirty. A patch
of tracked edits is preserved at `.worker-tmp/max-continuation.patch`; new evidence
files remain in the producer evidence directory. Do not reapply that patch on
this workspace: the changes are already present.

Full Workbench browser, Storybook browser, credential-empty Design Command
browser and focused visual/axe checks remain unrun on these edits. Their shared
localhost capability is blocked; they were not repeatedly attempted. Review of
two handoff captures (light tactile sidebar and narrow Sidebar swatches) and
the prior before/after geometry data is historical supporting context only.
No new screenshots or decoded axe pass is claimed.

Lead must review/preserve and commit the existing edits in its authorized Git
environment, rebuild, execute the focused failing specs and complete browser
gates on the exact candidate, and investigate failure 60 without weakening its
keyboard-scroll assertion. The fresh protected opposite-family verifier and
Lead acceptance/promotion remain outstanding. No second producer dispatch or
permission expansion is requested by this checkpoint.
