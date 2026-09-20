# Temporary provider routing checkpoint

Observed: 2026-09-20T16:38:47+08:00

This project temporarily prefers included Claude subscription capacity in order
to conserve Codex subscription capacity. This is runtime routing policy for the
current project, not an architectural rule and not a permanent global default.

The ordered policy is:

1. Claude when its route is `AVAILABLE` and suitable for the bounded task.
2. Codex when Claude is unavailable, unsuitable, `LIMITED`, or `EXHAUSTED`, or
   when Codex has a documented task-specific advantage.
3. Wait, pause, or ask the owner when neither included route is appropriate.

Only `AVAILABLE`, `LIMITED`, `EXHAUSTED`, and `UNKNOWN` are valid provider-state
labels. Separately billed APIs, purchased credits, automatic overage, and all
other paid capacity remain prohibited. Permission-escalating worker envelopes
remain inadmissible.

## Claude admission result

Claude is `AVAILABLE` for bounded, isolated, non-escalating worker tasks.

- Route: `claude/claude-sonnet-5` through Claude Code 2.1.278.
- Billing channel: authenticated `claude.ai` consumer subscription (`pro`), not
  an API-key route. Paseo's per-run `CostUsd` is treated as estimated usage
  telemetry, not evidence of separately billed spend.
- Mode/thinking: `auto` / `medium`.
- Fixture: `claude-admission-001`.
- Agent: `ed008148-6240-4b8c-ba2a-84d3e5682548`.
- Isolated workspace: `wks_1dc2a21ab5ecae4e`, archived after inspection.
- Result: finished with a clean linked worktree, no relative `.loop/`, no
  permission request, no child agent, no network use, and no file change.
- Limitation: no dedicated named Claude profile is configured. Launches must
  materialize this verified route explicitly and must not infer future drift.

The admitted envelope remains: isolated worktree, no permission escalation,
no external network or effects, no subagents, and no canonical `.loop/` access.
The route must be reclassified dynamically if capacity or suitability changes.
Codex remains `AVAILABLE` under `docs/PREFLIGHT_CHECKPOINT.md` as the fallback.
