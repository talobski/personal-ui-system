# Post-V1 shadcn alignment checkpoint

Status: `PAUSED(budget)` before implementation dispatch.

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

## Admission blocker

The global policy at `~/.loop-engineering/policy.json` still sets
`maxAgentRunsPerProject` to 8. The repository contains no existing project- or
phase-override mechanism, and inventing one ad hoc would violate the canonical
budget gate. Therefore the cleanup worker is not yet deterministically
admissible.

The smallest existing-schema remediation is an explicit owner-approved increase
of the global per-project ceiling from 8 to 10: one slot accounts for the
already-observed post-V1 audit mistake and one slot admits the single cleanup
worker. The phase-local one-run ceiling would remain the tighter limit for this
work. No global policy change has been made at this checkpoint.

## Claude route selection after unblock

The gate will freshly enumerate Claude routes and remove any route that is not
AVAILABLE, suitable for this cleanup, within the one-run phase budget, or covered
by included subscription capacity. One surviving route proceeds directly.
Multiple surviving routes require Jev `MODEL_CLASS` / `ROUTE_PROFILE` selection
using complexity, implementation difficulty, careful refactoring needs,
remaining Claude capacity, latency, prior reliability/failures, and included
capacity efficiency. The request and accepted or rejected typed result will be
logged in project-local `.loop/` state.

No Claude route is currently admitted because the global agent-run budget fails
before provider/model selection. Jev has therefore not been invoked for this
phase yet.
