# Mutation proposal preview checkpoint

Status: `PAUSED(verification-contract-gap)`; implementation preserved, not accepted.

## Preserved implementation

- Worker branch: `loop/mutation-proposal-preview-001`
- Final worker commit: `195a79c`
- Canonical merge commit: `096efc5`
- Worker: `cef3cc0e-6dbb-4147-8842-aba0e5b18d4c`
- Budget used: 1/1 agent run, 3/3 Lead-to-worker turns, 3/3 changed attempts
- Lifetime agent-run budget: 13/13
- Paid capacity: 0

The preserved implementation provides the strict `MutationProposalV1`
envelope, transactional staging and Apply, serializable provenance and outcome
records, session-unique proposal ids, exact stale/base rule ids, regenerated
candidate equality checking, structured diffs, candidate iframe preview, and
Apply/Discard controls. While staged, active edit, load, fork, save, and export
controls are disabled.

## Verification that passed

- `pnpm test`: 14 files, 296 tests passed.
- `pnpm typecheck`: passed for core, UI, workbench, e2e, and Jev.
- `pnpm registry:build`: passed; `registry.json` unchanged.
- `pnpm build:workbench`: passed.
- `pnpm build:storybook`: passed.
- `pnpm test:browser`: 4 Storybook and 34 workbench tests passed.
- Browser matrix: 390x844 and 1440x900, light and dark.
- 52 axe attachments decoded; zero serious or critical violations.
- Existing operation union, public UI package, renderer, iframe messaging,
  persistence helper, and export helper stayed unchanged.

Raw browser evidence is in
`.loop/runs/mutation-proposal-preview-001/evidence/workbench-results.json`.

## Remaining acceptance gaps

1. PP-03 requires proposal-preview evidence that every existing mutation
   category changes the computed iframe style without a reload or active-state
   mutation. The current proposal browser fixture proves color, radius, and
   motion. Density is applied without a computed-style preview assertion;
   typography and shadow are absent from the proposal-preview scenarios.
2. PP-10 requires keyboard-complete proposal-flow evidence. Existing browser
   tests exercise keyboard behavior elsewhere in the workbench, but the
   proposal Stage/Apply/Discard flow has no explicit keyboard-use assertion.

The final authorized corrective attempt is exhausted. No further worker,
attempt, ceiling increase, or product change is authorized. Resume requires an
owner budget/attempt decision; do not duplicate the completed implementation.
