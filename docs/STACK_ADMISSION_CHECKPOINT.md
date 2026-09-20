# Stack admission checkpoint

Observed: 2026-09-20T17:09:08+08:00

Result: **ADMITTED for continued V1 implementation**, with the limitations in
`docs/TECHNICAL_SPIKE_002_RESULT.md`. This admits the dependency stack and the
three-workspace source direction; it does not verify the V1 acceptance criteria
or declare the project complete.

## Verified route and execution envelope

- Producer route: `claude/claude-sonnet-5`, Claude Code 2.1.278, mode `auto`,
  thinking `medium`, through the authenticated Claude Pro consumer subscription.
- Worker agent: `5392b5a0-f91b-4b7d-8536-45b39129b367`.
- Isolated workspace: `wks_141bdcbcbdb0295f`, archived clean after merge.
- Worker commit: `adc4749`; merged main commit: `5a2d2af`.
- Paseo found no pending permission and no child agent. The task used no
  permission escalation, dependency/network change, paid API route, or canonical
  `.loop/` access.
- Paseo's `CostUsd` value is retained only as estimated usage telemetry; provider
  diagnostics establish that this was a consumer-subscription CLI route, not
  separately billed API spend.

## Fresh Lead verification

The Lead reran each command after the worker finished:

- `corepack pnpm test`: 4 files and 32 tests passed.
- `corepack pnpm typecheck`: core, UI, and e2e typechecks passed.
- `corepack pnpm exec shadcn build`: Button, Input, and responsive-dialog built.
- `NO_UPDATE_CHECK=1 corepack pnpm build:storybook`: Storybook 10.6.0 built.
- `NO_UPDATE_CHECK=1 corepack pnpm test:browser`: four Chromium tests passed at
  390x844 and 1440x900, including the 640/641 hard switch, Escape/focus return,
  and zero critical/serious axe violations.

The Lead also verified that the lockfile and the generated shadcn Button, Input,
Dialog, and Drawer primitive files were byte-unchanged by the worker.

## Artifact hashes

- Theme CSS fixture: `6b34ac8043367a643c147d344492af97cc74d1a6d031435fcc90d802ef37018b`.
- Source registry: `9361b823f8ae68cee05bcd53b439c31e3cca01c41f0d2a4a167571003349c92e`.
- Worker result document: `60fbdf9aed98993b672bb7042dd95a3c3a4342b91b56c8126d2818f903b0be9f`.

## Carried limitations

- This slice is not the workbench and does not satisfy AC-06.
- Only light mode is browser-tested so far.
- Registry build validation is schema-level; dependency resolution against the
  public registry was not performed inside the network-free worker envelope.
- `tw-animate-css` is absent, so shadcn animation utility classes are currently
  inert even though Vaul drawer motion works.
- The final V1 spacing scale, reduced-motion policy range, full deterministic
  constraints, promotion state machine, and complete dependency-boundary check
  remain implementation work.
- Storybook emitted non-fatal bundler notices for upstream `"use client"`
  directives and a large axe/preview chunk.

The temporary project routing policy remains dynamic: prefer Claude while this
route remains `AVAILABLE` and suitable, then Codex under its admitted envelope,
otherwise wait/pause/ask. No permanent architecture rule was added.
