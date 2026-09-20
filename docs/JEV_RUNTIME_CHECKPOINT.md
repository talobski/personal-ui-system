# Jev runtime checkpoint

Date: 2026-09-20

Initial result: **adapter mock-verified; Jev route remained `UNKNOWN`**.

Final result: **Jev route is `AVAILABLE` using the owner-authorized monthly included allocation**.

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

The first supervised request reached the fixed endpoint and returned HTTP
200 with a typed Choice in 772 ms, selecting `WAIT` with probabilities
`VERIFY: 0.44` and `WAIT: 0.56`, but confidence was `0.11`. Because this is below
the canonical `0.5` threshold, the adapter rejected the answer, produced no
composition, recorded `PAUSED(capability)`, and did not retry. The complete
record is:

```text
.loop/runs/jev-live-fixture-001/decisions/availability-choice-001.json
```

This proved endpoint reachability, authentication, wire compatibility, and
project-local auditing. Review against the canonical specification established
that provider/capability state and individual-decision acceptance are separate:
a healthy probabilistic service may return low confidence for an ambiguous
question. The first decision was rejected for low confidence, but that fact
alone did not establish provider degradation.

The owner then authorized one second diagnostic fixture. Its deliberately
unambiguous Choice required selecting the option whose ID exactly matched
`requiredLabel: VERIFY`. The endpoint returned HTTP 200 in 769 ms with a valid
typed Choice, `VERIFY: 1.0`, `WAIT: 0.0`, and confidence `1.0`. The adapter
accepted it, produced the versioned deterministic composition, and recorded no
fallback, pause, or audit error:

```text
.loop/runs/jev-live-fixture-002/decisions/unambiguous-choice-001.json
```

The second fixture is diagnostic only. Its deterministic question would not be
a valid reason to invoke Jev during ordinary orchestration, and it does not amend
the canonical rule requiring genuinely probabilistic choices. No canonical file
was modified.

## Runtime classification

- Transport/provider health: healthy; two HTTP 200 responses, 772 ms and 769 ms.
- Schema/type validity: valid typed Choice responses on both calls.
- First decision: confidence `0.11`; rejected under the canonical threshold.
- Second decision: confidence `1.0`; accepted with deterministic composition.
- Provider state: `AVAILABLE`.
- Capacity class: owner-authorized monthly included allocation.

Future genuinely probabilistic decisions may use Jev after deterministic
filtering. Low confidence fails that individual decision closed but does not by
itself change provider availability. Transport, authentication, schema failures,
quota evidence, or allocation uncertainty are classified separately. Low,
exhausted, or uncertain allocation must update provider state and pause rather
than adding funds, enabling recharge, buying credits, or using separately billed
capacity.

Pricing evidence checked on 2026-09-20:

- <https://typesafe.ai/>
- <https://typesafe.ai/blog/introducing-system-one-models-and-jev>

No genuinely probabilistic project decision may be made directly by the Lead
when Jev is required but unavailable. Deterministic work does not become
probabilistic merely to exercise this adapter.
