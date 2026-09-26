# Workbench nested gallery interaction polish — producer handoff

Phase: `workbench-nested-gallery-interaction-polish-v1-001`

Accepted product base: `a33c3d025fe408593264b96f76f4f6054d83b758`

Prepared implementation base: `8d364b14ea70c4fb2192918033d21b5a0c6363d2`

This checkpoint records an owner-requested provider handoff from the sole
authorized Astra MAX producer to Claude STRONG. It is not acceptance,
verification, or a claim that the implementation is complete.

## Completed or substantially implemented by Astra

- Reproduced the flat-gallery defect in source: Productive Week and Account
  Profile shared a global row, so the taller profile delayed Team Access.
- Added a frozen old-layout fixture for regression evidence.
- Replaced the global span recipe with explicit gallery-owned activity and
  profile/action stacks, a full Workspace Settings region, and a local final
  pair. Removed `PreviewLayout` and global span metadata.
- Replaced the centered Cards / States Select with left-aligned official
  shadcn Tabs and extracted the shared Workbench category trigger class.
- Changed shared `ControlSection` chrome away from Heading and added a shared
  Body-role trigger hook.
- Updated both built-in Theme v3 fixtures and generated CSS so Heading uses the
  built-in's sans Body stack; retained weights, tracking, Mono, and arbitrary
  legacy migration semantics in tests/provenance edits.
- Added the approved recovery/file separator, visible `Export` label, and
  enabled-only pointer treatment for Undo / Redo / Reset.
- Added a shared `ColorPickerController` and focused tests for 120 ms
  latest-wins scheduling, immediate completion flush, stale callback
  invalidation, replacement controls, and a single history checkpoint across
  a pause. Semantic and shadow pickers use immediate local color feedback.
- Added a native `change` listener because React may deduplicate a completion
  event following `input` with the same value.

## Current verification state

Focused offline run on the preserved handoff state:

```text
147 tests collected across seven files
146 passed
1 failed
```

The sole failure is a stale source-string assertion in
`apps/workbench/src/lifecycle.test.ts` that still expects the old unconditional
`cursor-pointer` class on Undo / Redo / Reset. Product code now uses the
contracted `enabled:cursor-pointer disabled:cursor-default` treatment.

Passing focused coverage includes gallery, color-picker controller, history,
lifecycle except that stale assertion, Default fixture, migration, and Theme
v3 tests. `git diff --check` passes. No full unit suite, complete typecheck,
build, phase verifier, or browser matrix has run on this handoff state.

## Remaining bounded work for Claude

1. Audit every uncommitted Astra change against NGIP-01 through NGIP-16;
   preserve valid work and correct only demonstrated defects.
2. Update stale unit/browser assertions for the contracted UI changes without
   deleting coverage or weakening thresholds.
3. Complete dedicated browser definitions for:
   - old dead-space reproduction and independent-region correction;
   - wide/medium/mobile nested gallery containment and DOM/focus order;
   - shared Cards / States Tabs keyboard/ARIA/focus behavior;
   - Body typography on collapsible triggers;
   - toolbar grouping and labels;
   - picker local immediacy, debounce timing, release/blur flush,
     latest-value behavior, and exactly one Undo checkpoint.
4. Review the debounce integration around theme switching, proposal locking,
   mode changes, Save/Export, command evaluation, unmount, and text edits.
   Ensure no stale timer can mutate a different theme or race proposal state.
5. Run the full unit/typecheck/registry/build suite, preserve exactly 19
   resources and 12 operations, and add the phase boundary verifier.
6. Commit a clean final candidate and update this checkpoint with exact
   evidence and remaining risk. Lead owns formal browser acceptance.

## Known review points

- `App.tsx` contains supporting revision/base handling changes made for delayed
  picker commits and command/save boundaries. They must be justified by the
  history/proposal invariants or simplified; do not accept them merely because
  they are present.
- The `LiveColorField` native listener/effect formatting and lifecycle deserve
  a careful correctness/readability pass.
- The initial gallery grouping is configuration, not taxonomy. Minor bounded
  regrouping is allowed only with browser evidence and the admitted invariant.
- No dependency, lockfile, registry, public resource, schema, persistence,
  operation, credential, network, Jev, or external-action expansion is allowed.

## Handoff integrity

- Same phase, worktree, branch, frozen Linear packet, contract, scope,
  acceptance criteria, evidence ownership, and run/time/spend envelope.
- Astra was stopped before Claude dispatch; concurrency remains one.
- Astra agent id: `cc3c1bec-47b9-4c57-adf1-87921e6e7e91`.
- The one-use MAX authorization remains consumed; no second MAX dispatch is
  authorized.
- The protected fresh Claude STANDARD verifier reservation remains intact.

