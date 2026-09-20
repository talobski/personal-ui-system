# AC-09 fresh-agent handoff checkpoint

Status: verified on 2026-09-21 against commit `10b6221c21f9d254210439b658c1951d9126eab8`.

A fresh Claude Sonnet 5 verifier received only the repository instructions and the predeclared AC-09 rubric in an isolated worktree. It did not receive source paths beyond the repository entry instructions and discovered the implementation itself.

All five rubric items passed:

1. It found the canonical theme, contract, mutation, public API, and verification sources from `AGENTS.md`, `BRIEF.md`, and the repository tree.
2. It retrieved the Button contract alone, validated it at 1720 bytes, rejected unknown IDs, and validated the canonical theme.
3. It applied a valid structured `setColor` mutation, observed the expected token and revision change, and confirmed the input theme was unchanged.
4. It rejected raw CSS, unknown operation, filesystem-path, and stale-revision requests with stable rule IDs and paths, producing no candidate theme or CSS.
5. It ran the repository test command successfully.

Lead verification reran the focused fixture (3/3 passed) and repository suite (191/191 passed). The verifier changed only its permitted temporary `verification/` files, made no commit, requested no permissions, and did not alter product source.

Machine-readable evidence is at `.loop/runs/fresh-agent-handoff-001/evidence/ac-09.json`.
