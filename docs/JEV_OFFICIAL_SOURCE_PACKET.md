# Jev official-source packet for the design-command phase

> **Architecture correction (2026-09-22):** The owner clarified that this
> phase is a product-level Jev integration. `@loop-engineering/jev-core`, its
> contracts, `.loop` coupling, budgets, and credential are control-plane-only
> and are not candidate product infrastructure. Questions below about that
> package are retained as historical research context; the accepted product
> boundary is `docs/JEV_PRODUCT_ARCHITECTURE.md`.

Retrieved by the Lead on 2026-09-22 from the official TypeSafe documentation.
This packet exists because the admitted worker profiles prohibit external
network access. Workers must treat the linked TypeSafe pages as the sources,
analyze the constraints below against the repository, and preserve citations in
their research checkpoint. This packet is not a replacement for the official
documentation and contains no credentials.

## Required official sources

1. <https://docs.typesafe.ai/introduction>
2. <https://docs.typesafe.ai/llms.txt>
3. <https://docs.typesafe.ai/concepts/state>
4. <https://docs.typesafe.ai/primitives>
5. <https://docs.typesafe.ai/primitives/choice>
6. <https://docs.typesafe.ai/primitives/score>
7. <https://docs.typesafe.ai/primitives/noul>
8. <https://docs.typesafe.ai/confidence>
9. <https://docs.typesafe.ai/concepts/how-to-build-with-system-one>
10. <https://docs.typesafe.ai/patterns/fan-out>
11. <https://docs.typesafe.ai/patterns/confidence-routing>
12. <https://docs.typesafe.ai/patterns/intent-routing>
13. <https://docs.typesafe.ai/demos/smart-home>
14. <https://docs.typesafe.ai/cookbooks/function_calling>
15. <https://docs.typesafe.ai/sdk/javascript>
16. <https://docs.typesafe.ai/api>
17. <https://docs.typesafe.ai/models>
18. <https://docs.typesafe.ai/model-jaggedness/jev-1.13>

The phase cap is twenty official pages; follow links only when needed to resolve
a concrete contract question.

## Verified source constraints to analyze

- Jev consumes state plus typed questions and returns structured answers.
  Choice returns a selected option, probabilities, and confidence; Score returns
  a rubric level/distribution and confidence; Noul returns a 0–1 probability.
- Different primitives may be mixed in one request. Questions are evaluated in
  parallel and independently against the same state.
- Questions should be atomic. Complex judgments should be decomposed and
  recomposed by deterministic code.
- The smart-home demo uses speculative fan-out: it asks command category,
  domain, target, and action questions together, then code ignores irrelevant
  answers. Sequential calls are explicitly presented as the wrong shape for
  this use case.
- The smart-home demo sends compound-command splitting and conversational text
  generation to an LLM. This phase excludes that fallback and must instead
  return an explicit unsupported or clarification outcome.
- Intent routing uses confidence as a second decision axis and routes low
  confidence to a safer handler rather than treating the selected label as
  sufficient.
- The function-calling cookbook maps natural language to ordinary functions
  whose arguments come from closed sets. Optional arguments use a separate
  stated/not-stated judgment; omitted arguments retain deterministic defaults.
- A composed call's safety depends on its weakest required judgment. The phase
  must define how required question confidence is aggregated without inventing
  reasoning text.
- Jev 1.13 can read instructions literally, is weak at arithmetic/counting and
  numeric representations, struggles with indirection and irrelevant context,
  and is not a text generator. Arithmetic, color conversion, interpolation,
  clamping, defaulting, and structural invariants therefore belong in code.
- Numeric theme values and color coordinates should not be presented as the
  semantic judgment. Code should send compact named buckets or descriptions
  and retain exact values outside the model decision.
- Instructions and criteria must align. Do not rely on a Noul and its negation
  summing to one, do not assume a Noul probability and Choice confidence mean
  the same thing, and do not reuse thresholds across primitive types without an
  explicit contract.
- State is data and is not inherently protected against adversarial text.
  Command strings require negative fixtures and may never expand authority,
  option sets, operations, or side effects.
- Filter state before sending it. Only compact fields relevant to the declared
  atomic questions should enter the packet.
- When the answer space is not bounded, use a generative model rather than
  forcing Jev to generate text. This phase deliberately stays bounded.

## Repository-specific questions the researcher must answer

1. Can `@loop-engineering/jev-core@0.1.0` represent the proposed command packet
   and audit record without a second Jev client or duplicated policy logic?
2. Which existing theme operations and fixed targets can safely back a closed
   semantic recipe catalog without widening `ThemeOperation`?
3. What exact compact state should Jev receive, and which exact fields must be
   withheld or converted into named semantic buckets?
4. Which questions are Choice, Score, or Noul, and why is each primitive the
   correct one?
5. Which answers are required versus speculative, how is low confidence handled,
   and which deterministic fallback outcomes are allowed?
6. How can one command affect several categories without an unbounded command
   splitter or multiple Jev calls?
7. What fixtures demonstrate the documented jagged edges fail closed?
8. Where should the product-side transport boundary live without exposing
   credentials to the browser or persisting them in workbench state?
9. How are typed decisions and probabilities shown transparently without
   claiming that Jev supplied prose rationale?
10. What evidence will prove one-call fan-out and zero mutation before Apply?

## Existing local sources

- `BRIEF.md`, Phase 5.
- `docs/JEV_ADAPTER.md`.
- `docs/JEV_RUNTIME_CHECKPOINT.md`.
- `docs/MUTATION_PROPOSAL_PREVIEW.md`.
- `packages/core/src/mutations/`.
- `packages/core/src/theme/`.
- `apps/workbench/src/`.
- `tools/loop/jev/` and the installed/vendored shared runtime.

Workers must not read or write canonical `.loop/`, modify the canonical Loop
Engineering specification, launch agents, enable network, request escalation,
or make live Jev calls. Live-call admission remains a Lead-controlled later
step after the research contract is accepted.
