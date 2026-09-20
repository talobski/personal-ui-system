# Jev runtime checkpoint

Date: 2026-09-20

Result: **adapter mock-verified; Jev route remains `UNKNOWN`**.

The project now has a V1 runtime adapter at `tools/loop/jev/`. It is separate
from the pre-existing Loop Engineering research harness and writes only to this
project's `.loop/` state. The research harness and its log were not modified or
admitted as production infrastructure.

## Verified adapter contract

- A deterministic gate-admission packet is required before transport.
- Only admitted Choice options, Score scales, and Noul criteria are sent.
- `Choice`, `Score`, and `Noul` use the canonical fixed `0.5` rules.
- Static orchestration result sets are enforced. `PROVIDER_FALLBACK` accepts
  only the canonical fixed results or an explicitly marked, policy-admitted
  temporary-credit route; this project's policy disables that class.
- Paid capacity, permission escalation, verification waiver, completion waiver,
  malformed responses, timeouts, and unaccepted primitive results fail closed.
- There is no silent retry and no state mutation based on Jev output.
- Every valid admitted request is logged with contract, primitive, options or
  scale, sanitized state, typed result where present, probabilities/confidence,
  deterministic composition, acceptance, and fallback/pause reason.
- The adapter never reads or writes the old research log.

## Lead verification

Commands run from the main checkout:

```text
corepack pnpm test:jev  -> 5 files, 119 tests passed
corepack pnpm test      -> 9 files, 151 tests passed
corepack pnpm typecheck -> passed
```

Vitest initially could not create its macOS temporary cache under the restricted
sandbox (`EPERM`). The identical test commands passed when rerun with temporary
directory access. Tests use an injected transport and make no network or Jev
calls.

Merged commits:

- `3d3d0b1` — V1 adapter baseline
- `87aa304` — provider-fallback enforcement and complete denial audit

## Availability and billing gate

Official TypeSafe material describes Jev as metered at `$0.042 / MTok` input.
The owner policy has `paidBudget: 0` and disables temporary credit, separately
billed use, automatic overage, and purchased credits. An API key exists, but a
credential is not evidence of a zero-cost allocation.

Therefore no live request was made. A mocked fixture verifies adapter behavior,
but cannot prove current endpoint availability, account acceptance, billing
classification, or live response compatibility. Jev must remain `UNKNOWN`, not
`AVAILABLE`.

## Unblock condition

Provide evidence that this TypeSafe account has a zero-cost allocation compatible
with the existing policy. The Lead can then run one smallest supervised live
fixture, inspect the complete project-local decision record, and mark Jev
`AVAILABLE` only if the endpoint, typed response, acceptance contract, and audit
record all pass. A paid-capacity policy change is outside this checkpoint and
requires explicit owner authority.

Pricing evidence checked on 2026-09-20:

- <https://typesafe.ai/>
- <https://typesafe.ai/blog/introducing-system-one-models-and-jev>

No genuinely probabilistic project decision may be made directly by the Lead
while Jev is required but unavailable. Deterministic work does not become
probabilistic merely to exercise this adapter.
