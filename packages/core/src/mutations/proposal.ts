import { diffThemeTokens } from "../theme/diff"
import type { ThemeTokenDiffEntry } from "../theme/diff"
import type { Theme } from "../theme/schema"
import { applyMutation, MUTATION_SCHEMA_VERSION, validateMutation } from "./mutation"
import type { MutationRuleId, ThemeOperation } from "./mutation"

export const PROPOSAL_SCHEMA_VERSION = "1.0"
export const MAX_PROPOSAL_OPERATIONS = 8
export const MAX_INTENT_SUMMARY_LENGTH = 240
export const PROVENANCE_SOURCES = ["manual", "agent", "fixture"] as const

/**
 * Non-committing proposal transaction around the closed `ThemeOperation` union. The envelope adds identity, one
 * declared base, and bounded provenance; it adds no operation, path, CSS, or free-form metadata.
 */
export type ProposalProvenance = {
  source: (typeof PROVENANCE_SOURCES)[number]
  sourceId: string
  /** RFC-3339 timestamp. */
  createdAt: string
  intentSummary?: string
}

export type MutationProposalV1 = {
  schemaVersion: typeof PROPOSAL_SCHEMA_VERSION
  proposalId: string
  base: { themeId: string; revision: number }
  provenance: ProposalProvenance
  operations: readonly ThemeOperation[]
}

export type ProposalRuleId =
  | "proposal.invalid-proposal"
  | "proposal.unsupported-version"
  | "proposal.unknown-field"
  | "proposal.invalid-id"
  | "proposal.duplicate-id"
  | "proposal.invalid-base"
  | "proposal.invalid-provenance"
  | "proposal.invalid-created-at"
  | "proposal.invalid-intent-summary"
  | "proposal.invalid-operations"
  | "proposal.staging-occupied"
  | "proposal.not-staged"
  | "proposal.candidate-mismatch"

export type ProposalError = { ruleId: ProposalRuleId | MutationRuleId; path: string }

/** Lifecycle: received -> rejected | staged; staged -> applied | discarded | stale. `received` is never stored. */
export type ProposalStatus = "rejected" | "staged" | "applied" | "discarded" | "stale"

/**
 * Data mirror of the lifecycle documented above, for read-only introspection (e.g. context capabilities). Deep-frozen
 * (the outer object and each nested array) so a caller mutation attempt throws instead of silently corrupting this
 * module-level singleton for every later caller.
 */
export const PROPOSAL_LIFECYCLE_TRANSITIONS = Object.freeze({
  received: Object.freeze(["rejected", "staged"] as const),
  staged: Object.freeze(["applied", "discarded", "stale"] as const),
}) satisfies Record<string, readonly ProposalStatus[]>

/** What was measured when the proposal was staged. `diff` is active -> candidate, sorted by path. */
export type ProposalEvaluation = {
  evaluatedAt: string
  activeRevision: number
  candidateRevision: number
  diff: ThemeTokenDiffEntry[]
}

export type ProposalResolution = {
  resolvedAt: string
  outcome: "applied" | "discarded" | "stale"
  activeRevisionBefore: number
  activeRevisionAfter: number
  /** Present for `stale`: the base-identity rule that failed. */
  errors?: ProposalError[]
}

/** An input with a usable proposalId that failed validation or could not be staged. The raw input is not retained. */
export type RejectedProposalRecord = {
  proposalId: string
  status: "rejected"
  receivedAt: string
  errors: ProposalError[]
}

/** A validated, staged proposal and, once resolved, how it ended. Provenance is retained in every terminal state. */
export type StagedProposalRecord = {
  proposalId: string
  status: "staged" | "applied" | "discarded" | "stale"
  proposal: MutationProposalV1
  evaluation: ProposalEvaluation
  resolution?: ProposalResolution
}

export type ProposalRecord = RejectedProposalRecord | StagedProposalRecord

/** The proposal currently staged. `candidate` is at base revision + 1 and is never the active theme. */
export type StagedProposal = {
  proposal: MutationProposalV1
  evaluation: ProposalEvaluation
  candidate: Theme
  /** Full rendered CSS of the candidate. */
  css: string
}

/**
 * Immutable, JSON-serializable per-workbench-session state. `records` holds every proposal that had a usable id, in
 * arrival order, so an id is single-use across rejected, staged, applied, discarded, and stale outcomes. The workbench
 * keeps it in memory only.
 */
export type ProposalSession = {
  readonly records: readonly ProposalRecord[]
  readonly staged: StagedProposal | null
}

export const createProposalSession = (): ProposalSession => ({ records: [], staged: null })

export type StageResult =
  | { ok: true; session: ProposalSession; staged: StagedProposal }
  | { ok: false; session: ProposalSession; errors: ProposalError[] }

export type ResolveResult =
  | { ok: true; session: ProposalSession; theme?: Theme }
  | { ok: false; session: ProposalSession; errors: ProposalError[] }

const PROPOSAL_KEYS = new Set(["schemaVersion", "proposalId", "base", "provenance", "operations"])
const BASE_KEYS = new Set(["themeId", "revision"])
const PROVENANCE_KEYS = new Set(["source", "sourceId", "createdAt", "intentSummary"])

/** proposalId and provenance.sourceId: 1 to 128 characters from [A-Za-z0-9._:-]. */
const IDENTIFIER = /^[A-Za-z0-9._:-]{1,128}$/
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/
const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|[+-](\d{2}):(\d{2}))$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isIdentifier = (value: unknown): value is string => typeof value === "string" && IDENTIFIER.test(value)

function isRfc3339(value: unknown): boolean {
  if (typeof value !== "string") return false
  const match = RFC3339.exec(value)
  if (!match) return false
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = match.slice(1).map((part) => (part === undefined ? 0 : Number(part))) as [
    number, number, number, number, number, number, number, number,
  ]
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth && hour <= 23 && minute <= 59 && second <= 60 && offsetHour <= 23 && offsetMinute <= 59
}

/** Envelope validation only; operation contents are validated by core's mutation validator. */
function validateEnvelope(input: Record<string, unknown>): ProposalError[] {
  const errors: ProposalError[] = []
  const fail = (ruleId: ProposalRuleId, path: string) => errors.push({ ruleId, path })

  for (const key of Object.keys(input)) if (!PROPOSAL_KEYS.has(key)) fail("proposal.unknown-field", key)
  if (input.schemaVersion !== PROPOSAL_SCHEMA_VERSION) fail("proposal.unsupported-version", "schemaVersion")

  const base = input.base
  if (!isRecord(base)) fail("proposal.invalid-base", "base")
  else {
    for (const key of Object.keys(base)) if (!BASE_KEYS.has(key)) fail("proposal.unknown-field", `base.${key}`)
    if (typeof base.themeId !== "string") fail("proposal.invalid-base", "base.themeId")
    if (!Number.isInteger(base.revision) || (base.revision as number) < 0) fail("proposal.invalid-base", "base.revision")
  }

  const provenance = input.provenance
  if (!isRecord(provenance)) fail("proposal.invalid-provenance", "provenance")
  else {
    for (const key of Object.keys(provenance)) if (!PROVENANCE_KEYS.has(key)) fail("proposal.unknown-field", `provenance.${key}`)
    if (!PROVENANCE_SOURCES.includes(provenance.source as ProposalProvenance["source"])) fail("proposal.invalid-provenance", "provenance.source")
    if (!isIdentifier(provenance.sourceId)) fail("proposal.invalid-provenance", "provenance.sourceId")
    if (!isRfc3339(provenance.createdAt)) fail("proposal.invalid-created-at", "provenance.createdAt")
    if ("intentSummary" in provenance) {
      const summary = provenance.intentSummary
      const valid =
        typeof summary === "string" && summary.length > 0 && Array.from(summary).length <= MAX_INTENT_SUMMARY_LENGTH && !CONTROL_CHARACTERS.test(summary)
      if (!valid) fail("proposal.invalid-intent-summary", "provenance.intentSummary")
    }
  }

  const operations = input.operations
  if (!Array.isArray(operations) || operations.length < 1 || operations.length > MAX_PROPOSAL_OPERATIONS) {
    fail("proposal.invalid-operations", "operations")
  }
  return errors
}

/** The same closed request shape the existing mutation validator and applier already own. */
const toRequest = (proposal: { proposalId: string; base: unknown; operations: unknown }) => ({
  schemaVersion: MUTATION_SCHEMA_VERSION,
  requestId: proposal.proposalId,
  base: proposal.base,
  operations: proposal.operations,
})

const hasRecord = (session: ProposalSession, proposalId: string) => session.records.some((record) => record.proposalId === proposalId)

const replaceRecord = (session: ProposalSession, record: ProposalRecord): readonly ProposalRecord[] =>
  session.records.map((existing) => (existing.proposalId === record.proposalId ? record : existing))

const stagedRecord = (session: ProposalSession, proposalId: string): StagedProposalRecord =>
  session.records.find((record): record is StagedProposalRecord => record.proposalId === proposalId && record.status === "staged")!

/**
 * Receives a proposal against the active theme. The proposal is rejected or staged; either way its id is consumed and
 * a serializable record is kept. Staging computes a candidate but never touches the active theme. A proposal without a
 * usable id cannot be recorded, so it is rejected with the session unchanged. `now` is an RFC-3339 timestamp.
 */
export function stageProposal(session: ProposalSession, active: Theme, input: unknown, now: string): StageResult {
  if (!isRecord(input)) return { ok: false, session, errors: [{ ruleId: "proposal.invalid-proposal", path: "" }] }
  if (!isIdentifier(input.proposalId)) return { ok: false, session, errors: [{ ruleId: "proposal.invalid-id", path: "proposalId" }] }
  const proposalId = input.proposalId
  if (hasRecord(session, proposalId)) return { ok: false, session, errors: [{ ruleId: "proposal.duplicate-id", path: "proposalId" }] }

  const errors = validateEnvelope(input)
  const operations = input.operations
  if (errors.length === 0) {
    // Operations, per-operation fields, and the declared base against the active theme (mutation.base-mismatch first).
    const validation = validateMutation(toRequest({ proposalId, base: input.base, operations }), active)
    if (!validation.ok) errors.push(...validation.errors)
  }
  if (errors.length === 0 && session.staged) errors.push({ ruleId: "proposal.staging-occupied", path: "" })

  let candidate: ReturnType<typeof applyMutation> | undefined
  if (errors.length === 0) {
    candidate = applyMutation(active, toRequest({ proposalId, base: input.base, operations }))
    if (!candidate.ok) errors.push(...candidate.errors)
  }
  if (errors.length > 0 || !candidate?.ok) {
    const rejected: RejectedProposalRecord = { proposalId, status: "rejected", receivedAt: now, errors }
    return { ok: false, session: { records: [...session.records, rejected], staged: session.staged }, errors }
  }

  // Rebuilt from validated fields only, so nothing outside the strict envelope is retained.
  const provenance = input.provenance as ProposalProvenance
  const proposal: MutationProposalV1 = {
    schemaVersion: PROPOSAL_SCHEMA_VERSION,
    proposalId,
    base: { themeId: active.id, revision: active.revision },
    provenance: {
      source: provenance.source,
      sourceId: provenance.sourceId,
      createdAt: provenance.createdAt,
      ...(provenance.intentSummary === undefined ? {} : { intentSummary: provenance.intentSummary }),
    },
    operations: structuredClone(operations) as ThemeOperation[],
  }
  const evaluation: ProposalEvaluation = {
    evaluatedAt: now,
    activeRevision: active.revision,
    candidateRevision: candidate.theme.revision,
    diff: diffThemeTokens(active, candidate.theme),
  }
  const staged: StagedProposal = { proposal, evaluation, candidate: candidate.theme, css: candidate.css }
  const record: StagedProposalRecord = { proposalId, status: "staged", proposal, evaluation }
  return { ok: true, session: { records: [...session.records, record], staged }, staged }
}

const notStaged = (session: ProposalSession): ResolveResult => ({
  ok: false,
  session,
  errors: [{ ruleId: "proposal.not-staged", path: "proposalId" }],
})

const resolve = (session: ProposalSession, proposalId: string, resolution: ProposalResolution): ProposalSession => ({
  records: replaceRecord(session, { ...stagedRecord(session, proposalId), status: resolution.outcome, resolution }),
  staged: null,
})

/**
 * Applies the staged proposal to the active theme in one step. If the active theme id or revision no longer matches
 * the declared base, the proposal becomes stale with `mutation.base-mismatch` (id) or `mutation.stale-revision`
 * (revision) and nothing else changes; there is no rebase. Otherwise the operations are revalidated against the active
 * theme and the regenerated candidate must equal the staged one, or Apply fails closed with
 * `proposal.candidate-mismatch` and the proposal stays staged. On success the returned theme is at base revision + 1
 * exactly; the caller commits it as the active in-memory state, and saving stays a separate action.
 */
export function applyProposal(session: ProposalSession, active: Theme, proposalId: string, now: string): ResolveResult {
  const staged = session.staged
  if (!staged || staged.proposal.proposalId !== proposalId) return notStaged(session)

  const { base } = staged.proposal
  const stale: ProposalError[] = []
  if (active.id !== base.themeId) stale.push({ ruleId: "mutation.base-mismatch", path: "base.themeId" })
  else if (active.revision !== base.revision) stale.push({ ruleId: "mutation.stale-revision", path: "base.revision" })
  if (stale.length > 0) {
    const resolution: ProposalResolution = {
      resolvedAt: now,
      outcome: "stale",
      activeRevisionBefore: active.revision,
      activeRevisionAfter: active.revision,
      errors: stale,
    }
    return { ok: false, session: resolve(session, proposalId, resolution), errors: stale }
  }

  const regenerated = applyMutation(active, toRequest(staged.proposal))
  if (!regenerated.ok) return { ok: false, session, errors: regenerated.errors }
  if (JSON.stringify(regenerated.theme) !== JSON.stringify(staged.candidate) || regenerated.css !== staged.css) {
    return { ok: false, session, errors: [{ ruleId: "proposal.candidate-mismatch", path: "candidate" }] }
  }

  const resolution: ProposalResolution = {
    resolvedAt: now,
    outcome: "applied",
    activeRevisionBefore: active.revision,
    activeRevisionAfter: regenerated.theme.revision,
  }
  return { ok: true, session: resolve(session, proposalId, resolution), theme: regenerated.theme }
}

/** Discards the staged proposal. The active theme is read only to record its revision; it is never returned or changed. */
export function discardProposal(session: ProposalSession, active: Theme, proposalId: string, now: string): ResolveResult {
  if (!session.staged || session.staged.proposal.proposalId !== proposalId) return notStaged(session)
  const resolution: ProposalResolution = { resolvedAt: now, outcome: "discarded", activeRevisionBefore: active.revision, activeRevisionAfter: active.revision }
  return { ok: true, session: resolve(session, proposalId, resolution) }
}
