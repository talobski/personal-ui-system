# Execution Preflight Checkpoint

Observed: 2026-09-20

## Restart and reconnection

- Documented command: `paseo daemon restart`.
- Result: succeeded despite the initiating shell call being interrupted.
- Topology: local desktop-managed daemon.
- Server ID: `srv_6cr5SllfAxnH`.
- New daemon PID: `72426`.
- New start time: `2026-09-20T08:18:26.740Z`.
- CLI version: `0.8.0`.
- Daemon version: `0.8.0`.
- Lead agent `ca3b3b08-439b-4d94-8e20-cb6c372491d7` reconnected and remained `running`.

## Project metadata

- Paseo project: `prj_8383b62ba67fbf0a` (`personal-ui-system`).
- Registry kind after restart: `git`.
- Canonical Lead workspace: `wks_863ea847471ee30e`.
- Isolated admission worktree workspace: `wks_080e2e1689ce68d2`.
- Worktree path: `/Users/emmantalob/.paseo/worktrees/2ys6frsa/ui-worker-admission-001`.

The restart repaired the stale internal `non_git` source metadata that had prevented Paseo worktree creation.

## Worker admission

Profile: `Loop Worker — Codex Standard`.

Materialized route: `codex/gpt-5.6-terra`, mode `auto`, thinking `medium`. Paseo 0.8.0 reports its effective Codex mode as `auto-review` with approval policy `on-request`, so admissibility also requires a task envelope that contains no permission-escalation request.

Deterministic findings:

1. Paseo child launch from the worker could not connect to the daemon through the worker sandbox. Independent agent inventory found no fixture child.
2. Native subagent capability was unavailable (`tools.spawn_agent is not a function`). No subagent appeared.
3. Writing `/Users/emmantalob/dev/personal-ui-system/.loop/worker-admission-001-sentinel` failed with `Operation not permitted`; the Lead independently confirmed the sentinel is absent.
4. The isolated worktree remained clean.
5. A task envelope explicitly instructing the worker to request sandbox escalation for child launch was rejected by the approval reviewer before agent creation. No third worker or child was created.

Result: PASS for isolated, non-escalating bounded work. The profile is not admissible for task envelopes requesting permission escalation, network, external effects, native subagents, or canonical `.loop/` access.

## Provider classification

- Codex standard route above: `AVAILABLE`, verified by completed worker execution and admission evidence.
- Claude: `UNKNOWN`.
- Grok: `UNKNOWN`.
- Paid budget remains `0`; separately billed APIs, overages, credits, and purchased capacity remain disabled.

## Tool-contract corrections

- Paseo 0.8.0 accepts Codex mode IDs `auto`, `auto-review`, and `full-access`; the worker profile was corrected from invalid `default` to `auto`.
- Paseo's structured-output validator required a draft-07-compatible schema shape and explicit `type` alongside `const`.

