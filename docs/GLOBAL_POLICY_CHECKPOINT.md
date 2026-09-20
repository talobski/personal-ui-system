# Global Loop Policy Checkpoint

Created: 2026-09-20

Global path: `/Users/emmantalob/.loop-engineering/policy.json`

Current SHA-256 after the Jev live fixture: `701b31e53b0941ed15645d5f5858ff06c7ccd51336515a0662e5bc9f4a08e586`

Initial creation SHA-256: `175da611249b333aa535245394ac625de1074259ed30e848c0661e8c2ce825bf`

File permissions at creation: `0600` (`-rw-------`).

This is global Loop Engineering infrastructure, not project state. The file is not committed into this repository. This checkpoint records the authorized policy without making the project copy authoritative.

## Effective ceilings

- Paid budget: `0`.
- Agent runs per project: `8`.
- Delegated calls/turns per project: `80`.
- Attempts per task: `3`.
- Worker concurrency: `2`, starting with one.
- Spawn depth: `1` globally; individual worker profiles may be stricter.
- Default model class: `STANDARD`.
- Strong model class: admissible only with logged expected benefit.
- Max model class: not admitted without explicit owner approval.

## Billing and authority

Included consumer subscription capacity and the owner-verified TypeSafe monthly
included allocation are the only allowed capacity. The TypeSafe allocation had
`$5.00` remaining before the supervised fixture and expires 2026-10-19;
auto-recharge is off and no paid credits have been purchased. Temporary paid
credits, separately billed APIs, automatic overage, and purchased credits remain
disabled. Public publishing, production deployment, destructive production
changes, all financial liability, and paid-capacity expansion remain
human-controlled.

## Provider state

At creation, Codex, Claude, and Grok were all recorded as `UNKNOWN`. Installation, authentication, or a visible model list did not change availability.

After `worker-admission-001`, the constrained standard Codex route became
`AVAILABLE`: `codex/gpt-5.6-terra`, included ChatGPT subscription capacity,
isolated Paseo worktrees, and no escalation-bearing task envelopes, external
network, native subagents, or canonical `.loop/` access. Project-local preflight
later established the constrained Claude route as `AVAILABLE`; the global file
retains its earlier Claude observation until a dedicated global update.

The Jev route is `LIMITED`. One owner-authorized live fixture returned HTTP 200
and a typed Choice, proving authentication and wire compatibility, but confidence
was `0.11`, below the canonical `0.5` acceptance threshold. The call was not
retried. Grok remains `UNKNOWN`.

## Change control

Future policy changes must preserve the canonical workflow contract, remain credential-free, be explicitly authorized when they expand cost or authority, and receive a new hash/checkpoint. Project runtime state, counters, tasks, and evidence never belong in this global file.
