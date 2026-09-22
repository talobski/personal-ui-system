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
  keyed off `OPERATION_KEYS` (exported from `mutations/mutation.ts`, unchanged) so a new operation without a matching
  description fails the suite instead of leaving `capabilities` silently inaccurate.
- `packages/core/src/context/serialize.ts` — canonical JSON serialization (`toCanonicalJson`) and the fail-closed
  `serializeWithCeiling` size check.
- `packages/core/src/context/cli.ts`, `bootstrap.mjs`, `resolve-hook.mjs` — the read-only local CLI (see below).

## Operations

### `list`

Design-system identity plus stable, sorted-by-id summaries: every validated theme (`{id, name, revision}`) and exactly
the three existing V1 contracts (`{id, kind}`, `kind` is `"pattern"` for `responsive-dialog` and `"component"` for the
other two).

### `get`

Requires `theme` and `resource`, both from the closed catalogs (`list` is how a caller discovers the allowlisted
values). Returns identity, the full validated `Theme`, every required contract field (`purpose`, `use`, `avoid`,
`variants`, `responsiveBehavior`, `accessibility`, `composition`, `examples`, `mistakes`, `mobileReplacement`,
`constraints`), `principles` only when real and applicable, `provenance` (`sourceId`/`sha256` for both the theme and the
resource), and a small `capabilitiesSummary` (schema versions, operation count, max proposal operations) — not the
full `capabilities` payload.

### `capabilities`

A secondary, descriptive-only surface: the closed `ThemeOperation` names/fields/value constraints (derived from
`OPERATION_KEYS`, so it cannot drift silently), the proposal envelope's limits and lifecycle (`MAX_PROPOSAL_OPERATIONS`,
`MAX_INTENT_SUMMARY_LENGTH`, `PROVENANCE_SOURCES`, `PROPOSAL_LIFECYCLE_TRANSITIONS` — all exported, unchanged, from
`mutations/mutation.ts` and `mutations/proposal.ts`), and an explicit `unsupported` list of escape hatches (arbitrary
CSS, arbitrary filesystem paths, JSON-pointer/set-any-path operations, bulk operations, new operations/themes/contracts,
natural-language/model-provider input, network/credentials/MCP). It adds no semantics and constructs nothing.

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
`capabilities` ≤ 8 KiB (`OPERATION_MAX_BYTES`). An oversize result fails closed with `context.oversize-result` — no
truncation, no partial payload. `context.ceiling.test.ts` proves the boundary directly (accepts exactly at the ceiling,
rejects one byte over) independent of real fixture size; the real `get` payloads for all three pilots measure under
7 KiB today.

## Determinism and byte stability

Every builder constructs its result object with explicit, literal key order (never a spread from an
iteration-order-dependent source), and `toCanonicalJson` is `JSON.stringify` with no added whitespace — so identical
valid requests serialize byte-identically. This holds both in-process (repeated `evaluateContextRequest` calls) and
across separate CLI process invocations, both proven by tests. No clock, random source, locale-dependent formatting,
environment variable, or filesystem traversal participates in a result.

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

Read-only: the only recognized flags are `--version`, `--theme`, `--resource`. There is no output-path, write,
network, or arbitrary-path option — an unrecognized flag is rejected (exit 2) rather than ignored. A successful
request prints exactly one line of canonical JSON to stdout and exits 0. A failed request prints exactly one line of
the stable `{ ok: false, errors }` JSON to stderr and exits nonzero; stdout stays empty. The CLI never writes a file
and never opens a network connection.

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
- `context.provenance.test.ts` — hash-vs-disk and principle-vs-`BRIEF.md` verification (the only fs-touching test).
- `context.cli.test.ts` — spawns the CLI as a separate process: stdout-only success, stderr-only stable-JSON failure,
  exit codes, unsupported-flag rejection, and cross-invocation byte stability.
- `context.acr11-fresh-agent-path.test.ts` — the ACR-11 scenario end to end, using only the public `context` API plus
  core's existing `applyMutation`/`stageProposal`: component selection from `list`, reading responsive/accessibility
  obligations and an unsupported composition straight off `get`, staging one valid proposal built from a
  `capabilities`-described operation, and rejecting an arbitrary CSS/path operation.
