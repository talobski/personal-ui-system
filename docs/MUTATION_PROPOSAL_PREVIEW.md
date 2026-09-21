# Mutation proposal preview

Worker notes for `mutation-proposal-preview-001`. The owner-approved contract is the "Phase 4" section of `BRIEF.md`.

## Where things live

- `packages/core/src/mutations/proposal.ts` — the strict `MutationProposalV1` envelope and the pure, immutable session
  state machine: `stageProposal`, `applyProposal`, `discardProposal`, `createProposalSession`. Operation validation and
  application are delegated unchanged to `validateMutation` / `applyMutation`; the `ThemeOperation` union did not change.
- `apps/workbench/src/lifecycle.ts` — `diffProposal` (sorted `{path,before,after}`), `parseProposalJson`,
  `exampleProposalJson`.
- `apps/workbench/src/App.tsx` — "Mutation proposal" panel (JSON input, Stage, example), "Staged proposal" panel (provenance,
  diff, Apply, Discard). A staged candidate is sent through the existing iframe `postMessage` path; the message shape and
  iframe plumbing are unchanged.

## Envelope

`version: "1.0"`, `proposalId`, `base: {themeId, revision}`, `provenance: {source, sourceId, createdAt, intentSummary?}`,
`operations` (1 to 8). `proposalId`, `source`, and `sourceId` match `^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$`; `createdAt` is
RFC-3339; `intentSummary` is 1 to 240 characters with no control characters. Every other key, at every level, is rejected
with `proposal.unknown-field`.

## Rule IDs

Envelope: `proposal.invalid-proposal`, `.unsupported-version`, `.unknown-field`, `.invalid-id`, `.duplicate-id`,
`.invalid-base`, `.invalid-provenance`, `.invalid-created-at`, `.invalid-intent-summary`, `.invalid-operations`.
Lifecycle: `proposal.staging-occupied`, `proposal.not-staged`, `proposal.stale`. Operations and base identity reuse the
existing `mutation.*` IDs, including `mutation.base-mismatch` (initial `themeId` mismatch) and `mutation.stale-revision`
(initial revision mismatch).

## Decisions where BRIEF is silent

- One proposal may be staged at a time. A second valid proposal is rejected with `proposal.staging-occupied` and its id is consumed.
- A proposal whose `proposalId` is missing or malformed cannot be recorded, so it is rejected and consumes nothing.
  Any proposal with a usable id consumes it, whatever the outcome.
- An initial revision mismatch is a rejection (`mutation.stale-revision`), not a stale outcome: stale only applies after staging.
- Staged and stale detection compare only theme id and revision, as specified.
- While staged, the preview shows the candidate. If the active theme moves, a notice says Apply will go stale; the status
  only changes on Apply.

## Not covered

- Cross-reload replay protection (the ledger is in memory).
- Rebase of a stale proposal, or any concurrent staging.
