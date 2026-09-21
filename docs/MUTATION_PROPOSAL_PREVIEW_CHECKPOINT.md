# Mutation proposal preview checkpoint

Status: `DONE(verified)`; awaiting owner acceptance.

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

## Evidence remediation

The owner authorized one test-only run with a 14/14 lifetime ceiling. Commit
`7e9c84e` changes only `e2e/proposal-preview.spec.ts`; merge commit `a41caf5`
integrates it after the isolated completion gate passed.

- PP-03: one seven-operation proposal proves computed color, radius, density,
  typography, shadow, and motion changes without reload or active mutation,
  then proves Discard restores all six values.
- PP-10: keyboard activation proves Stage, Discard, second Stage, and Apply,
  including lifecycle outcomes, single revision movement, and unchanged
  persistence.
- Targeted Playwright matrix: 28/28 passed at 390x844 and 1440x900, light and
  dark, both before and after merge.
- Axe: 16 attachments decoded directly; zero serious or critical findings.
- E2E typecheck and workbench production build passed.
- Product files remain byte-identical to `195a79c`; no defect surfaced.

No additional worker, attempt, or product change is authorized by this result.
