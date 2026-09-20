# Jev runtime checkpoint

Date: 2026-09-20

Initial result: **adapter mock-verified; Jev route remained `UNKNOWN`**.

Live update: **Jev route is `LIMITED` after one supervised fixture**.

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

The owner subsequently verified a `$5.00` monthly included credit expiring
2026-10-19, with auto-recharge off and no purchased-credit history, and
authorized that included allocation for Loop Engineering decisions. This
resolved the billing classification without enabling paid or replenished
capacity.

Exactly one supervised request was then made. The fixed endpoint returned HTTP
200 with a typed Choice in 772 ms, selecting `WAIT` with probabilities
`VERIFY: 0.44` and `WAIT: 0.56`, but confidence was `0.11`. Because this is below
the canonical `0.5` threshold, the adapter rejected the answer, produced no
composition, recorded `PAUSED(capability)`, and did not retry. The complete
record is:

```text
.loop/runs/jev-live-fixture-001/decisions/availability-choice-001.json
```

This proves endpoint reachability, authentication, wire compatibility, and
project-local auditing, but the fixture did not satisfy the acceptance contract.
Accordingly Jev is `LIMITED`, not `AVAILABLE`.

## Unblock condition

The single authorized fixture has been consumed and may not be silently retried.
The next safest remediation is owner direction on whether to authorize a second,
better-calibrated live fixture. Any later fixture must still use only the existing
included monthly allocation, and Jev becomes `AVAILABLE` only after an accepted
typed result and complete audit record. Low, exhausted, or uncertain allocation
must update provider state and pause rather than adding funds.

Pricing evidence checked on 2026-09-20:

- <https://typesafe.ai/>
- <https://typesafe.ai/blog/introducing-system-one-models-and-jev>

No genuinely probabilistic project decision may be made directly by the Lead
while Jev is required but unavailable. Deterministic work does not become
probabilistic merely to exercise this adapter.
