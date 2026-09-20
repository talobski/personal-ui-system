# Post-V1 shadcn alignment checkpoint

Status: `RUNNING`; implementation route admitted, dispatch pending.

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
