import { isSensitiveKey, redactString, stableJson, validateProjectStateV2, type Check, type Json, type JsonObject, type ProjectStateV2 } from "@loop-engineering/jev-core/src/index.ts"

export const PERSONAL_LEGACY_ACCEPTED_COMMIT = "a41caf5f90eea760cf245addf1d70f7e34e9c443"
export const PERSONAL_CONTROL_CHECKPOINT = "dedf949702e9b869670cbb3bc344d4e1b220f4dd"
/** The only legacy short forms audited in the handoff records. */
export const PERSONAL_PINNED_LEGACY_COMMIT_ABBREVIATIONS = {
  [PERSONAL_LEGACY_ACCEPTED_COMMIT]: "a41caf5",
  [PERSONAL_CONTROL_CHECKPOINT]: "dedf949",
} as const
export const PERSONAL_HISTORICAL_AGENT_RUNS = 14
export const PERSONAL_HISTORICAL_PROVIDER_REQUESTS = 23
export const PERSONAL_HISTORICAL_JEV_CALLS = 2
export const PERSONAL_LIFETIME_AGENT_RUN_CEILING = 19
export const PERSONAL_PHASE_B_ALLOCATION = { agentRuns: 5, leadToWorkerTurns: 7, phaseAttempts: 5, concurrency: 1, paidSpend: 0 } as const
/** Exact human-only baseline; Lead context cannot widen this migration authority. */
export const PERSONAL_HUMAN_ONLY_AUTHORITY = {
  paidBudget: 0,
  publicPublishing: "human",
  productionDeployment: "human",
  destructiveProductionChanges: "human",
  financialLiability: "human",
  rulePromotion: "human",
} as const

const LEGACY_KEYS = ["projectId", "phase", "tasks", "counters", "inFlight", "providerStates", "authority", "runtime", "lastPause", "completedPhases", "handoff", "retrospectiveFindings", "pause"] as const

type CommitContext = { commit: string; handoffPath: readonly string[]; evidenceRefs: readonly string[] }
export type PersonalLegacyMigrationContext = {
  acceptedLine: string
  currentTimestamp: string
  acceptedMainCommit: CommitContext
  currentMainHead: CommitContext
  phaseB: { phaseId: string; allocation: JsonObject; counters: JsonObject }
  approvedAuthority: JsonObject
  /** Lead-supplied snapshots make task/attempt loss detectable rather than implicit. */
  expectedTasks: readonly JsonObject[]
  expectedAttemptsByTask: JsonObject
}

const record = (value: unknown): value is JsonObject => typeof value === "object" && value !== null && !Array.isArray(value)
const json = (value: unknown): value is Json => {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true
  if (Array.isArray(value)) return value.every(json)
  return record(value) && Object.values(value).every(json)
}
const nonnegative = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0
const invalid = (message: string): Check<ProjectStateV2> => ({ ok: false, errors: [message] })
const exactKeys = (value: JsonObject, keys: readonly string[]): boolean => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
const atPath = (value: JsonObject, path: readonly string[]): unknown => path.reduce<unknown>((current, key) => record(current) ? current[key] : undefined, value)

const hasCredentialValue = (value: Json): boolean => {
  if (typeof value === "string") return redactString(value) !== value
  if (Array.isArray(value)) return value.some(hasCredentialValue)
  if (!record(value)) return false
  // The immutable shared runtime owns identifier segmentation and literal redaction.
  // This boundary rejects anything it would redact instead of persisting a surrogate.
  return Object.entries(value).some(([key, child]) => isSensitiveKey(key) || hasCredentialValue(child))
}

const hasNonzeroPaidSpend = (value: Json): boolean => {
  if (Array.isArray(value)) return value.some(hasNonzeroPaidSpend)
  if (!record(value)) return false
  return Object.entries(value).some(([key, child]) => (/^(paidSpend|paidBudget)$/i.test(key) && child !== 0) || hasNonzeroPaidSpend(child))
}

const phaseBudgetIsValid = (phaseB: PersonalLegacyMigrationContext["phaseB"]): boolean => {
  const required = ["agentRuns", "leadToWorkerTurns", "phaseAttempts", "concurrency", "paidSpend"]
  const { allocation, counters } = phaseB
  if (!phaseB.phaseId || !exactKeys(allocation, required) || !exactKeys(counters, ["agentRuns", "leadToWorkerTurns", "phaseAttempts", "activeWorkers"]) || stableJson(allocation) !== stableJson(PERSONAL_PHASE_B_ALLOCATION)) return false
  const a = allocation as Record<string, unknown>, c = counters as Record<string, unknown>
  if (!required.slice(0, 4).every(key => nonnegative(a[key])) || !nonnegative(c.agentRuns) || !nonnegative(c.leadToWorkerTurns) || !nonnegative(c.phaseAttempts) || !nonnegative(c.activeWorkers) || a.paidSpend !== 0) return false
  const allocationNumbers = a as Record<string, number>, counterNumbers = c as Record<string, number>
  return counterNumbers.agentRuns <= allocationNumbers.agentRuns && counterNumbers.leadToWorkerTurns <= allocationNumbers.leadToWorkerTurns && counterNumbers.phaseAttempts <= allocationNumbers.phaseAttempts && counterNumbers.activeWorkers <= allocationNumbers.concurrency && allocationNumbers.concurrency >= 1
}

const validCommitContext = (context: CommitContext, expected: string, legacy: JsonObject): boolean => {
  const abbreviated = atPath(legacy, context.handoffPath)
  const pinned = PERSONAL_PINNED_LEGACY_COMMIT_ABBREVIATIONS[expected as keyof typeof PERSONAL_PINNED_LEGACY_COMMIT_ABBREVIATIONS]
  return context.commit === expected && typeof abbreviated === "string" && (abbreviated === expected || abbreviated === pinned) && context.evidenceRefs.every(ref => typeof ref === "string")
}

/** Pure one-time mapping; the Lead owns any later atomic live-file transaction. */
export function translatePersonalLegacyState(input: unknown, context: PersonalLegacyMigrationContext): Check<ProjectStateV2> {
  if (!record(input) || !exactKeys(input, LEGACY_KEYS) || !json(input)) return invalid("legacy state top-level shape drift")
  if (!record(context.approvedAuthority) || !Array.isArray(context.expectedTasks) || !record(context.expectedAttemptsByTask) || !phaseBudgetIsValid(context.phaseB) || !context.currentTimestamp || !context.acceptedLine) return invalid("migration context is malformed")
  const legacy = input
  if (!record(legacy.counters) || !record(legacy.authority) || !Array.isArray(legacy.tasks) || !legacy.tasks.every(record) || !Array.isArray(legacy.inFlight) || !legacy.inFlight.every(record) || !record(legacy.providerStates) || !record(legacy.runtime) || !Array.isArray(legacy.completedPhases)) return invalid("legacy state records are malformed")
  const counters = legacy.counters
  if (!nonnegative(counters.agentRuns) || counters.agentRuns < PERSONAL_HISTORICAL_AGENT_RUNS || counters.agentRuns > PERSONAL_LIFETIME_AGENT_RUN_CEILING || counters.calls !== PERSONAL_HISTORICAL_PROVIDER_REQUESTS || counters.jevCalls !== PERSONAL_HISTORICAL_JEV_CALLS || !record(counters.attemptsByTask) || !Object.values(counters.attemptsByTask).every(nonnegative)) return invalid("legacy counters drift from accepted history")
  if (legacy.inFlight.length !== 0) return invalid("final migration requires quiescent inFlight work")
  if (stableJson(legacy.tasks) !== stableJson(context.expectedTasks) || stableJson(counters.attemptsByTask) !== stableJson(context.expectedAttemptsByTask)) return invalid("legacy task or attempt history differs from the supplied snapshot")
  if (stableJson(context.approvedAuthority) !== stableJson(PERSONAL_HUMAN_ONLY_AUTHORITY) || stableJson(legacy.authority) !== stableJson(PERSONAL_HUMAN_ONLY_AUTHORITY)) return invalid("legacy authority differs from the exact human-only baseline")
  if (hasNonzeroPaidSpend(legacy) || hasNonzeroPaidSpend(context.phaseB) || hasCredentialValue(legacy) || hasCredentialValue(context.phaseB)) return invalid("paid spend or credential-shaped persistence is prohibited")
  if (!validCommitContext(context.acceptedMainCommit, PERSONAL_LEGACY_ACCEPTED_COMMIT, legacy) || !validCommitContext(context.currentMainHead, PERSONAL_CONTROL_CHECKPOINT, legacy)) return invalid("legacy abbreviated commit records do not match supplied full commits")

  const acceptedEvidence = [...context.acceptedMainCommit.evidenceRefs]
  const state: ProjectStateV2 = {
    schemaVersion: "loop-project-state/2", projectId: legacy.projectId as string, phase: legacy.phase as string, activeUnit: null,
    acceptedLine: context.acceptedLine, lastUpdated: context.currentTimestamp,
    lifetime: { agentRunCeiling: PERSONAL_LIFETIME_AGENT_RUN_CEILING, agentRunsUsed: counters.agentRuns as number, paidSpendCeiling: 0, paidSpendUsed: 0 },
    requestCounters: { lifetimeModelProviderRequests: PERSONAL_HISTORICAL_PROVIDER_REQUESTS, jevRequests: PERSONAL_HISTORICAL_JEV_CALLS },
    accepted: { line: context.acceptedLine, commit: PERSONAL_LEGACY_ACCEPTED_COMMIT, evidenceRefs: acceptedEvidence },
    providerObservations: legacy.providerStates,
    bootstrap: { migration: { source: "personal-ui-system-legacy-state", translatedAt: context.currentTimestamp } },
    historyReferences: { attemptsByTask: counters.attemptsByTask, authority: legacy.authority, runtime: legacy.runtime, lastPause: legacy.lastPause, handoff: legacy.handoff, retrospectiveFindings: legacy.retrospectiveFindings, ownerPauseAcceptance: legacy.pause, completedPhases: legacy.completedPhases },
    phasePlan: { phaseB: context.phaseB },
    phaseHistory: [...(legacy.completedPhases as JsonObject[]), { kind: "accepted-product", commit: PERSONAL_LEGACY_ACCEPTED_COMMIT, evidenceRefs: acceptedEvidence }, { kind: "control-checkpoint", commit: PERSONAL_CONTROL_CHECKPOINT, evidenceRefs: [...context.currentMainHead.evidenceRefs] }],
    tasks: legacy.tasks as JsonObject[],
    results: (legacy.tasks as JsonObject[]).flatMap(task => task.result === undefined ? [] : [{ taskId: task.taskId ?? null, result: task.result }]),
    pause: legacy.pause, inFlight: legacy.inFlight as JsonObject[],
  }
  return validateProjectStateV2(state)
}

/** Stable V2 serialization is delegated to the shared runtime. */
export function serializePersonalLegacyTranslation(input: unknown, context: PersonalLegacyMigrationContext): Check<string> {
  const translated = translatePersonalLegacyState(input, context)
  return translated.ok ? { ok: true, value: stableJson(translated.value) } : translated
}
