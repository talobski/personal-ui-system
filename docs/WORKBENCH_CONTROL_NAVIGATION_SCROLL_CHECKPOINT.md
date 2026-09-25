# Workbench control navigation scroll producer checkpoint

Phase: workbench-control-navigation-scroll-v1-001.
Prepared base: b6f1371f20374c2b77383f82baba874db986f5c7.
Status: bounded correction resumed from clean a88f20a68f917500bdf48794ba63785de6a7af2c. Current results are in the correction section below; the initial handoff record is historical. No acceptance or promotion claimed.

## Implementation checkpoint

ScrollArea source, public contract, provenance, retrieval metadata and closed
component-state constraints are present. Only this resource is added; the registry
has 19 items. The existing radix-ui dependency provides ScrollArea; no dependency
or lockfile edits are needed.

The implementation follows the official shadcn new-york-v4 Radix ScrollArea
composition (Root, Viewport, ScrollBar/Thumb, Corner). Source reference:
https://ui.shadcn.com/docs/components/scroll-area and the corresponding
shadcn-ui/ui registry/new-york-v4/ui/scroll-area.tsx. No network retrieval was
performed in this run. Local adaptations are explicit viewportProps for accessible
region naming/focus, and orientation for composing vertical/horizontal/both bars.
Radix owns input behavior; there are no custom scroll handlers.

## Scroll ownership

| Region | Treatment |
| --- | --- |
| Sidebar editor panels | Vertical ScrollArea in the remaining sidebar height; named, focusable viewport. SidebarContent no longer scrolls. |
| Sidebar category Tabs | Separate horizontal ScrollArea, fixed above editor; content-width non-wrapping Tabs remain official shadcn. |
| Right-panel status/proposal | Vertical ScrollArea below fixed toolbar, capped at 40dvh; preview keeps remaining space. |
| Preview iframe document | Native document scrolling, without the obsolete quiet-scroll class or CSS. |
| Browser document | Native; shell containment prevents an accidental second application scroller. |
| Select/Combobox listboxes | Existing primitive-native scrolling, unchanged. |
| Candidate operations code | Native horizontal overflow inside proposal content. |
| Save As/delete dialogs, drawers, sheets | Existing native primitive surfaces; the mobile sidebar retains its persistent editor ScrollArea. |

Scrollbar bars overlay content; semantic thumbs reveal on hover, active, and focus
within without changing dimensions. Native scrolling remains delegated to Radix.
The Workbench-only measurement-wrapper override prevents Radix's default table
wrapper from expanding vertical panels to their content's intrinsic width.

## Verification and criterion mapping

| Criteria | Implementation / evidence | Producer result |
| --- | --- | --- |
| WCN-01 | Bounded allowlist in tools/verify-workbench-control-navigation-scroll.mjs against the prepared base | Offline pass |
| WCN-02 | ScrollArea source/story/contract, closed constraints, catalog, retrieval kind, source hash, README, scroll-area.test.ts | Offline pass |
| WCN-03 | Exactly 19 registry items, identical existing entries, deterministic generated hashes; frozen dependencies, Theme v2, mutation/proposal/persistence/Jev | Offline pass |
| WCN-04 | Ownership table above; three application ScrollAreas, obsolete native CSS removed | Source pass |
| WCN-05/06 | Radix input and overlay geometry; e2e/scroll-area.spec.ts and e2e/workbench-control-navigation-scroll.spec.ts | Definitions/typecheck pass; browser unexecuted |
| WCN-07 | Opt-in quiet-control/quiet-control-group sans, 14px, normal weight, 20px line height, normal tracking; no color/state overrides | Source pass; computed browser evidence pending |
| WCN-08 | Shared three-column grid, explicit 6rem label and rem value/unit/gaps; endpoint spacing 0.1/0.25/0.5 browser definitions | Source pass; layout/input evidence pending |
| WCN-09 | Save and Export JSON alone use explicit size-3.5; proportional browser definitions at admitted spacing endpoints | Source pass; computed evidence pending |
| WCN-10 | Official Tabs, transparent list, content width, shrink-0, nowrap, text-sm; unchanged public state/focus styling | Source pass; keyboard/layout evidence pending |
| WCN-11 | Official Select controls Cards/States; content remains mounted and view state stays local to preview | Source pass; selection/content/centering evidence pending |
| WCN-12 | Only rounded-md → rounded-sm and chevron size-4 → size-3 in shared trigger; all other accepted classes unchanged | Source pass; keyboard/rotation evidence pending |
| WCN-13 | Existing App operation handlers and core lifecycle remain unchanged; full unit suite includes persistence, validation, proposals and offline Design Command boundary | Unit/source pass; browser regression pending |
| WCN-14 | Both admitted viewport projects, light/dark and reduced motion matrix, pointer/keyboard/touch-equivalent paths, axe definitions | Unexecuted, not claimed passed |
| WCN-15 | Commands below, frozen-source verifier, credential/network bundle scan, diff check | Offline pass; executable browser boundary remains blocked |
| WCN-16 | Fresh protected exact-candidate verification | Reserved for Lead; not performed or claimed |

Existing browser assertions were adapted only where the admitted requirements
supersede them: native scrollbar styling becomes overlay/native ownership,
preview Tabs become Select, numeric flex children become three grid columns,
and category typography becomes text-sm. No existing tests were deleted or
newly skipped. Public Input/Select/Combobox/Textarea/Button/Tabs/Sidebar sources
and all compositions are byte-frozen.

Applicable text+icon actions are Save and Export JSON. The icon-only Sidebar
toggle and delete action, Select/Combobox indicators, composition icons, and
preview component icons remain unchanged. ControlSection has its separately
specified size-3 chevron.

## Commands and results

All commands ran locally without credentials, network enablement, escalation,
or agent dispatch. TMPDIR was set to the worktree's temporary directory for
test/build commands. Raw outputs are in docs/evidence/workbench-control-navigation-scroll/.

- pnpm test: 38 files, 679 tests passed. The initial temp-directory failure
  and two assertions for superseded behavior were diagnosed before this final run.
- pnpm typecheck: passed all package, browser-definition and Jev typechecks.
- pnpm registry:build: passed; second generation has identical SHA-256 hashes
  for all 19 output resources (registry-determinism.json).
- pnpm build:workbench: passed; existing large-chunk warning retained.
- STORYBOOK_DISABLE_TELEMETRY=1 pnpm build:storybook: passed; upstream module
  directive warnings retained.
- node tools/verify-workbench-control-navigation-scroll.mjs: passed; 273 frozen
  tracked files, registry 19, operation union 11, built-client credential/network scan.
- pnpm exec playwright test -c playwright.workbench.config.ts --list:
  124 definitions in 9 files, including two established viewport-specific skips.
- pnpm exec playwright test --list: 94 definitions in 20 files.
- pnpm exec playwright test -c playwright.designcommand.config.ts --list:
  1 real-middleware boundary definition.
- pnpm test:browser:workbench: blocked before browser execution; Vite listen
  EPERM on 127.0.0.1:5173. No alternative server or permission escalation attempted.
  Storybook and real Design Command browser execution need the same unavailable
  local-listener capability and were not retried.
- git diff --check: passed.
- git add … && git commit …: blocked at index.lock creation before staging;
  no commit was created. The index was not modified.

## Candidate identity and remaining handoff

HEAD remains b6f1371f20374c2b77383f82baba874db986f5c7 (prepared base).
There is no new candidate commit SHA. The complete working-tree source digest
and exact changed-file inventory are recorded in boundary.json. The worktree
is intentionally left with the useful unstaged files; a clean committed status
cannot be truthfully confirmed under the read-only Git metadata capability.

The Lead must preserve/commit these exact files in an authorized environment,
run the 124 Workbench, 94 Storybook and 1 Design Command browser definitions,
and reserve the fresh verifier's review of the resulting exact clean candidate.
No phase acceptance, promotion, reusable-rule promotion, or criteria change
has occurred.

Residual risks: renderer-dependent overlay geometry, focus auto-scroll, touch,
nested proposal/code behavior, Select navigation, theme-spacing endpoints,
and axe remain unmeasured in this worker. New browser definitions may require
diagnosis in the Lead's renderer. The already accepted sub-16px iOS input zoom
tradeoff remains; public primitive mobile text defaults are unchanged.

## Environment

Initial pnpm test could not create its temporary SSR directory outside the
worktree. Retrying with TMPDIR inside this worktree requires no permission or
network expansion. Shell heredoc temporary files were also blocked; edits use
ordinary worktree writes. No escalation was requested.

## Bounded correction after Lead browser run

Continuation base: a88f20a68f917500bdf48794ba63785de6a7af2c, verified clean
before edits. This is the same admitted producer run.

Lead-reported evidence for that base: Storybook 94/94 passed; Workbench
103 passed, 2 intentional skips, 19 failed. These are Lead results, not worker
executions. The retained test-results error contexts confirm the mobile
WRCP dark/reduce failure also stopped at Preview Select returning Cards;
it is not an additional axe failure.

Correction rationale and exact source changes:

- App.tsx bounds the existing Tabs flex item and the horizontal ScrollArea root
  with width/min-width/max-width and overflow containment. Content-width tabs
  still overflow and scroll inside the Radix viewport. No other scroll owner changes.
- styles.css explicitly assigns muted-foreground only to Workbench placeholder
  pseudo-elements. LiveControls.tsx gives the shared color field a meaningful
  format placeholder, so empty drafts render a real placeholder. Filled foreground,
  Field's destructive invalid foreground, selected colors, disabled opacity, and
  public primitive defaults are not overridden.
- workbench-navigation.ts introduces one shared containment assertion. It excludes
  only tab triggers inside the specifically named horizontal viewport from the
  legacy descendant-box check. It still rejects overflowing editor controls and
  asserts the document, sidebar-content, sheet, ScrollArea root and viewport bounds.
  theme-v2-live-controls.spec.ts and quiet-workspace.spec.ts use that assertion;
  mobile selected tabs must also remain in the viewport.
- workbench-control-navigation-scroll.spec.ts retains the placeholder/filled
  distinction and adds exact semantic-token checks, the real empty placeholder
  state, unchanged revision for rejected drafts, and recovery to filled foreground.
  Its old invalid-text-equals-filled assertion was inconsistent with the unchanged
  public Field destructive state; it now checks the actual destructive token and
  waits for the existing color transition.
- workbench-rendering-controls-polish.spec.ts waits for the Select to open and the
  Cards option to receive focus before End; it asserts States focus/highlight before
  Enter and then checks selection, closure and returned trigger focus. The original
  sequence sent End/Enter while asynchronous popup focus could still be settling.
  This is a synchronization diagnosis from source and retained failures, not a claim
  of measured browser recovery. No primitive or product keyboard handler changed.
- The phase verifier admits the directly affected legacy test file, checks the new
  placeholder/containment rules, and additionally restricts all changes from the
  correction base to this ten-file source/test/verifier/checkpoint set and named
  correction logs. No axe thresholds, test exclusions or acceptance criteria change.

Offline results: pnpm test passed 679/679 in 38 files; pnpm typecheck passed;
pnpm build:workbench passed with the existing chunk warning. Focused Playwright
collection passed with 78 tests across the four affected files. Browser execution
again failed before launching tests: listen EPERM at 127.0.0.1:5173. Retained
Lead browser artifacts were not overwritten; the attempted worker run used
.tmp/correction-browser. Initial registry and Storybook checks were not replayed:
their sources are untouched by this correction.

Exact Lead rerun commands (both admitted viewport projects remain enabled):

    pnpm build:workbench
    pnpm exec playwright test -c playwright.workbench.config.ts workbench-control-navigation-scroll.spec.ts workbench-rendering-controls-polish.spec.ts theme-v2-live-controls.spec.ts quiet-workspace.spec.ts
    pnpm test:browser:workbench
    node tools/verify-workbench-control-navigation-scroll.mjs

Raw correction logs live beside the initial producer logs with correction- prefixes.
Correction geometry, semantic computed styles and keyboard results remain pending
the Lead renderer; fresh protected verification remains pending as well.

Correction closeout: phase boundary verification and git diff --check passed.
The commit attempt failed before staging because Git could not create
/Users/emmantalob/dev/personal-ui-system/.git/worktrees/workbench-control-navigation-scroll-v1-001/index.lock
(EPERM). The index remains unchanged. HEAD is still
a88f20a68f917500bdf48794ba63785de6a7af2c; no correction commit SHA exists and
clean status cannot be claimed. No escalation or alternate Git metadata path
was used. The Lead must commit the preserved correction in an authorized
environment before exact-candidate browser/fresh verification.
