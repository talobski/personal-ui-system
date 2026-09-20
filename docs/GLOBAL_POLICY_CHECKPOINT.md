# Global Loop Policy Checkpoint

Created: 2026-09-20

Global path: `/Users/emmantalob/.loop-engineering/policy.json`

Current SHA-256 after worker admission: `9ece3524abfd997b785fab3f309068cacd07448684a57513820e20f74f03510c`

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

Included consumer subscription capacity is the only currently allowed billing class. Temporary credits, separately billed APIs, automatic overage, and purchased credits are disabled. Public publishing, production deployment, destructive production changes, all financial liability, and paid-capacity expansion remain human-controlled.

## Provider state

At creation, Codex, Claude, and Grok were all recorded as `UNKNOWN`. Installation, authentication, or a visible model list did not change availability.

After `worker-admission-001`, only the constrained standard Codex route is `AVAILABLE`: `codex/gpt-5.6-terra`, included ChatGPT subscription capacity, isolated Paseo worktrees, and no escalation-bearing task envelopes, external network, native subagents, or canonical `.loop/` access. Claude and Grok remain `UNKNOWN`.

## Change control

Future policy changes must preserve the canonical workflow contract, remain credential-free, be explicitly authorized when they expand cost or authority, and receive a new hash/checkpoint. Project runtime state, counters, tasks, and evidence never belong in this global file.
