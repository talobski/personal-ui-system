import type { Theme } from "../theme/schema"
import { applyMutation, MUTATION_SCHEMA_VERSION, validateMutation } from "./mutation"
import type { MutationRuleId, ThemeOperation } from "./mutation"

export const PROPOSAL_VERSION = "1.0"
export const MAX_PROPOSAL_OPERATIONS = 8
export const MAX_INTENT_SUMMARY_LENGTH = 240

/**
 * Non-committing proposal transaction around the closed `ThemeOperation` union. The envelope adds identity, one
 * declared base, and bounded provenance; it adds no operation, path, CSS, or free-form metadata.
 */
export type ProposalProvenance = {
  source: string
  sourceId: string
  /** RFC-3339 timestamp. */
  createdAt: string
  intentSummary?: string
}

export type MutationProposalV1 = {
  version: typeof PROPOSAL_VERSION
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
  | "proposal.stale"

export type ProposalError = { ruleId: ProposalRuleId | MutationRuleId; path: string }

/** Lifecycle: received -> rejected | staged; staged -> applied | discarded | stale. `received` is never stored. */
export type ProposalStatus = "rejected" | "staged" | "applied" | "discarded" | "stale"

export type StagedProposal = {
  proposal: MutationProposalV1
  /** The candidate theme at base revision + 1; never the active theme. */
  candidate: Theme
  /** Full rendered CSS of the candidate. */
  css: string
}

/**
 * Immutable per-workbench-session state. `outcomes` holds every proposalId ever received, in order, so an id is
 * single-use across rejected, staged, applied, discarded, and stale outcomes. It lives only in memory.
 */
export type ProposalSession = {
  readonly outcomes: ReadonlyMap<string, ProposalStatus>
  readonly staged: StagedProposal | null
}

export const createProposalSession = (): ProposalSession => ({ outcomes: new Map(), staged: null })

export type StageResult =
  | { ok: true; session: ProposalSession; staged: StagedProposal }
  | { ok: false; session: ProposalSession; errors: ProposalError[] }

export type ResolveResult =
  | { ok: true; session: ProposalSession; theme?: Theme }
  | { ok: false; session: ProposalSession; errors: ProposalError[] }

const PROPOSAL_KEYS = new Set(["version", "proposalId", "base", "provenance", "operations"])
const BASE_KEYS = new Set(["themeId", "revision"])
const PROVENANCE_KEYS = new Set(["source", "sourceId", "createdAt", "intentSummary"])

/** Shared bounded identifier: proposalId, provenance source, and provenance sourceId. */
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/
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

const rejectedSession = (session: ProposalSession, proposalId: string): ProposalSession => ({
  outcomes: new Map(session.outcomes).set(proposalId, "rejected"),
  staged: session.staged,
})

/** Envelope validation only; operation contents are validated by core's mutation validator. */
function validateEnvelope(input: Record<string, unknown>): ProposalError[] {
  const errors: ProposalError[] = []
  const fail = (ruleId: ProposalRuleId, path: string) => errors.push({ ruleId, path })

  for (const key of Object.keys(input)) if (!PROPOSAL_KEYS.has(key)) fail("proposal.unknown-field", key)
  if (input.version !== PROPOSAL_VERSION) fail("proposal.unsupported-version", "version")

  const base = input.base
  if (!isRecord(base)) fail("proposal.invalid-base", "base")
  else {
    for (const key of Object.keys(base)) if (!BASE_KEYS.has(key)) fail("proposal.unknown-field", `base.${key}`)
    if (typeof base.themeId !== "string" || base.themeId.length === 0 || base.themeId.length > 128) fail("proposal.invalid-base", "base.themeId")
    if (!Number.isInteger(base.revision) || (base.revision as number) < 1) fail("proposal.invalid-base", "base.revision")
  }

  const provenance = input.provenance
  if (!isRecord(provenance)) fail("proposal.invalid-provenance", "provenance")
  else {
    for (const key of Object.keys(provenance)) if (!PROVENANCE_KEYS.has(key)) fail("proposal.unknown-field", `provenance.${key}`)
    if (!isIdentifier(provenance.source)) fail("proposal.invalid-provenance", "provenance.source")
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

/**
 * Receives a proposal against the active theme. The proposal is rejected or staged; either way its id is consumed.
 * Staging computes a candidate but never touches the active theme. A proposal without a usable string id cannot be
 * recorded, so it is rejected with the session unchanged.
 */
export function stageProposal(session: ProposalSession, active: Theme, input: unknown): StageResult {
  if (!isRecord(input)) return { ok: false, session, errors: [{ ruleId: "proposal.invalid-proposal", path: "" }] }
  if (!isIdentifier(input.proposalId)) return { ok: false, session, errors: [{ ruleId: "proposal.invalid-id", path: "proposalId" }] }
  const proposalId = input.proposalId
  if (session.outcomes.has(proposalId)) return { ok: false, session, errors: [{ ruleId: "proposal.duplicate-id", path: "proposalId" }] }

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
  if (errors.length > 0 || !candidate?.ok) return { ok: false, session: rejectedSession(session, proposalId), errors }

  // Rebuilt from validated fields only, so nothing outside the strict envelope is retained.
  const provenance = input.provenance as ProposalProvenance
  const proposal: MutationProposalV1 = {
    version: PROPOSAL_VERSION,
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
  const staged: StagedProposal = { proposal, candidate: candidate.theme, css: candidate.css }
  return { ok: true, session: { outcomes: new Map(session.outcomes).set(proposalId, "staged"), staged }, staged }
}

const notStaged = (session: ProposalSession): ResolveResult => ({
  ok: false,
  session,
  errors: [{ ruleId: "proposal.not-staged", path: "proposalId" }],
})

/**
 * Applies the staged proposal to the active theme in one step. If the active theme id or revision no longer matches
 * the declared base, the proposal becomes stale and nothing else changes. There is no rebase. Otherwise the
 * operations are revalidated against the active theme and the returned theme is at base revision + 1 exactly.
 * The caller commits `theme` as the active in-memory state; saving stays a separate action.
 */
export function applyProposal(session: ProposalSession, active: Theme, proposalId: string): ResolveResult {
  const staged = session.staged
  if (!staged || staged.proposal.proposalId !== proposalId) return notStaged(session)

  const { base } = staged.proposal
  if (active.id !== base.themeId || active.revision !== base.revision) {
    return {
      ok: false,
      session: { outcomes: new Map(session.outcomes).set(proposalId, "stale"), staged: null },
      errors: [{ ruleId: "proposal.stale", path: "base" }],
    }
  }

  const result = applyMutation(active, toRequest(staged.proposal))
  if (!result.ok) return { ok: false, session, errors: result.errors }
  return { ok: true, session: { outcomes: new Map(session.outcomes).set(proposalId, "applied"), staged: null }, theme: result.theme }
}

/** Discards the staged proposal. The active theme is not an input, so it cannot change. */
export function discardProposal(session: ProposalSession, proposalId: string): ResolveResult {
  if (!session.staged || session.staged.proposal.proposalId !== proposalId) return notStaged(session)
  return { ok: true, session: { outcomes: new Map(session.outcomes).set(proposalId, "discarded"), staged: null } }
}
