# Agent context retrieval v1

Worker notes for `agent-context-retrieval-v1-001`. The versioned contract is `personal-ui-context/1`, a general
deterministic design-system consumption surface — not a proposal-construction API. It is additive: no existing
`registry.json`, contract, theme fixture, mutation operation, or proposal semantics changed.

## Where things live

- `packages/core/src/context/evaluator.ts` — the pure, deterministic `evaluateContextRequest(input): Promise<ContextResult>`
  core. Same request in, same result out; the only asynchrony is the existing single-item dynamic contract import from
  `contracts/catalog.ts` for `get`.
- `packages/core/src/context/types.ts` — strict request/result/error types for `personal-ui-context/1`.
- `packages/core/src/context/identity.ts` — static design-system identity (`system`, and the context/theme/mutation/proposal
  schema versions); no clock, environment, or filesystem read.
- `packages/core/src/context/themes.ts` — the validated-theme catalog. V1 has exactly one theme, `quiet-editorial` (the
  committed canonical fixture also used by the workbench).
- `packages/core/src/context/provenance.ts` — a static `sourceId`/`sha256` manifest for every theme and resource the
  surface can serve. Runtime code only reads this manifest; it never opens a file. `context.provenance.test.ts` is the
  only file that reads from disk, and it recomputes every hash to catch drift.
- `packages/core/src/context/principles.ts` — sourced design principles, quoted verbatim from `BRIEF.md`'s "Design
  boundaries" → "Personal system owns" list, keyed by resource id. A resource without a genuinely applicable, sourced
  principle is simply absent from the map; `principlesFor` returns `undefined`, not `[]`.
- `packages/core/src/context/capability-descriptions.ts` — human-readable value-constraint text per mutation operation,
  keyed off `describeOperations()` (a fresh copy of `mutations/mutation.ts`'s internal allowlist on every call) so a
  new operation without a matching description fails the suite instead of leaving `capabilities` silently inaccurate.
- `packages/core/src/context/ordering.ts` — `compareCodeUnits`, the one comparator every sort in this surface uses;
  never `localeCompare` (see "Determinism and byte stability" below).
- `packages/core/src/context/serialize.ts` — canonical JSON serialization (`toCanonicalJson`), the fail-closed
  `serializeWithCeiling` size check, and `deepFreeze`.
- `packages/core/src/context/cli.ts`, `bootstrap.mjs`, `resolve-hook.mjs` — the read-only local CLI (see below).

## Operations

### `list`

Design-system identity plus stable, sorted-by-id (code-unit order) summaries: every validated theme (`{id, name,
revision}`) and exactly the three existing V1 contracts (`{id, kind, purpose}` — `kind` is `"pattern"` for
`responsive-dialog` and `"component"` for the other two; `purpose` is sourced verbatim from that resource's own
validated contract, never invented prose).

### `get`

Requires `theme` and `resource`, both from the closed catalogs (`list` is how a caller discovers the allowlisted
values). Returns identity, the full validated `Theme`, every required contract field (`purpose`, `use`, `avoid`,
`variants`, `responsiveBehavior`, `accessibility`, `composition`, `examples`, `mistakes`, `mobileReplacement`,
`constraints`), `principles` only when real and applicable, `provenance` (`sourceId`/`sha256` for both the theme and the
resource), and a small `capabilitiesSummary` (schema versions, operation count, max proposal operations) — not the
full `capabilities` payload.

### `capabilities`

A secondary, descriptive-only surface: the closed `ThemeOperation` names/fields/value constraints (derived from
`describeOperations()`, so it cannot drift silently), the proposal envelope's limits and lifecycle
(`MAX_PROPOSAL_OPERATIONS`, `MAX_INTENT_SUMMARY_LENGTH`, `PROVENANCE_SOURCES`, `PROPOSAL_LIFECYCLE_TRANSITIONS` — all
exported, unchanged in meaning, from `mutations/mutation.ts` and `mutations/proposal.ts`), and an explicit
`unsupported` list of escape hatches (arbitrary CSS, arbitrary filesystem paths, JSON-pointer/set-any-path operations,
bulk operations, new operations/themes/contracts, natural-language/model-provider input, network/credentials/MCP). It
adds no semantics and constructs nothing.

`mutations/mutation.ts`'s internal `OPERATION_KEYS` map — the live allowlist `validateMutation` checks every request
against — is **not** exported. A `ReadonlyMap` type annotation only blocks the compiler; the same Map object would
still be mutable at runtime by any caller willing to cast around the type, which would mean a context consumer could
silently open a new mutation operation in production validation. `describeOperations()` is the only external read
path: it returns a brand-new array/object graph on every call, so mutating a returned descriptor can never reach, and
can never affect, the real allowlist.

## Request/result shape

Every request is `{ version: "personal-ui-context/1", operation, ...}`, strict — an unknown top-level field on any
operation, or `theme`/`resource` on `list`/`capabilities`, is rejected. A result is `{ ok: true, version, operation,
identity, ...payload }` or `{ ok: false, errors: [{ ruleId, path }] }`. There is no partial context: the first
structural problem short-circuits before any lookup (e.g. an unsupported version is reported before an unknown theme
would be).

## Rule IDs

`context.invalid-request`, `.unknown-field`, `.unsupported-version`, `.unsupported-operation`, `.unknown-theme`,
`.unknown-resource`, `.oversize-result`.

## Size ceilings

Checked after canonical serialization, before anything is returned or printed: `list` ≤ 8 KiB, `get` ≤ 32 KiB,
`capabilities` ≤ 8 KiB (`OPERATION_MAX_BYTES`). The ceiling is measured against the *exact envelope returned to the
caller and printed by the CLI* — `buildSuccessEnvelope(payload)`, i.e. `{ ok: true, ...payload }` — not the bare
payload before that wrapper exists; `context.envelope-ceiling.test.ts` proves this distinguishably (a synthetic
payload that fits the ceiling on its own but exceeds it once wrapped is correctly rejected). An oversize result fails
closed with `context.oversize-result` — no truncation, no partial payload. `context.ceiling.test.ts` proves the
boundary directly (accepts exactly at the ceiling, rejects one byte over) independent of real fixture size; the real
`get` payloads for all three pilots measure under 7 KiB today.

## Determinism, byte stability, and output immutability

Every builder constructs its result object with explicit, literal key order (never a spread from an
iteration-order-dependent source), and `toCanonicalJson` is `JSON.stringify` with no added whitespace — so identical
valid requests serialize byte-identically. This holds both in-process (repeated `evaluateContextRequest` calls) and
across separate CLI process invocations, both proven by tests. No clock, random source, locale-dependent formatting,
environment variable, or filesystem traversal participates in a result. Every sort (theme/resource ids, mutation
operation/field names) uses `compareCodeUnits` — an explicit UTF-16 code-unit comparator — never
`String.prototype.localeCompare`, whose collation is Intl/locale-dependent and would break byte stability across
environments; `context.ordering.test.ts` targets this directly.

`finalize()` also `deepFreeze`s the full success envelope before returning it, and the shared singleton catalogs it
can embed by reference (`PROVENANCE_MANIFEST` entries, `principlesFor` results, `PROPOSAL_LIFECYCLE_TRANSITIONS`,
`VALUE_CONSTRAINT_DESCRIPTIONS`, `UNSUPPORTED_ESCAPE_HATCHES`) are frozen at their own definition too. Any caller
mutation attempt on a returned result throws (this package is ESM, always strict mode) instead of silently changing
what a later, identical request returns — proven adversarially in `context.mutation-safety.test.ts`, which also
proves that mutating `describeOperations()`'s returned copy cannot alter what `validateMutation`/`applyMutation`
actually accept.

## Provenance

`PROVENANCE_MANIFEST` maps each theme/resource to a fixed, repo-relative `sourceId` (never an absolute worktree path)
and the SHA-256 of that source file's exact committed bytes. `context.provenance.test.ts` recomputes every hash from
the live file and fails if it no longer matches — the only place in this surface that touches the filesystem.
Sourced principles are hashed the same way, over the exact quoted string rather than the whole of `BRIEF.md`, so they
stay valid as unrelated parts of that file change; the same test asserts the quoted text still appears verbatim in the
live file. No timestamp, Git/worktree path, environment value, provider/model identifier, billing figure, `.loop`
state, or secret appears anywhere in a result.

## CLI

```sh
pnpm context -- list --version personal-ui-context/1
pnpm context -- get --version personal-ui-context/1 --theme quiet-editorial --resource button
pnpm context -- capabilities --version personal-ui-context/1
```

Read-only: the only recognized flags are `--version`, `--theme`, `--resource`, each accepted at most once. There is
no output-path, write, network, or arbitrary-path option. A successful request prints exactly one line of canonical
JSON to stdout and exits 0. **Every** failure — a request the evaluator itself rejects, or a CLI-level argv problem
(no operation given, an unrecognized flag, a flag with a missing value, positional junk, a duplicate flag) — prints
exactly one line of the stable `{ ok: false, errors: [{ ruleId, path }] }` JSON to stderr and exits nonzero (2 for an
argv-parse failure, 1 for an evaluator-rejected request); stdout stays empty and no prose/usage text is ever written
to stderr alongside it. Argv-level `path` values are fixed strings the CLI itself chooses (`argv.operation`,
`argv.flags.unsupported`, `argv.flags.missing-value`, `argv.flags.duplicate`, `argv.positional`) — never the
caller-supplied flag name or token — so a CLI error can never reflect arbitrary input back into its own output.
`list`/`capabilities` reject a `--theme`/`--resource` flag and `get` requires both, both enforced by the evaluator's
own per-operation field allowlist (`context.unknown-field` / `context.invalid-request`), not by CLI-side special
casing. The CLI never writes a file and never opens a network connection.

`cli.ts` is plain TypeScript with the same extensionless relative imports the rest of `packages/core` already uses
(resolved everywhere else by Vite/Vitest/tsc's bundler resolution). Node's own ESM loader requires explicit
extensions on relative specifiers, so `bootstrap.mjs` registers `resolve-hook.mjs` — a small loader hook that retries
an extensionless relative specifier with `.ts` (or `/index.ts`) appended — before dynamically importing `cli.ts`. This
changes no import statement anywhere else in the package and adds no runtime behavior beyond specifier resolution.

## Tests

Colocated under `packages/core/src/context/*.test.ts`:

- `context.request.test.ts` — malformed/unknown-field/unsupported-version/unsupported-operation/unknown-theme/
  unknown-resource, and no-partial-context.
- `context.list.test.ts`, `context.get.test.ts`, `context.capabilities.test.ts` — per-operation coverage, size, and
  in-process byte-stability.
- `context.ceiling.test.ts` — the size-ceiling boundary in isolation, via a synthetic payload.
- `context.envelope-ceiling.test.ts` — proves the ceiling is measured against the full success envelope
  (`{ ok: true, ...payload }`), not the bare payload, plus a real-fixture check for all three operations.
- `context.ordering.test.ts` — `compareCodeUnits` vs. locale-collation-shaped expectations.
- `context.mutation-safety.test.ts` — adversarial: every returned result is deep-frozen (mutation attempts throw),
  a mutation attempt on one result never affects a later identical call, and mutating `describeOperations()`'s
  returned copy cannot alter `validateMutation`/`applyMutation`'s actual behavior.
- `context.provenance.test.ts` — hash-vs-disk and principle-vs-`BRIEF.md` verification (the only fs-touching test).
- `context.cli.test.ts` — spawns the CLI as a separate process: stdout-only success, stderr-only single-line stable-
  JSON failure (no prose) for no-args/unsupported-flag/missing-flag-value/positional-junk/duplicate-flag, exit codes,
  operation-specific flag enforcement, and cross-invocation byte stability.
- `context.acr11-fresh-agent-path.test.ts` — the ACR-11 scenario end to end, using only the public `context` API plus
  core's existing `applyMutation`/`stageProposal`: component selection from `list`, reading responsive/accessibility
  obligations and an unsupported composition straight off `get`, staging one valid proposal built from a
  `capabilities`-described operation, and rejecting an arbitrary CSS/path operation.
