# Workbench Container Gallery Showcase v1 — worker task

Implement PUI-78, PUI-79 and PUI-80 in that order as one bounded phase against accepted product `b15380fd2ad1f221055af382841a9045bbdd84de`. This worktree branches from clean `main` `3e59f1ff4a8fd52b525ba359696f27e878db7ca5`.

Read completely before changing product files:

1. `AGENTS.md`
2. `BRIEF.md`
3. `.loop/runs/workbench-container-gallery-showcase-v1-001/linear-ticket-snapshots.md`
4. Each of the three referenced `linear/PUI-*.json` snapshots, in full
5. `docs/WORKBENCH_CONTAINER_GALLERY_SHOWCASE_CONTRACT.md`

The ticket snapshots are verbatim admission-time planning context. The reconciled contract is authoritative in a conflict. Later Linear edits do not mutate this task. Satisfy CGS-01 through CGS-14; CGS-15 acceptance and promotion are Lead-owned.

PUI-78: refactor the accepted nested gallery into container-responsive independent regions, wide RIGHT larger than LEFT, responsive explicit spans and local nested recomposition, direct Tailwind utilities, no row coupling/masonry/dense/absolute/overflow. Preserve the eight accepted compositions exactly once during layout refactor. PUI-79: use the resulting gallery to produce a curated, visually varied token-driven showcase with creative freedom; keep Theme v3 semantics and public resource boundaries. PUI-80: move the existing shadcn Switch into the right toolbar cluster, visually match the existing short separator, remove the visible label, render sun/moon inside its thumb, preserve accessibility/persistence/history/export/save. Do not treat `h-8` as an independently fixed separator requirement. Inspect the shared Switch first and choose the smallest clean local or reusable backward-compatible thumb customization. Do not add a public resource.

Workers may read this worktree-local immutable task packet but have no authority to read or write the canonical checkout's live `.loop` runtime state. No network, credentials, paid/API fallback, external effects, agent launches, or permission escalation; use `COREPACK_ENABLE_NETWORK=0` for any Corepack invocation. Do not change this frozen packet or the reconciled contract. If a tool cannot run inside the sandbox, record it and stop that subtask rather than asking for repeated approvals. Do not use `respond_to_permission`.

Keep changes on this phase branch. Checkpoint after each coherent unit with exact files, test state and risks. Produce a clean committed candidate and a provider-neutral checkpoint. Producer browser runs, if possible, are smoke evidence only; Lead owns formal browser acceptance. Fresh protected verification, acceptance, promotion and closeout are Lead-owned. Concurrency 1, phase run ceiling 3 with the third reserved for bounded recovery/reverification, cumulative execution time 360 minutes, paid spend $0. No silent provider/model substitution.
