# Jev runtime adapter (V1, smallest)

Project-local runtime infrastructure under `tools/loop/jev/`. It is not part of
`packages/core` or `packages/ui`, adds no dependencies, and never touches the
research harness or its `research/jev-log.jsonl`.

The adapter takes one deterministic **gate-admission packet**, enforces the
canonical Loop Engineering Jev rules, makes at most one live call to the fixed
TypeSafe endpoint, and records the result. It contains no probabilistic logic:
it validates, charges, transports, accepts or rejects, and restates.

## Billing requirement

A live call needs a `TYPESAFE_API_KEY` whose usage is covered by an included
subscription. The adapter cannot verify this; it can only refuse work that
claims otherwise. `paidBudget` must be exactly `0` in the global policy (and in
project state, if declared), and the packet must declare an allowed included
billing class. Any packet that asks for paid capacity, credits, or overage is
rejected before transport. The owner is responsible for confirming that the key
does not bill separately.

## Files and audit paths

| Path | Role |
|---|---|
| `~/.loop-engineering/policy.json` (or `--policy`) | Read only. Needs `ownerCeilings.paidBudget === 0`, `ownerCeilings.maxCallsPerProject`, and `routingPolicy.billingClasses` (classes set to `true` are allowed; matching ignores case and punctuation, so `included-subscription` matches `includedSubscription`). |
| `<project>/.loop/state.json` | Read and atomically replaced. Requires `projectId` and `counters.calls`; optional `budgets: { maxCalls, paidBudget }`. Only `counters.calls` and `counters.jevCalls` are modified; every other field is preserved. |
| `<project>/.loop/runs/<runId>/decisions/<decisionId>.json` | One decision record per live attempt, created before transport (`status: "requested"`) and atomically replaced with the result (`completed` or `failed`). |
| `<project>/.loop/events.jsonl` | Append-only lifecycle events (`loop-jev-event/1`): `jev.decision.requested`, `jev.decision.resolved`, `jev.packet.rejected`, `jev.call.denied`. |
| `<project>/.loop/jev.lock` | Exclusive create-if-absent lock guarding counter, decision, and event writes. Held only for short critical sections, never across the network call. |

A decision record left at `status: "requested"` is an unresolved attempt: the call
was charged but the result was not recorded, and the outcome was reported as
not accepted. A crashed process can leave `jev.lock` behind; the adapter then
denies with `denied.lock` and never breaks the lock itself. Inspect and remove it
manually.

## Packet schema (`loop-jev-admission/1`)

```jsonc
{
  "schemaVersion": "loop-jev-admission/1",
  "projectId": "personal-ui-system",       // must equal .loop/state.json projectId
  "runId": "run-004",                      // [A-Za-z0-9][A-Za-z0-9._-]{0,127}
  "decisionId": "dec-0001",                // unique per run; reuse is rejected
  "contract": "NEXT_ACTION",               // see contracts below
  "composition": { "id": "direct-choice", "version": "1" },
  "admission": {
    "gate": "deterministic-gate/1",
    "questionsDigest": "<sha256>",         // digestQuestions(contract, questions)
    "authority": {
      "billingClass": "included-subscription",
      "paidCapacity": false,               // every flag must be present and false
      "permissionEscalation": false,
      "verificationWaived": false,
      "completionWaived": false,
      "completionPreconditionsPassed": false
    }
  },
  "state": { "round": 2 },                 // JSON object; sanitized before sending and logging
  "questions": [
    { "id": "next_action", "type": "choice", "instructions": "...",
      "options": [{ "id": "RESEARCH", "description": "..." }, { "id": "WAIT", "description": "..." }] },
    { "id": "difficulty", "type": "score", "instructions": "...",
      "scale": ["Trivial", "Moderate", "Hard"] },
    { "id": "needs_human", "type": "noul", "instructions": "...",
      "criteria": { "true": "...", "false": "..." } }
  ],
  "fallback": { "id": "safe-wait", "output": "WAIT" }   // optional, declared before the call
}
```

Unknown fields are rejected. Jev sees only `state` plus, per question, the
`instructions` and the admitted options, scale levels, or Noul criteria. Nothing
else from the packet is transmitted.

**Contracts.** `NEXT_ACTION`, `ROUTE_PROFILE`, `MODEL_CLASS`, `PROVIDER_FALLBACK`,
`RETRY_STRATEGY`, `HUMAN_INTERRUPT`, `CONVERGENCE`, `VERIFICATION_DIAGNOSIS`,
`WORKER_FAN_OUT`. Each restricts the allowed primitives, and where the result set
is static (`NEXT_ACTION`, `RETRY_STRATEGY`, `CONVERGENCE`,
`VERIFICATION_DIAGNOSIS`) it restricts Choice option IDs too. `ROUTE_PROFILE` and
`PROVIDER_FALLBACK` take dynamic route IDs, so their option IDs are not restricted here.

**Gate digest.** `questionsDigest` is the SHA-256 of the canonical JSON
(sorted keys) of `{ contract, questions }` as exported by `digestQuestions`. It
detects any change between gate admission and transport.

### Rejected before transport (no charge, no call)

| Code | Cause |
|---|---|
| `packet.malformed`, `packet.unsupported-version`, `packet.unknown-field`, `packet.invalid-id` | Wrong shape/version, smuggled fields, unsafe IDs. |
| `packet.empty` | No questions, no options, empty scale, or missing criteria. |
| `packet.single-option` | A Choice with one option is not probabilistic; proceed deterministically. |
| `packet.duplicate-question`, `packet.duplicate-option`, `packet.duplicate-decision` | Duplicate IDs, options, scale levels, or a reused decision ID. |
| `packet.inconsistent` | Digest mismatch, composer cannot compose these questions, malformed Noul criteria, fallback not an admitted option. |
| `packet.unauthorized` | Unknown contract or composition, primitive or option outside the contract, other project. |
| `packet.paid-capacity` | `paidCapacity` not `false`, or a billing class the policy does not allow. |
| `packet.permission-escalation`, `packet.verification-waived`, `packet.completion-waived` | Flag not exactly `false`, or `COMPLETE` offered while preconditions have not passed. |
| `packet.secret`, `packet.state-invalid` | Secret-shaped text in questions; state that is non-JSON, deeper than 8, or larger than 32 KiB. |
| `denied.policy-unavailable`, `denied.state-unavailable`, `denied.paid-budget`, `denied.call-budget`, `denied.lock`, `denied.missing-api-key` | Policy/state unreadable or invalid, `paidBudget` not `0`, budget exhausted, lock held, no key. |

The call budget is `min(policy.ownerCeilings.maxCallsPerProject, state.budgets.maxCalls)`.
A live call needs `counters.calls + 1 <= budget`.

## Fixed acceptance

The `0.5` boundary is fixed and not configurable.

- **Choice** is accepted when the choice was offered, its probability is a maximum (a tie is fine if it is among the maxima), `confidence >= 0.5`, and all probabilities are finite in `[0,1]` over offered options.
- **Score** is accepted when the score is finite and within `[0, levels-1]`, the returned legend exactly matches the declared indexed scale, `confidence >= 0.5`, and probabilities are valid.
- **Noul** is accepted when it is a finite number in `[0,1]`. `> 0.5` is yes, `< 0.5` is no, and exactly `0.5` is unresolved and rejected.
- A composite is usable only when every question in the packet passes.

## Fail-closed behavior

One packet is at most one HTTP request. There is no retry. Any of the following
returns `accepted: false` with a stable `reason.code` and, after the charge,
writes a `failed` decision record: `failed.timeout`, `failed.network`,
`failed.http` (non-2xx), `failed.malformed-response` (not JSON, no `answers`,
oversized), `failed.answer-set` (unexpected or missing question),
`failed.primitive-mismatch`, `failed.malformed-answer`, `failed.confidence`,
`failed.choice-not-offered`, `failed.choice-not-max`, `failed.score-range`,
`failed.legend-mismatch`, `failed.probabilities`, `failed.noul-unresolved`,
`failed.composition`, `failed.charge-write` (before transport), and
`failed.log-write`.

If the state, decision, or event write fails, the decision fails closed even
when the answers were valid. If persisting the charge or opening record fails
before transport, no call is made. A failure after transport reports
`fallback` when the packet declared one, and otherwise `pause:
PAUSED(capability)` with unblock `wait for Jev` or `ask human`. The adapter only
reports these; the Lead or gate applies them. It never edits `state.pause`.

**Charging.** The call is counted (`counters.calls` and `counters.jevCalls`
incremented and persisted) under the project lock *before* the network call, along with
the `requested` decision record and event. Missing key, invalid packet, exhausted
budget, and duplicate decision are refused without charging. Every attempted
call is charged whether or not it succeeds.

**Authority.** Jev's output is only ever validated as typed answers and passed
to a composer. It cannot change permissions, budgets, spending, provider facts,
verification, or completion preconditions, and nothing in a response is written
back to state.

## Sanitization

State is copied recursively before sending and logging. Keys named for
credentials (`password`, `secret`, `token`, `apiKey`/`api-key`, `key`,
`cookie`, `authorization`, `credential`, `auth`, `bearer` as camelCase or
separator-delimited words) are replaced with `[REDACTED]`. Numeric or boolean
`token`/`tokens` values (counters such as `tokenBudget`) are kept. String
values are scanned for bearer tokens, `key=value` secrets, URL credentials,
common key formats (`sk-`, `ghp_`, `xox*-`, `AKIA`, JWT), and the literal API
key. Non-JSON values, cycles, nesting deeper than 8, or more than 32 KiB
serialized are rejected rather than truncated. Raw answers are logged
sanitized and capped at 16 KiB per answer; unparseable responses are logged as
a redacted 500-character snippet.

## Composition surface

A composition `{ id, version }` names a versioned pure function from accepted
typed answers to a JSON output. The built-ins add no logic:

- `direct-choice/1`: exactly one Choice → `{ kind: "choice", questionId, selected }`
- `direct-noul/1`: exactly one Noul → `{ kind: "noul", questionId, value, interpretation }`
- `accepted-batch/1`: any accepted set → `{ kind: "batch", answers: { <id>: { type, ... } } }`

Weights, thresholds, and mappings (for example `CONVERGENCE` rules) belong in
gate code that passes its own versioned `Composer` via `options.composers`.
Built-ins cannot be replaced. A composer runs only on fully accepted answers, and if it throws the
decision fails closed as `failed.composition`.

## Usage

Library (all boundaries injectable):

```ts
import { runDecision } from "./tools/loop/jev/index.ts"

const outcome = await runDecision(packet, {
  projectDir,                          // contains .loop/
  policyPath,                          // optional
  apiKey: process.env.TYPESAFE_API_KEY,
  fetch, clock, fs,                    // optional test seams; timeoutMs default 60000
})
if (!outcome.accepted) { /* outcome.reason, outcome.fallback, outcome.pause */ }
```

CLI (fixed endpoint `https://api.typesafe.ai/v1/systemone`, model `jev-latest`):

```sh
export TYPESAFE_API_KEY=...          # never passed as an argument
pnpm jev --packet packet.json [--project-dir <dir>] [--policy <file>] [--timeout-ms 60000]
pnpm jev --packet - < packet.json
```

The full `Outcome` is printed as JSON on stdout. Exit code `0` means accepted, `1`
means not accepted, and `2` means a usage error.

## Scripts and verification

```sh
pnpm test:jev        # vitest run tools/loop/jev (temp project/policy dirs, mocked transport)
pnpm typecheck:jev   # tsc -p tools/loop/jev (also part of pnpm typecheck)
```

The tests never open a network connection or read `~/.loop-engineering` or a
canonical `.loop/`.

## Limitations

- Live behavior against the real endpoint is unverified. The wire format
  (`{ model, state, questions }` in, `{ answers }` out) was taken from the existing
  research harness and needs a first supervised live call by the owner.
- The `state.json` fields `budgets` and `counters.jevCalls` are additions; the
  canonical minimal template only defines `counters.calls`.
- Stale locks are not broken automatically.
- Writes use write-then-rename without `fsync`, so a machine crash can lose the
  most recent write but not produce a partial file.
- Static option sets cover the nine contracts listed above only.
