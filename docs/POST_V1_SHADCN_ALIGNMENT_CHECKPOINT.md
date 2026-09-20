# Post-V1 shadcn alignment checkpoint

Status: `DONE(verified)` — merged to `main` at `5d95fd4`.

## Preserved V1 record

V1 remains `DONE(verified)` at commit `86d5a64`, with 9/9 criteria verified and
8/8 agent runs used. Its acceptance records, evidence, budget, and completion
event were not rewritten.

## Bounded cleanup

The post-V1 unit is restricted to Card-based panels, Field/FieldLabel/FieldError
form structure, a shadcn-backed replacement for the two native selects, and
single-select ToggleGroups for mode and preview width. ResponsiveDialog, iframe
plumbing, native semantic markup, JSON download behavior, the native preview
scroller, and the three-item public component-contract catalog remain outside
the change.

## Separate phase budget

- one worker run;
- one concurrent worker;
- at most 12 worker calls/turns where enforceable;
- at most two changed attempts inside that one run;
- 90 minutes wall clock and 40k soft token target;
- paid budget 0 and included subscription capacity only;
- no second verifier agent; objective repository and browser commands provide
  acceptance evidence.

## Required fresh evidence

Unit tests, typecheck, registry build, workbench build, Storybook build, the full
Playwright browser matrix, light/dark coverage, and axe checks must all pass.

## Retrospective process finding

The read-only Claude audit worker `0625fbd9-8401-42f4-b7f1-82bca97d9294` was
launched before the Lead checked the completed V1 8/8 ceiling. It finished in
plan mode without modifying files, but the dispatch was inadmissible under the
then-current global per-project ceiling. This is recorded as an orchestration
mistake, not added to or used to rewrite V1's historical counter.

Corrective rule: every future worker dispatch must check both the active phase
budget and the global owner ceiling before workspace or agent creation.

## Budget admission resolution

The owner explicitly approved increasing global `maxAgentRunsPerProject` from 8
to 10. The updated policy retains paid budget 0, disabled temporary/separate/
overage/purchased capacity, and all authority boundaries. Its SHA-256 is
`b648efdc6aff412db9ddeb2aa434caaafb591c4e5dcdedd8dd4a480642460db8` and its
permissions remain `0600`.

The current lifetime reconciliation is 9/10 before cleanup: V1's immutable 8/8
snapshot plus the recorded audit mistake. The cleanup phase remains 0/1, so one
and only one worker is now budget-admissible.

## Claude route selection after unblock

The gate will freshly enumerate Claude routes and remove any route that is not
AVAILABLE, suitable for this cleanup, within the one-run phase budget, or covered
by included subscription capacity. One surviving route proceeds directly.
Multiple surviving routes require Jev `MODEL_CLASS` / `ROUTE_PROFILE` selection
using complexity, implementation difficulty, careful refactoring needs,
remaining Claude capacity, latency, prior reliability/failures, and included
capacity efficiency. The request and accepted or rejected typed result will be
logged in project-local `.loop/` state.

Fresh Paseo discovery reports Claude AVAILABLE. The only route surviving all
filters is `claude/claude-sonnet-5`, mode `auto`, medium thinking: it has this
project's verified worker-admission evidence and a prior successful workbench
run. Other discovered Claude models or modes lack route-specific admission
evidence, cannot edit, use prohibited bypass posture, or add strong/max/1M
capacity without a task-specific expected benefit.

With exactly one admitted route, canonical routing is deterministic and Jev was
not invoked. Selected route: `claude/claude-sonnet-5`, `auto`, medium.

## Pause checkpoint — 2026-09-21

The single Claude worker stopped without edits or a commit because the four
required shadcn registry sources were not cached locally and worker network use
was prohibited. The worktree remains clean at `9bb7a28`.

The Lead then ran only an official shadcn CLI dry-run for `card`, `field`,
`native-select`, and `toggle-group`. It fetched registry metadata but wrote
nothing. The dry-run identified seven source files to create: Card, Field,
Label, Separator, Native Select, Toggle, and Toggle Group. It reported only the
already-present `cn` and `radix-ui` dependency families.

Before that dry-run, the worker had accidentally started and cancelled a broad
filesystem search. macOS TCC later attributed protected access to the spawned
Claude Code process under Paseo and recorded Calendar, Photos, and generic
protected app-data services. No exact container path was exposed. This access is
not needed for the repository or provider route; no permission bypass or grant
was attempted.

Verification state at pause:

- implementation changes: none;
- unit tests: not rerun;
- typecheck: not rerun;
- registry/workbench/Storybook builds: not rerun;
- Playwright, light/dark, and axe matrix: not rerun;
- prior V1 evidence remains historical but will be stale once implementation
  changes begin.

Resume action:

1. Confirm the macOS privacy prompt is denied/closed and the desktop-managed
   Paseo daemon reconnects.
2. Apply the exact official registry command already dry-run for the four scoped
   components, then inspect the generated diff.
3. Resume existing agent `eb9542c3-978b-4a9f-bcf4-b8a9fa2fb613` in workspace
   `wks_d90751195a2e657e`; do not create a new worker.
4. Complete the bounded refactor and all required fresh verification.

The worktree and agent identity are intentionally preserved. No routing change,
new unit, paid capacity, deployment, publication, or authority expansion is
authorized by this pause checkpoint.

## Completion — 2026-09-21

The phase is `DONE(verified)`. The Lead role moved from Codex to Claude Opus 5
while the run was paused; no counter, budget, retry record, provider state,
authority boundary, or verification result was reset by that change.

The source blocker was resolved by the Lead running the already-dry-run official
registry command in the preserved worktree. It created the seven expected files
and changed no `package.json` or lockfile entry, because `cn`, `radix-ui`,
`class-variance-authority`, and `lucide-react` were already installed. The same
preserved worker `eb9542c3-978b-4a9f-bcf4-b8a9fa2fb613` was then resumed — no
replacement agent, no new workspace, no route change, no Jev call.

Delivered, at worker commit `36ab730` and main commit `5d95fd4`:

- a `Panel` wrapper composing shadcn `Card`, keeping `<section aria-labelledby>`
  and a real `<h2>`;
- `Field`, `FieldLabel htmlFor`, and `FieldError` for every form row, with
  `aria-describedby` added and existing `data-testid` values and message text
  preserved;
- `NativeSelect` for both previously raw selects; the composed `Select` was not
  needed;
- a `SingleToggleGroup` wrapper over `ToggleGroup type="single"` for the colour
  mode and preview width controls, ignoring the empty deselect value so one
  option stays selected.

`ResponsiveDialog`, iframe and postMessage plumbing, JSON download, the native
preview scroller, `registry.json`, and the three-pilot public contract catalog
are unchanged.

### Lead-run acceptance evidence

Every command was rerun by the Lead against `36ab730`; the worker's own report
was not accepted as evidence.

| Command | Result |
|---|---|
| `corepack pnpm test` | 13 files, 191 tests passed |
| `corepack pnpm typecheck` | passed |
| `corepack pnpm registry:build` | passed |
| `corepack pnpm build:workbench` | passed |
| `corepack pnpm build:storybook` | passed |
| `WORKBENCH_PORT=5199 corepack pnpm test:browser` | Storybook 4/4, workbench 4/4 |

Playwright keeps attachments only for failing runs, so the Lead reran the
workbench project with the JSON reporter and decoded all 28 axe attachment
bodies directly: every one is an empty array. Coverage spans 390x844 and
1440x900, light and dark, preview widths 390 and 1024, the dialog/drawer
replacement, keyboard flows, and the two new invalid-state checkpoints. After
the merge, `main` at `5d95fd4` re-ran 191 tests and typecheck clean.

Budget at completion: phase agent runs 1/1, worker calls 2/12, attempts 1/2,
lifetime agent runs 10/10, project calls 15/80, paid spend 0. V1 remains
`DONE(verified)` at `86d5a64` with its 9/9 criteria and immutable 8/8 record.

### Carried forward

- `registry.json` still publishes only the three V1 pilots. The added shadcn
  items and the two wrappers are internal workbench-shell composition, which
  matches the phase non-goal against broadening the public catalog. Publishing
  them is a separate owner decision.
- Port 5173 is held by an unrelated owner process (PID 27245). It was not
  stopped; verification used the supported `WORKBENCH_PORT` override.
- Lifetime agent runs are now exhausted at 10/10. Any further delegated work
  requires an explicit owner ceiling decision.
