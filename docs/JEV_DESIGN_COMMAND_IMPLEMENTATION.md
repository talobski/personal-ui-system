# Jev design-command MVP — producer implementation notes

Producer run `jev-design-command-producer-001`, base `c33a010`. This implements
the corrected, owner-approved product-level architecture in
`docs/JEV_PRODUCT_ARCHITECTURE.md`, not the superseded
`WORKER_FAN_OUT`/`@loop-engineering/jev-core`/single-category design in
`docs/JEV_DESIGN_COMMAND_RESEARCH.md`. That research's official-source
citation table, jaggedness analysis, and bounded-composition principles are
carried forward as evidence; its contract-repurposing, 8-question ceiling,
`.loop`-writing transport, and single-category-only conclusions are not
implemented, per its own supersession note and the corrected architecture.

## What changed

- `packages/core/src/jev-design/` — new, pure, transport-free deterministic
  core: `state.ts` (compact `design-command-state/1`), `wire.ts` (the
  TypeSafe `{model, state, questions}` / `{answers}` wire contract and fixed
  endpoint/model, taken from `docs/JEV_ADAPTER.md`'s documented TypeSafe
  behavior, not from `jev-core` itself), `questions.ts`
  (`design-command-questions/1`, nine questions mixing Choice/Score/Noul),
  `accept.ts` (acceptance policy: the documented fixed 0.5 floor plus one
  stricter product-owned margin), `recipes.ts` (`design-command-recipes/1`,
  closed `(category, direction, strength) -> ThemeOperation` preset table),
  `compose.ts` (deterministic composition to a `DesignCommandOutcome`).
  `evaluate.ts` is the one file with the transport orchestrator (injected
  `fetch`, injected `apiKey`, one bounded HTTP attempt, no retry); it is
  exported only via the `@personal-ui/core/jev-design/evaluate` subpath, not
  the main barrel, so nothing credential-adjacent is pulled into the general
  import surface.
- `apps/workbench/src/server/designCommandHandler.ts` — the localhost
  product API as a pure `(Request, env, fetch) -> Response` function. Reads
  only `TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY` from an injected `env`; never
  reads `TYPESAFE_LOOP_ENGINEERING_API_KEY` or `TYPESAFE_API_KEY`, never
  imports `@loop-engineering/jev-core`, never touches `.loop`.
- `apps/workbench/vite.config.ts` — a dev-server-only middleware plugin at
  `POST /api/design-command/evaluate` that adapts Node's request/response to
  the Web `Request`/`Response` the handler expects, reads `process.env` only
  at request time, and loads the handler through `server.ssrLoadModule` (Vite's
  own SSR resolver) rather than a plain Node `import`, because `vite.config.ts`
  itself is loaded by Vite's config bundler, which does not resolve
  `@personal-ui/core`'s extensionless workspace-source imports the way the
  real Vite dev/build pipeline does. This only affects the dev server; `vite
  build` never evaluates the middleware body.
- `apps/workbench/src/designCommand.ts` — browser-side client: one `fetch` to
  the localhost route, then (on `staged`) builds a normal `MutationProposalV1`
  input (`provenance.source: "agent"`) and hands it to the existing,
  completely unchanged `stageProposal` from Phase 4. The Design command panel
  never calls a bespoke apply/stage path.
- `apps/workbench/src/App.tsx` — new "Design command" panel: a command
  textarea, an Evaluate button (disabled while empty or while a proposal is
  staged, matching the existing lock semantics), a pending/status region, and
  a transparent evidence `<details>` block showing every typed answer,
  probability/confidence, and the recipe/question catalog versions. Reuses
  the existing "Staged proposal" panel and its Apply/Discard controls
  unmodified.
- `.env.example` — documents `TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY` only (no
  value committed).
- `e2e/design-command.spec.ts` — browser/accessibility evidence for the new
  panel, added to both viewport projects in `playwright.workbench.config.ts`
  and excluded from the Storybook config.

## Corrected question/recipe design (multi-category, no `WORKER_FAN_OUT`)

Nine questions, one packet, all three primitives:

| Question | Primitive | Options/scale |
|---|---|---|
| `commandKind` | Choice | `themeAdjustment` / `outOfScope` |
| `targetsColor`…`targetsMotion` (×6) | Choice | `<positive>` / `<negative>` / `notTargeted` per category |
| `strength` | Score | `subtle` / `moderate` / `strong` |
| `needsClarification` | Noul | compound/ambiguous-intent probability |

Because the corrected architecture explicitly allows bounded multi-category
composition ("up to the proposal's existing eight-operation limit"), each
category is judged independently by its own Choice question (which also
directly encodes direction — a genuine, idiomatic use of Choice, unlike the
superseded research's Choice-avoidance workaround for `jev-core`'s
`WORKER_FAN_OUT`). Every independently-accepted, confidently-targeted
category composes into its own operation in the same command; there is no
`isCompound`-vs-single-category tradeoff and no artificial 8-question
ceiling to design around, since this product path never touches
`jev-core`'s `packet.ts` limits at all.

`needsClarification` still exists as a dedicated Noul, because a command can
be self-contradictory or otherwise ambiguous in a way that is not the same
question as "which categories are targeted" — e.g. "make it denser but also
looser" should not silently resolve to whichever category answer happened to
win.

## Confidence/acceptance policy

`accept.ts` implements the documented fixed TypeSafe rules (Choice needs an
offered, probability-max option with `confidence >= 0.5`; Score needs an
exact legend match, in-range level, `confidence >= 0.5`; Noul needs a finite
value in `[0,1]` with `0.5` itself rejected as unresolved) and adds one
product-owned margin on top: a category Choice or `needsClarification` Noul
must additionally clear `CHOICE_CONFIDENCE_MARGIN = 0.6` /
`NOUL_MARGIN = 0.2` (`|value - 0.5| >= 0.2`) to be treated as *decided*.
Batch acceptance is total: any single malformed/missing/mismatched answer
fails the whole decision closed (`compose.ts` never runs on a partial
batch). These constants are product policy, not protocol, and are safe to
retune later without a wire-format change (mirrors
`docs/JEV_DESIGN_COMMAND_RESEARCH.md` §12 risk 8's framing, restated here for
the corrected design).

## Recipe presets (producer taste calls)

Radius/density/shadow/motion presets are unchanged from the superseded
research's numeric tables (already schema-bound, still valid evidence).
Color and typography presets were left open by that research as owner/product
taste calls; this run defines them directly since no further gate blocks
them: `primary` token OKLCH presets for warmer/cooler, and a `Source Serif 4`
/ `Inter` editorial/neutral font swap. All are verified against the real
`validateMutation` in `recipes.test.ts` (every category × direction ×
strength × mode combination), so the recipe catalog cannot regress the
closed mutation boundary.

## Outcomes

`staged` / `clarification-required` / `unsupported` / `rejected`, matching
BRIEF Phase 5. `rejected` covers both pre-decision transport/shape failures
(`transport.*`, `accept.*`) and the explicit empty-command-text case
(`design-command.empty-text`); it is the only outcome without evidence,
since a batch that failed acceptance cannot be trusted to compose
transparent evidence from it.

## Credential isolation

`apps/workbench/src/server/designCommandHandler.test.ts` contains the three
mandatory fixtures plus two additional sentinel-leak assertions, all passing
offline with an injected `env` object and injected `fetch` (no real
`process.env` read, no real credential inspected, no live request made by
this producer run).

## What is not covered by this run

- No live Jev/TypeSafe call was made or attempted; `TYPESAFE_API_URL` is
  taken from the documented fixed endpoint in `docs/JEV_ADAPTER.md`
  (`https://api.typesafe.ai/v1/systemone`) and has not been exercised against
  the real service by this run.
- The Lead's independent 16-case mutation-boundary escape-hatch probe
  (`docs/BRIEF.md` Phase 2 result) was not rerun by this producer, since its
  fixture lives outside this worktree's product scope; `recipes.test.ts` and
  `compose.test.ts` add an equivalent closed-set assertion for the new
  design-command output path specifically.
- `e2e/design-command.spec.ts`'s browser test exercises the real
  `vite.config.ts` middleware end-to-end only under `vite dev`, not `vite
  preview` (the config used by `playwright.workbench.config.ts`); the static
  preview server has no route for `/api/design-command/evaluate`, so the
  panel's fail-closed rendering there is proven, but that specific run's
  rejection is a client-side HTTP error rather than
  `transport.missing-credential`. Both are stable, evidence-bearing rejected
  outcomes, and `apps/workbench/src/server/designCommandHandler.test.ts`
  proves the real credential-boundary codes offline. A future phase could
  add a `vite dev`-backed Playwright project if a real-middleware browser
  fixture becomes required.
