# Jev design-command MVP — implementation notes

Implementation run `jev-design-command-producer-001`, base `c33a010`. This implements
the corrected, owner-approved product-level architecture in
`docs/JEV_PRODUCT_ARCHITECTURE.md`, not the superseded
shared-runtime/`WORKER_FAN_OUT`/single-category design in
`docs/JEV_DESIGN_COMMAND_RESEARCH.md`. That research's official-source
citation table, jaggedness analysis, and bounded-composition principles are
carried forward as evidence; its contract-repurposing, 8-question ceiling,
orchestration-coupled transport, and single-category-only conclusions are not
implemented, per its own supersession note and the corrected architecture.

**This file was substantially rewritten after a review audit rejected the
first candidate (commit `8fa86ad`).** The corrections below (real wire
contract, multi-category clarification semantics, required-confidence
fail-closed, transparent evidence, strict acceptance, bounded transport,
real middleware browser evidence, pending-state UI locking) are load-bearing
and not incidental cleanup; see "What the review audit found" at the end.

## What changed

- `packages/core/src/jev-design/` — pure, transport-free deterministic core:
  `state.ts` (compact `design-command-state/1`), `wire.ts` (the **raw**
  `POST /v1/systemone` wire types), `questions.ts` (a clean internal
  question-catalog representation plus the one audited `toWireRequest`
  conversion into the raw wire shape), `accept.ts` (strict acceptance
  against the raw wire answer shapes), `recipes.ts` (`design-command-recipes/1`,
  closed `(category, direction, strength) -> ThemeOperation` preset table),
  `compose.ts` (deterministic composition to a `DesignCommandOutcome`).
  `evaluate.ts` is the one file with the transport orchestrator (injected
  `fetch`, injected `apiKey`, one bounded HTTP attempt covering both the
  request and the response-body read, no retry); it is exported only via the
  `@personal-ui/core/jev-design/evaluate` subpath, not the main barrel.
- `apps/workbench/src/server/designCommandHandler.ts` — the localhost
  product API as a pure `(Request, env, fetch) -> Response` function. Reads
  only `TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY`; bounds the request body size
  before parsing it as JSON.
- `apps/workbench/vite.config.ts` — dev-server-only middleware, bounds the
  raw byte count it buffers before the handler's own (identical) size check
  would reject it anyway, reads `process.env` only at request time.
- `apps/workbench/src/designCommand.ts` — browser client: one `fetch`, then
  (on `staged`) builds a normal `MutationProposalV1` input and hands it to
  the existing, unchanged `stageProposal`. `intentSummary` is truncated by
  Unicode code point (`Array.from(...).slice(...)`), not `.slice`, so an
  astral character near the 240-character boundary cannot be cut in half.
- `apps/workbench/src/App.tsx` — the "Design command" panel: locks every
  existing mutating/load/save/export control (not just its own) while an
  evaluation is pending, and only reports a `staged` outcome to the user
  after `stageProposal` has actually succeeded against product state.
  Evidence rendering shows full typed probabilities, not just the winning
  label and confidence.
- `e2e/design-command.spec.ts` — panel presence/accessibility, the pending
  lock across every mutating control, and full evidence rendering (via a
  mocked `route.fulfill`, so no credential or live call is needed).
- `playwright.designcommand.config.ts` + `e2e/design-command-live-boundary.spec.ts`
  — a `vite dev`-backed (not `vite preview`) browser test proving the real
  middleware resolves to `transport.missing-credential` end-to-end, with
  `TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY` explicitly forced empty in the
  webServer's environment and zero requests ever reaching `api.typesafe.ai`.

## The real TypeSafe wire contract

`POST /v1/systemone`, audited against the official API/SDK contract rather
than the Loop adapter's normalized internal representation (which differs
from the wire in several fields):

- `questions` in the request is an **object keyed by question id**, not an
  array. A question body is `{type, instructions, criteria}`, where
  `criteria` is a Choice option-id -> description map, a Score ordered
  scale array, or a Noul `{true, false}` object. No question body carries an
  `id` field — the id is only the object key.
- Every answer carries a **required `type` field** matching the primitive
  the question was asked as (`"choice"`, `"score"`, or `"noul"`), in
  addition to its primitive-specific fields.
- A Choice answer is `{type: "choice", choice, probabilities, confidence}`.
- A Score answer is `{type: "score", score, legend, probabilities, confidence}`,
  where `score` may be fractional and `legend` is an object keyed by
  numeric-string indices (`"0"`, `"1"`, ...), not an ordered array or an
  integer level.
- A Noul answer is `{type: "noul", noul}`.

`questions.ts` keeps a clean internal catalog (`InternalQuestion`, with an
explicit `id` field, for ergonomic code) and `toWireRequest` is the single
audited conversion point into the shape above. `accept.ts` validates raw
answers directly against this contract: an answer's `type` is checked first
against the question's expected primitive, before any other field. A
missing, unrecognized, or mismatched `type` (e.g. a Score-shaped body
answering a question asked as Noul, or no `type` field at all) is rejected
as `accept.primitive-mismatch`; any other shape deviation (extra/missing
field, wrong value type, malformed legend, etc.) is `accept.malformed-answer`.

## Multi-category support and `needsClarification`

The corrected architecture explicitly allows bounded multi-category
composition ("up to the proposal's existing eight-operation limit"). Each of
the six categories is judged **independently** by its own Choice question
(three options: `<positive>` / `<negative>` / `notTargeted`), so a command
like "make it denser and warmer" produces two independently-accepted,
confidently-targeted categories and composes into **two operations from one
Jev response** — this is the expected, fully-supported behavior, not a
clarification case.

`needsClarification` (Noul) is reserved for genuine contradiction (e.g.
"rounder but also sharper corners"), irreducible vagueness, or scope outside
the six supported categories — never for merely touching more than one
category. Its instructions explicitly tell Jev not to answer `true` just
because a command is multi-category (see `questions.ts`), and
`compose.ts`/`compose.test.ts`/`evaluate.test.ts` assert both directions:
multi-category commands stage, contradictory ones require clarification.

## Required-confidence fail-closed

`commandKind` and `needsClarification` are **required** judgments.
`compose.ts` checks them before ever looking at category answers:

1. `commandKind` accepted but **undecided** (confidence between the fixed
   0.5 floor and the product's 0.6 margin) → `clarification-required`,
   `cause: "command-kind-undecided"`. Zero operations.
2. `commandKind` decided as `outOfScope` → `unsupported`,
   `cause: "out-of-scope"`.
3. `needsClarification` accepted but **undecided** → `clarification-required`,
   `cause: "needs-clarification-undecided"`. Zero operations.
4. `needsClarification` decided `true` → `clarification-required`,
   `cause: "ambiguous"`.
5. Only past all four checks are category answers considered; a category
   below its own product margin is never `targeted` and never constructs an
   operation, independent of any other category's answer.

Every one of these paths still carries full typed evidence (`cause` is a
fixed, code-authored label — never Jev-generated prose).

## Transparent evidence (JDC-07)

`DesignCommandEvidence` now carries the full validated raw typed answer for
every question: `commandKindProbabilities`, each category's
`probabilities`, and `strengthScore`/`strengthProbabilities`/`strengthLegend`
in addition to the previously-shown selections/labels/confidences. The
workbench's evidence `<details>` renders every probability, not just the
winner. **The first candidate (`8fa86ad`) claimed this was already true; it
was not** — `CategoryEvidence` and `DesignCommandEvidence` dropped Choice
probabilities and all Score probability/legend detail. That is fixed here.

## Strict acceptance

`accept.ts` validates, per answer: a required `type` field matching the
question's expected primitive (checked first — `accept.primitive-mismatch`
if missing, unrecognized, or mismatched), exact top-level key set (no
extra/missing fields), every probability key exactly matches the offered option set (or
Score's `"0".."n-1"` index set), every probability finite in `[0,1]`,
probabilities sum to `1` within a `0.02` tolerance, the selected/max Choice
option is genuinely the probability max, Score's legend exactly matches the
declared scale in order, and Score's `score` may be fractional but must be
finite and in `[0, levels-1]`. Batch acceptance stays total: any single
malformed/missing/extra answer fails the whole decision closed.

## Bounded transport

- The `AbortController` timeout now covers the **entire** request, including
  reading the response body (`evaluate.test.ts` has a dedicated fixture
  using a `ReadableStream` that never closes, proving a stalled body still
  times out rather than hanging past `timeoutMs`).
- The localhost product API bounds the incoming request body to 8 KiB
  (`designCommandHandler.ts`'s `MAX_REQUEST_BODY_BYTES`), rejecting an
  oversized body with `design-command.request-too-large` before JSON
  parsing; the Vite dev-server middleware enforces the same bound while
  buffering bytes off the wire (duplicated as a literal, not imported — see
  the comment in `vite.config.ts` on why it can't statically import a
  runtime value from `designCommandHandler.ts`).
- Exactly one outbound TypeSafe attempt per evaluation; no retry.

## Real middleware browser evidence, no live call

`playwright.designcommand.config.ts` runs the actual `vite dev` server (not
`vite preview`'s static build) with `TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY`
explicitly forced empty in the webServer's environment (this overrides, not
merely fails to set, whatever value the outer shell might otherwise have),
plus decoy Loop/generic sentinel values that the handler must never read.
`design-command-live-boundary.spec.ts` clicks Evaluate in a real browser
against the real middleware and asserts the exact `transport.missing-credential`
code and zero requests to `api.typesafe.ai`. This is separate from, and does
not replace, the `vite preview`-based `build:workbench` + `test:browser:workbench`
evidence.

## Pending/stale UI safety

`locked` now also covers a pending Design command evaluation, not only a
staged proposal, so no mutating/load/save/export control (including the
"Stage proposal" button, which was not previously gated at all) can change
`current` or `session` while the async evaluation's eventually-captured
`base` is still in flight. `evaluateCommand` also no longer reports a
`staged` command outcome to the user until `stageProposal` has actually
succeeded against product state; if it fails, the visible outcome becomes a
`rejected` outcome carrying the real staging error code instead of
continuing to claim success.

## What the review audit found (and this run fixed)

1. The wire contract used the Loop adapter's internal shape (array
   questions, `selected`/`level`/integer legend array) instead of the real
   `POST /v1/systemone` shape. **Fixed** — see above; `evaluate.test.ts`
   asserts the exact outbound JSON shape.
2. `needsClarification`'s wording conflated "touches more than one
   category" with "needs clarification," so a legitimate two-category
   command like "make it denser and warmer" was routed to clarification
   instead of staging two operations. **Fixed** — see above.
3. An undecided `commandKind`/`needsClarification` answer could silently
   fall through to category evaluation and stage anyway. **Fixed** — both
   are now required gates that fail closed before any category is
   considered.
4. Evidence dropped Choice probabilities and Score probability/legend
   detail despite the doc claiming otherwise. **Fixed**, and this file no
   longer makes that claim without the code backing it.
5. Acceptance did not check exact probability key sets or sum-to-one.
   **Fixed.**
6. The transport timeout did not cover response-body reading, and neither
   the client's request body size to the localhost API nor the middleware's
   buffering was bounded. **Fixed.**
7. The only browser evidence for the real credential-boundary codes ran
   under `vite preview`, which has no route for the localhost API at all, so
   it only proved a generic client-side HTTP error, not the real middleware
   path. **Fixed** — a dedicated `vite dev` Playwright config/spec now
   proves the exact code end-to-end.
8. Nothing outside the Design command panel's own controls locked during a
   pending evaluation, and a successful Jev-level `staged` outcome was
   reported to the user before `stageProposal` had confirmed it actually
   staged. Fixing (1) surfaced a real, independent bug: the client's
   `provenance.sourceId` (`"jev-design-command/1"`) used `/`, which is
   outside `proposal.ts`'s `IDENTIFIER` regex (`[A-Za-z0-9._:-]{1,128}`), so
   *every* real `staged` outcome would have failed to stage with
   `proposal.invalid-provenance` — a bug the first candidate's own tests
   never exercised, because none of them reached a real `staged` code path
   with the eventual proposal actually being staged. **Both fixed.**
9. This file itself claimed evidence coverage the code didn't have.
   **Rewritten**, per this section.

## Protocol correction on top of `1ac4eeb`

A second, narrower owner-authorized correction added the official API's
required per-answer `type` discriminator (see "The real TypeSafe wire
contract" and "Strict acceptance" above, both updated in place): every raw
answer must carry `type` matching the question's primitive, and a missing,
unrecognized, or mismatched `type` is rejected as `accept.primitive-mismatch`
before any other field is checked. Changed files: `wire.ts`, `accept.ts`,
and their tests (`accept.test.ts`, `evaluate.test.ts`) — no product-boundary,
credential-isolation, multi-category, confidence-policy, transport, or UI
behavior changed.

## What is still not covered by this run

- No live Jev/TypeSafe call was made or attempted; the fixed endpoint and
  raw wire shapes are taken from documented material and this run's own
  careful reading of the correction above, not exercised against the real
  service.
- The independent 16-case mutation-boundary escape-hatch probe
  (`docs/BRIEF.md` Phase 2 result) was not rerun by this implementation run, since its
  fixture lives outside this worktree's product scope; `recipes.test.ts` and
  `compose.test.ts` add an equivalent closed-set assertion for the new
  design-command output path specifically.
