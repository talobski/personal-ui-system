# Product-level Jev architecture checkpoint

Date: 2026-09-22
Status: owner-approved architecture; implemented in `packages/core/src/jev-design/` and
`apps/workbench/src/server/designCommandHandler.ts`

## Recommendation

Use **Jev only for the current Design command MVP and defer the
general-purpose LLM decision**. Do not add an LLM credential, provider
abstraction, hybrid orchestration layer, or generative fallback in this phase.

The admitted experience has a closed answer space: command kind, six existing
theme categories, declared directions, categorical strength, and whether the
command needs clarification. Jev can evaluate those atomic Choice, Score, and
Noul questions together. Deterministic product code then selects versioned
recipes, constructs only existing `ThemeOperation` values, and stages the
unchanged `MutationProposalV1`. A command may target multiple categories; code
composes every independently accepted category recipe, up to the proposal's
existing eight-operation limit. This bounded multi-category composition does
not require free-form command decomposition or a general LLM.

## Product ownership

`DESIGN_COMMAND` is the internal product contract
`personal-ui-design-command/1`.

Product code owns:

- the compact design-command state;
- the atomic mixed-primitive question catalog;
- product confidence and ambiguity policy;
- versioned design recipes;
- deterministic composition into the closed `ThemeOperation` union;
- `staged`, `clarification-required`, `unsupported`, and `rejected` outcomes;
- proposal provenance, validation, UI state, and side effects; and
- a bounded product-local TypeSafe transport.

The product path depends on no agent-orchestration package, state, routing
contract, billing policy, request budget, or credential.

No generic transport extraction is required. Generic
wire validation, bounded fetch, and redaction could be extracted only after
multiple products demonstrate real reuse; doing so now would be premature.

## Local transport and credential boundary

```text
Workbench browser -> localhost product API -> TypeSafe API
```

The browser sends only the command and compact product state. The product API
uses only `TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY`, injected server-side. It never
falls back to, aliases, or inspects `TYPESAFE_API_KEY`.

The product credential must never enter a Vite client variable, browser bundle,
localStorage, IndexedDB, proposal provenance, product state, logs, analytics,
errors, or source maps. A local gitignored environment file or local
secret manager may provide the development variable to the product server; the
value is never checked into the repository.

Before a live request, the product server checks only that the product
credential is present and non-empty. Absence or emptiness makes zero fetches.
Credential presence is not evidence of billing eligibility, so a live request
also requires separate fresh owner evidence that the product key has included
capacity. No request is made merely to test the key.

The transport makes one bounded HTTP attempt. It does not silently retry or use
an SDK default retry policy. Missing/empty/rejected credentials, timeout,
network error, 429/529, malformed or oversized JSON, an incomplete or extra
answer set, primitive mismatch, and low-confidence required answers all return
a stable product-level failure. No invalid proposal is staged and the active
theme, revision, persistence, preview, and proposal session remain unchanged.

## Future public BYOK direction

The environment variable is local-development infrastructure, not the public
storage model. A public product should accept each authenticated user's Jev
token over HTTPS and keep it in a backend-managed session secret or encrypted
secret store. The browser receives only configured/unconfigured status after
registration. Tokens are never sent directly from the browser to TypeSafe,
returned by the backend, or stored in browser persistence. Replacement,
revocation, tenant isolation, fixed-destination egress, rate limiting, and
credential-safe telemetry are prerequisites for that later phase.

## General-purpose LLM decision

No current capability requires a general LLM. The following would justify a
new decision in a later, separately admitted phase:

- open-ended compound-command decomposition beyond bounded category fan-out;
- multi-turn conversational planning or refinement;
- generated explanations or synthesis;
- screenshot, website, or broad design-system interpretation;
- proposing novel dimensions or actions outside the closed recipe catalog; or
- agent/tool coordination across product resources.

Those capabilities add a second credential and trust boundary, open-ended
output validation, prompt-injection risk, provider capability negotiation,
cost controls, and materially broader verification. None improves the current
closed command-to-proposal flow enough to justify that complexity.

If later justified, use a provider-neutral capability contract rather than a
brand-specific abstraction. A general model may propose a bounded plan or
closed intermediate commands; deterministic gates must validate them, Jev may
resolve genuinely probabilistic typed judgments, and only product code may
construct or apply operations. Each public user would supply a separate
supported LLM credential/configuration in addition to their Jev token. All
product AI credentials remain separate from any developer-tooling credentials.

## Acceptance and verification consequences

The JDC-01 through JDC-12 acceptance criteria are summarized in `BRIEF.md`
(Phase 5). The load-bearing checks are:

1. Mixed-primitive, multi-category contract fixtures and deterministic recipes.
2. Injected-fetch transport tests proving zero calls without the product key,
   exactly one call per evaluated command, fixed destination, and no retries.
3. Test sentinels proving the generic `TYPESAFE_API_KEY` variable is ignored and no
   credential reaches client assets, storage, records, errors, or logs.
4. Bundle checks proving no credential or server-only module reaches the
   browser build.
5. Failure fixtures proving every unsafe outcome leaves product state unchanged.
6. Existing proposal lifecycle, browser, accessibility, build, and regression
   evidence.
7. Supervised live evidence only after separate credential-presence and
   product-capacity confirmation; no live call is needed to establish this
   architecture.

No credential value or presence was inspected and no live Jev request was made
while producing this checkpoint.
