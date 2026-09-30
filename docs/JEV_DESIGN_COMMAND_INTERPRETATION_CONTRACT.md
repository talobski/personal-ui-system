# PUI-137 — Design Command interpretation research contract

Status: Stage 1 admitted only after the Lead writes the admission receipt. This is the authoritative phase-local reconciliation of PUI-137 against accepted product `e16bc37051915954fb39196636245c11070bf309` and control `d5c1145289aa2c6bf816bcb2066b1b16cc820ebd`.

## Scope and gate

One Tier 3 owner-gated phase, `jev-design-command-interpretation-v1-001`. Stage 1 is **research and proposal only**. The sole frozen ticket is PUI-137. Its complete snapshot and hash manifest are under `docs/evidence/jev-design-command-interpretation-v1-001/linear/`. This contract wins over later Linear edits.

At Stage 1 completion, after a fresh independent review, the Lead presents the artifact and **stops for explicit owner approval**. Stage 2 remains within this same phase if approved, but Stage 1 admission does not authorize Stage 2. No spike, live Jev call, product change, credential, worker network, dependency, product runtime/network behavior, Theme v3 or mutation change, or external publishing is authorized before the gate. If the owner declines Stage 2, research-only closeout is valid. The gate is local to PUI-137.

## Accepted baseline and source constraints

Design Command already exists: Workbench Command UI -> product-local server handler -> TypeSafe transport -> typed Choice/Score/Noul acceptance -> deterministic recipe composition into the closed `ThemeOperation` union -> unchanged `MutationProposalV1` stage/apply/discard, Theme v3 validation, history and persistence. The product Jev path is distinct from the Loop Engineering `@loop-engineering/jev-core` adapter and `.loop` control plane. The current catalog and six directional categories are a baseline to evaluate, not proof that reference-style commands work well. Some older Jev research docs are superseded; inspect source and the owner-approved architecture checkpoint before using their claims.

Current official TypeSafe/Jev sources must be checked against a retrieval-dated Lead source inventory. Worker network is prohibited. Provider statements about latency, calibration, price, or quality are claims until independently tested. Do not perform live calls.

## Required Stage 1 artifact

Commit a research proposal under `docs/evidence/jev-design-command-interpretation-v1-001/` or a similarly explicit project research-document path. It must include:

1. Evidence-linked map of current Design Command entry points, Jev adapter and fixtures, 13-operation closed mutation contract, deterministic admissibility, Theme v3 validation, history/undo/reset, persistence, Preview/Apply/Discard, and confidence behavior.
2. Current primary TypeSafe/Jev capability and limitation assessment: Choice, Score, Noul, answer shapes, confidence/probability distinction, API/model/auth, agent skill, latency, failures, credits. Cite direct URLs and retrieval date.
3. Concrete Workbench flow for command entry, submit/loading, interpreted-change communication, staged preview, Apply/Discard, refinement, undo/reset, Save/Save As, ambiguous follow-up, failure and offline paths. The user should not need to know Jev exists.
4. Exact proposed typed decision contracts for `Make it feel like Spotify`, `Make it more editorial and less SaaS-like`, `Make it playful and soft`, and `Make it better`. For **each call**, state purpose, compact input context, fixed answer options/rubric, Choice/Score/Noul type, expected typed output, confidence/probability handling, acceptance policy, deterministic fallback and failure behavior, and one-call versus dependent multi-call rationale. Examples are hypotheses, not live results; the vague command must not mutate blindly.
5. Product-owned vocabulary derived from actual existing operations/recipes. Reference commands imply bounded Personal UI design directions, never literal cloning. Where the current operation set cannot express a desirable dimension, say so and do not invent a mutation.
6. Explicit responsibility matrix for nine subproblems: product/cultural references; abstract aesthetic language; implicated dimensions; admissible mutation selection; ambiguity/confidence; clarification wording; exact token values; mutation execution; resulting-theme validation. Compare deterministic code, Jev, conventional frontier LLM and hybrids for semantic quality, boundedness, typed-output guarantees, calibration, determinism, latency, cost, privacy, testing, maintainability and failures. No blanket winner.
7. Deterministic code retains legality, actual token values, clamping, operations, Theme v3 validation, measurable accessibility checks, history, reset, persistence, Save/Save As, and permissions. Any probabilistic layer can propose or rank only inside this gate, never generate executable CSS or bypass the closed mutation contract.
8. Decision-specific high/medium/low confidence and ambiguity policy. Treat thresholds as uncalibrated hypotheses until fixture evidence exists; do not impose a universal numeric threshold without support.
9. Honest hosted-service analysis: server/proxy versus browser-direct key handling, privacy/minimal data sent, local/offline behavior, latency, timeout/retry/outage, drift, audit logs, calibration/evals, call and credit costs. Do not assume product billing authority from provider/profile availability.
10. Fair A/B/C/D alternatives (deterministic-only, Jev-bounded, LLM-structured, hybrid) and a recommendation that may be `do not use Jev`.
11. Only if a spike is justified: the smallest reversible comparative spike, shared fixtures across approaches (including positive, vague, contradictory, out-of-scope, multi-category and reference commands), measurable success/failure criteria, exact Jev request count and maximum credits, proposed LLM route/call/token/spend cap if used, and any Stage 2 run/time/credential/network authority needed. No unbudgeted service probing.

## Execution envelope and verification

Stage 1 expected 2 agent runs; hard ceiling 3, including a protected fresh review reserve; 420 minutes; concurrency 1; cumulative lifetime ceiling 100 from 97 already used; paid spend 0. Primary producer `loop_worker_claude_strong / claude-opus-5-5 / STRONG / medium`, included subscription. Fresh independent reviewer `loop_worker_codex_standard / gpt-5.6-terra / STANDARD / medium`, included subscription, read-only/no repair. No fallback is admitted. If Claude becomes unavailable, exhausted or materially blocked, stop and report rather than silently route elsewhere.

Stage 1 verification is packet/contract/source/citation/coverage review, research artifact integrity and pre/post Git identity. No product browser suite is required because no executable product behavior change is authorized. The reviewer does not repair the artifact. The Lead records the Stage 1 review and owner-gate presentation. No acceptance, promotion, or closeout of the whole phase occurs before the owner decision.
