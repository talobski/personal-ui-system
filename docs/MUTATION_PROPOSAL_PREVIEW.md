# Mutation proposal preview

Worker notes for `mutation-proposal-preview-001`. The owner-approved contract is the "Phase 4" section of `BRIEF.md`.

## Where things live

- `packages/core/src/mutations/proposal.ts` — the strict `MutationProposalV1` envelope and the pure, immutable,
  JSON-serializable session state machine: `stageProposal`, `applyProposal`, `discardProposal`, `createProposalSession`.
  Each takes an RFC-3339 `now` so records carry timestamps without hidden clocks. Operation validation and application are
  delegated unchanged to `validateMutation` / `applyMutation`; the `ThemeOperation` union did not change.
- `packages/core/src/theme/diff.ts` — `diffThemeTokens`, the sorted `{path,before,after}` diff used for the evaluation
  record; the workbench baseline diff delegates to it.
- `apps/workbench/src/lifecycle.ts` — `parseProposalJson`, `exampleProposalJson`.
- `apps/workbench/src/App.tsx` — "Mutation proposal" panel (JSON input, Stage, example), "Staged proposal" panel (provenance,
  diff, Apply, Discard). A staged candidate is sent through the existing iframe `postMessage` path; the message shape and
  iframe plumbing are unchanged.

## Envelope

`schemaVersion: "1.0"`, `proposalId`, `base: {themeId, revision}`, `provenance: {source, sourceId, createdAt, intentSummary?}`,
`operations` (1 to 8). `source` is `"manual" | "agent" | "fixture"`. `proposalId` and `sourceId` are 1 to 128 characters from
`[A-Za-z0-9._:-]`. `base.revision` is a non-negative integer at the envelope; whether it matches the active theme is decided by
the existing mutation base check. `createdAt` is RFC-3339; `intentSummary` is 1 to 240 characters with no control characters.
Every other key, at every level (including a top-level `version`), is rejected with `proposal.unknown-field`. A missing or
wrong `schemaVersion` is `proposal.unsupported-version` at `schemaVersion`.

## Session records

`ProposalSession = { records, staged }`, all plain JSON. Every proposal with a usable `proposalId` gets a record, in arrival order,
which is also the replay ledger. A rejected record keeps `receivedAt` and `errors`. A staged record keeps the validated
`proposal` (with provenance), an `evaluation` (`evaluatedAt`, `activeRevision`, `candidateRevision`, sorted `diff`), and after
Apply, Discard, or stale a `resolution` (`resolvedAt`, `outcome`, `activeRevisionBefore`, `activeRevisionAfter`, and `errors` for stale).
Nothing is persisted across reloads.

## Rule IDs

Envelope: `proposal.invalid-proposal`, `.unsupported-version`, `.unknown-field`, `.invalid-id`, `.duplicate-id`,
`.invalid-base`, `.invalid-provenance`, `.invalid-created-at`, `.invalid-intent-summary`, `.invalid-operations`.
Lifecycle: `proposal.staging-occupied`, `proposal.not-staged`, `proposal.candidate-mismatch`. Operations and base identity reuse
the existing `mutation.*` IDs. Initial `themeId` mismatch is a rejection with `mutation.base-mismatch` at `base.themeId`. After
staging, Apply turns the proposal stale and returns `mutation.base-mismatch` at `base.themeId` (theme id changed) or
`mutation.stale-revision` at `base.revision` (revision changed). Apply also regenerates the candidate and requires it to equal the
staged one; otherwise it fails closed with `proposal.candidate-mismatch` and changes nothing.

## Decisions where BRIEF is silent

- One proposal may be staged at a time. A second valid proposal is rejected with `proposal.staging-occupied` and its id is consumed.
- A proposal whose `proposalId` is missing or malformed cannot be recorded, so it is rejected and consumes nothing.
  Any proposal with a usable id consumes it, whatever the outcome.
- A `proposal.candidate-mismatch` failure leaves the proposal staged (no terminal state is recorded).
- An initial revision mismatch is a rejection (`mutation.stale-revision`), not a stale outcome: stale only applies after staging.
- Stale detection compares only theme id and revision, as specified.
- While staged, the preview shows the candidate. If the active theme moves, a notice says Apply will go stale; the status
  only changes on Apply.

## Not covered

- Cross-reload replay protection (the ledger is in memory).
- Rebase of a stale proposal, or any concurrent staging.
