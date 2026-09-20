import { homedir } from "node:os"
import { join } from "node:path"
import { acceptBatch } from "./accept.ts"
import type { Acceptance } from "./accept.ts"
import { buildComposerRegistry } from "./compose.ts"
import { auditQuestions, normalizeClass, toWireQuestions, validatePacket } from "./packet.ts"
import type { PacketPolicyView } from "./packet.ts"
import { redactString, sanitize } from "./sanitize.ts"
import { appendEvent, LockError, nodeFs, projectPaths, readJson, realClock, withLock, writeJsonAtomic } from "./store.ts"
import type { ProjectPaths } from "./store.ts"
import {
  DECISION_SCHEMA_VERSION,
  DEFAULT_TIMEOUT_MS,
  EVENT_SCHEMA_VERSION,
  JEV_ENDPOINT,
  JEV_MODEL,
  TimeoutError,
} from "./types.ts"
import type {
  AcceptedAnswer,
  AdmissionPacket,
  Clock,
  Composer,
  FetchLike,
  Json,
  JevFs,
  Outcome,
  Reason,
  ReasonCode,
} from "./types.ts"

export const MAX_RESPONSE_CHARS = 256 * 1024
const MAX_RAW_LOG_BYTES = 16 * 1024

export const defaultPolicyPath = (): string => join(homedir(), ".loop-engineering", "policy.json")

export type AdapterOptions = {
  projectDir: string
  /** Defaults to ~/.loop-engineering/policy.json. */
  policyPath?: string
  /** TYPESAFE_API_KEY value. Absent/empty fails closed before any charge or transport. */
  apiKey: string | undefined
  fetch: FetchLike
  clock?: Clock
  fs?: JevFs
  timeoutMs?: number
  /** Extra versioned composers supplied by gate code; built-ins cannot be replaced. */
  composers?: readonly Composer[]
  lockRetries?: number
  lockRetryMs?: number
}

type Policy = { maxCalls: number; view: PacketPolicyView }

type Answers = Record<string, unknown>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const message = (error: unknown, secrets: readonly string[]): string =>
  redactString(error instanceof Error ? error.message : String(error), secrets)

const PAUSE_CAPABILITY = { state: "PAUSED(capability)", unblock: ["wait for Jev", "ask human"] } as const

/** Complete, bounded, sanitized description of an admitted request (packet state/questions are validated and sanitized). */
const auditRequest = (packet: AdmissionPacket): Json => ({
  projectId: packet.projectId,
  contract: packet.contract,
  outputContract: { contract: packet.contract, composition: packet.composition },
  admission: packet.admission,
  questions: auditQuestions(packet.questions),
  state: packet.state,
  declaredFallback: packet.fallback ?? null,
}) as unknown as Json

const emptyOutcome = (): Outcome => ({
  accepted: false,
  status: "rejected",
  runId: null,
  decisionId: null,
  contract: null,
  reason: null,
  output: null,
  composition: null,
  answers: null,
  fallback: null,
  pause: null,
  decisionPath: null,
  attempt: null,
  auditErrors: [],
})

/** Loads and validates the global policy; every ambiguity denies. */
async function loadPolicy(fs: JevFs, path: string): Promise<Policy | Reason> {
  const deny = (why: string): Reason => ({ code: "denied.policy-unavailable", message: `global policy ${why}` })
  let raw: unknown
  try {
    raw = await readJson(fs, path)
  } catch (error) {
    return deny(`cannot be read: ${(error as Error).message}`)
  }
  if (!isRecord(raw) || !isRecord(raw.ownerCeilings)) return deny("has no ownerCeilings")
  const { paidBudget, maxCallsPerProject } = raw.ownerCeilings
  if (paidBudget !== 0) return { code: "denied.paid-budget", message: "global policy paidBudget must be exactly 0" }
  if (!Number.isSafeInteger(maxCallsPerProject) || (maxCallsPerProject as number) < 0) return deny("has no valid maxCallsPerProject")
  const classes = isRecord(raw.routingPolicy) ? raw.routingPolicy.billingClasses : undefined
  if (!isRecord(classes)) return deny("has no routingPolicy.billingClasses")
  const allowed = new Set(Object.entries(classes).filter(([, on]) => on === true).map(([name]) => normalizeClass(name)))
  return { maxCalls: maxCallsPerProject as number, view: { allowsBillingClass: (name) => allowed.has(normalizeClass(name)) } }
}

const isReason = (value: Policy | Reason): value is Reason => "code" in value

/**
 * Runs one admitted decision packet against the fixed Jev endpoint.
 * Never throws for expected failures; anything not fully accepted is
 * `accepted: false`. There is no retry: one packet is at most one live call.
 */
export async function runDecision(rawPacket: unknown, options: AdapterOptions): Promise<Outcome> {
  const fs = options.fs ?? nodeFs
  const clock = options.clock ?? realClock
  const paths = projectPaths(options.projectDir)
  const secrets = options.apiKey ? [options.apiKey] : []
  const lockOptions = { retries: options.lockRetries, retryMs: options.lockRetryMs }
  const outcome = emptyOutcome()

  let admitted: AdmissionPacket | null = null

  /** Appends one event. Lock denials cannot take the lock, so they append unlocked (single small write) and say so. */
  const audit = async (event: Record<string, unknown>, locked = true): Promise<void> => {
    const line = { schemaVersion: EVENT_SCHEMA_VERSION, at: clock.now().toISOString(), ...event }
    try {
      if (locked) await withLock(fs, clock, paths.lockPath, lockOptions, () => appendEvent(fs, paths.eventsPath, line))
      else await appendEvent(fs, paths.eventsPath, { ...line, lockBypassed: true })
    } catch (error) {
      outcome.auditErrors.push(`events.jsonl: ${message(error, secrets)}`)
    }
  }

  /**
   * Refuses without (further) transport. A valid admitted packet is always logged in full (bounded and
   * sanitized by validation) so the denied request is auditable even though no decision record is created.
   */
  const stop = async (status: Outcome["status"], code: ReasonCode, text: string): Promise<Outcome> => {
    outcome.status = status
    outcome.reason = { code, message: text }
    // Jev being unavailable (no key) is a capability failure: only a fallback declared before the call may apply.
    if (code === "denied.missing-api-key" && admitted) {
      outcome.fallback = admitted.fallback ? { ...admitted.fallback } : null
      outcome.pause = outcome.fallback ? null : PAUSE_CAPABILITY
    }
    await audit(
      {
        type: status === "rejected" ? "jev.packet.rejected" : "jev.call.denied",
        runId: outcome.runId,
        decisionId: outcome.decisionId,
        contract: outcome.contract,
        accepted: false,
        charged: status === "failed" ? "unknown" : false,
        reason: outcome.reason,
        fallback: outcome.fallback ? { ...outcome.fallback, applied: true } : null,
        pause: outcome.pause,
        ...(admitted ? { request: auditRequest(admitted) } : {}),
      },
      code !== "denied.lock",
    )
    return outcome
  }

  const registry = buildComposerRegistry(options.composers)
  const policy = await loadPolicy(fs, options.policyPath ?? defaultPolicyPath())
  if (isReason(policy)) {
    // Denied regardless; validate structurally (billing classes unchecked, nothing is transmitted) only so the audit is complete.
    const structural = validatePacket(rawPacket, { allowsBillingClass: () => true }, registry, secrets)
    if (structural.ok) {
      admitted = structural.packet
      outcome.runId = admitted.runId
      outcome.decisionId = admitted.decisionId
      outcome.contract = admitted.contract
      outcome.composition = admitted.composition
    }
    return stop("denied", policy.code, policy.message)
  }

  const checked = validatePacket(rawPacket, policy.view, registry, secrets)
  outcome.runId = checked.ok ? checked.packet.runId : checked.runId
  outcome.decisionId = checked.ok ? checked.packet.decisionId : checked.decisionId
  if (!checked.ok) return stop("rejected", checked.reason.code, checked.reason.message)
  const { packet, composer } = checked
  admitted = packet
  outcome.contract = packet.contract
  outcome.composition = packet.composition

  if (!options.apiKey) return stop("denied", "denied.missing-api-key", "TYPESAFE_API_KEY is not set")

  // Critical section 1: validate authority against live state, charge the call, and open the decision record.
  const decisionPath = paths.decisionPath(packet.runId, packet.decisionId)
  const requestedAt = clock.now()
  let attempt: number
  try {
    const opened = await withLock(fs, clock, paths.lockPath, lockOptions, () => openAttempt(fs, clock, paths, policy, packet, decisionPath, requestedAt))
    if ("reject" in opened) return stop(opened.status, opened.reject.code, opened.reject.message)
    attempt = opened.attempt
  } catch (error) {
    if (error instanceof LockError) return stop("denied", "denied.lock", error.message)
    return stop("failed", "failed.charge-write", `could not persist the call charge or decision record: ${message(error, secrets)}`)
  }
  outcome.attempt = attempt
  outcome.decisionPath = decisionPath

  // Live call: exactly one, no retry.
  let httpStatus: number | null = null
  let rawAnswers: unknown = null
  let rawText: string | null = null
  let reason: Reason | null = null
  let accepted: Record<string, AcceptedAnswer> | null = null
  let verdicts: Record<string, Acceptance> | null = null
  let composed: Json | null = null

  const started = clock.now()
  const timer = clock.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const controller = new AbortController()
  try {
    const response = await Promise.race([
      options.fetch(JEV_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: JEV_MODEL, state: packet.state, questions: toWireQuestions(packet.questions) }),
        signal: controller.signal,
      }),
      timer.promise,
    ])
    httpStatus = response.status
    rawText = await Promise.race([response.text(), timer.promise])
  } catch (error) {
    controller.abort()
    reason =
      error instanceof TimeoutError
        ? { code: "failed.timeout", message: error.message }
        : { code: "failed.network", message: `transport error: ${message(error, secrets)}` }
  } finally {
    timer.cancel()
  }

  if (reason === null && httpStatus !== null && (httpStatus < 200 || httpStatus >= 300)) {
    reason = { code: "failed.http", message: `HTTP ${httpStatus}` }
  }
  if (reason === null && rawText !== null) {
    if (rawText.length > MAX_RESPONSE_CHARS) {
      reason = { code: "failed.malformed-response", message: "response exceeds the size bound" }
    } else {
      let parsed: unknown
      try {
        parsed = JSON.parse(rawText)
      } catch {
        parsed = undefined
        reason = { code: "failed.malformed-response", message: "response is not valid JSON" }
      }
      if (reason === null) {
        rawAnswers = isRecord(parsed) ? parsed.answers : undefined
        if (!isRecord(rawAnswers)) reason = { code: "failed.malformed-response", message: "response has no answers object" }
      }
    }
  }
  if (reason === null && isRecord(rawAnswers)) {
    const expected = new Set(packet.questions.map((question) => question.id))
    const returned = Object.keys(rawAnswers)
    const unexpected = returned.filter((id) => !expected.has(id))
    const missing = [...expected].filter((id) => !returned.includes(id))
    if (unexpected.length > 0 || missing.length > 0) {
      reason = {
        code: "failed.answer-set",
        message: `unexpected questions [${unexpected.join(", ")}], missing questions [${missing.join(", ")}]`,
      }
    } else {
      const batch = acceptBatch(packet.questions, rawAnswers)
      verdicts = batch.results
      reason = batch.firstFailure
      if (batch.usable) {
        const typed: Record<string, AcceptedAnswer> = {}
        for (const [id, verdict] of Object.entries(batch.results)) if (verdict.ok) typed[id] = verdict.answer
        accepted = typed
        try {
          composed = composer.compose(typed, packet.questions)
        } catch (error) {
          reason = { code: "failed.composition", message: `composition failed: ${message(error, secrets)}` }
          composed = null
        }
      }
    }
  }
  if (reason === null && composed === null) reason = { code: "failed.malformed-response", message: "no usable answers" }

  const completedAt = clock.now()
  const usable = reason === null
  const answers = usable ? accepted : null
  const fallback = !usable && packet.fallback ? { ...packet.fallback } : null
  const pause = !usable && fallback === null ? PAUSE_CAPABILITY : null

  const record = {
    schemaVersion: DECISION_SCHEMA_VERSION,
    projectId: packet.projectId,
    runId: packet.runId,
    decisionId: packet.decisionId,
    contract: packet.contract,
    outputContract: { contract: packet.contract, composition: packet.composition },
    status: usable ? "completed" : "failed",
    accepted: usable,
    attempt: {
      number: attempt,
      requestedAt: requestedAt.toISOString(),
      startedAt: started.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - started.getTime(),
      httpStatus,
      endpoint: JEV_ENDPOINT,
      model: JEV_MODEL,
    },
    admission: packet.admission,
    questions: auditQuestions(packet.questions),
    state: packet.state,
    answers: verdicts
      ? Object.fromEntries(
          packet.questions.map((question) => {
            const verdict = verdicts?.[question.id] as Acceptance
            const raw = rawAnswerForLog((rawAnswers as Answers)[question.id], secrets)
            return [
              question.id,
              verdict.ok
                ? { primitive: question.type, accepted: true, typed: verdict.answer, raw }
                : { primitive: question.type, accepted: false, failure: verdict.reason, raw },
            ]
          }),
        )
      : null,
    responseSnippet: verdicts === null && rawText !== null ? redactString(rawText.slice(0, 500), secrets) : null,
    composition: usable ? { ...packet.composition, output: composed } : null,
    reason,
    fallback: fallback ? { ...fallback, applied: true } : null,
    pause,
  }

  outcome.accepted = usable
  outcome.status = usable ? "accepted" : "failed"
  outcome.reason = reason
  outcome.output = usable ? composed : null
  outcome.answers = answers
  outcome.fallback = fallback
  outcome.pause = pause

  // Critical section 2: finalize the decision record and result event. Failure here fails the decision closed.
  try {
    await withLock(fs, clock, paths.lockPath, lockOptions, async () => {
      await writeJsonAtomic(fs, decisionPath, record, clock)
      await appendEvent(fs, paths.eventsPath, {
        schemaVersion: EVENT_SCHEMA_VERSION,
        at: clock.now().toISOString(),
        type: "jev.decision.resolved",
        projectId: packet.projectId,
        runId: packet.runId,
        decisionId: packet.decisionId,
        contract: packet.contract,
        attempt,
        accepted: usable,
        reason,
        fallback: record.fallback,
        pause,
        composition: usable ? composed : null,
        decisionPath: relativeDecision(packet),
      })
    })
  } catch (error) {
    const original = reason ? ` (underlying: ${reason.code})` : ""
    outcome.accepted = false
    outcome.status = "failed"
    outcome.reason = { code: "failed.log-write", message: `could not record the decision result${original}: ${message(error, secrets)}` }
    outcome.output = null
    outcome.answers = null
    outcome.fallback = packet.fallback ? { ...packet.fallback } : null
    outcome.pause = outcome.fallback ? null : PAUSE_CAPABILITY
  }
  return outcome
}

const relativeDecision = (packet: AdmissionPacket): string => `runs/${packet.runId}/decisions/${packet.decisionId}.json`

/** Sanitized, bounded copy of a raw per-question answer for the audit record. */
function rawAnswerForLog(raw: unknown, secrets: readonly string[]): Json {
  const result = sanitize(raw ?? null, { secrets, maxBytes: MAX_RAW_LOG_BYTES })
  return result.ok ? result.value : `[unloggable: ${result.message}]`
}

type Opened = { attempt: number } | { reject: Reason; status: "rejected" | "denied" }

/** Runs under the project lock. Charges the call and writes the "requested" record before any transport. */
async function openAttempt(
  fs: JevFs,
  clock: Clock,
  paths: ProjectPaths,
  policy: Policy,
  packet: AdmissionPacket,
  decisionPath: string,
  requestedAt: Date,
): Promise<Opened> {
  const deny = (code: ReasonCode, text: string, status: "rejected" | "denied" = "denied"): Opened => ({ reject: { code, message: text }, status })

  let state: unknown
  try {
    state = await readJson(fs, paths.statePath)
  } catch (error) {
    return deny("denied.state-unavailable", `.loop/state.json cannot be read: ${(error as Error).message}`)
  }
  if (!isRecord(state)) return deny("denied.state-unavailable", ".loop/state.json is not an object")
  if (state.projectId !== packet.projectId) {
    return deny("packet.unauthorized", "packet projectId does not match .loop/state.json", "rejected")
  }
  const counters = state.counters
  if (!isRecord(counters) || !Number.isSafeInteger(counters.calls) || (counters.calls as number) < 0) {
    return deny("denied.state-unavailable", "state.counters.calls is missing or invalid")
  }
  const budgets = state.budgets
  if (budgets !== undefined && !isRecord(budgets)) return deny("denied.state-unavailable", "state.budgets is not an object")
  if (budgets?.paidBudget !== undefined && budgets.paidBudget !== 0) return deny("denied.paid-budget", "project paidBudget must be exactly 0")
  const projectMax = budgets?.maxCalls
  if (projectMax !== undefined && (!Number.isSafeInteger(projectMax) || (projectMax as number) < 0)) {
    return deny("denied.state-unavailable", "state.budgets.maxCalls is invalid")
  }
  const max = Math.min(policy.maxCalls, (projectMax as number | undefined) ?? Number.POSITIVE_INFINITY)
  const calls = counters.calls as number
  if (calls + 1 > max) return deny("denied.call-budget", `call budget exhausted (${calls} used of ${max})`)

  if (await fs.exists(decisionPath)) return deny("packet.duplicate-decision", `decision ${packet.decisionId} already exists for run ${packet.runId}`, "rejected")

  const attempt = calls + 1
  const jevCalls = Number.isSafeInteger(counters.jevCalls) ? (counters.jevCalls as number) : 0
  await writeJsonAtomic(fs, paths.statePath, { ...state, counters: { ...counters, calls: attempt, jevCalls: jevCalls + 1 } }, clock)

  await writeJsonAtomic(
    fs,
    decisionPath,
    {
      schemaVersion: DECISION_SCHEMA_VERSION,
      projectId: packet.projectId,
      runId: packet.runId,
      decisionId: packet.decisionId,
      contract: packet.contract,
      outputContract: { contract: packet.contract, composition: packet.composition },
      status: "requested",
      accepted: false,
      attempt: { number: attempt, requestedAt: requestedAt.toISOString(), endpoint: JEV_ENDPOINT, model: JEV_MODEL },
      admission: packet.admission,
      questions: auditQuestions(packet.questions),
      state: packet.state,
      answers: null,
      composition: null,
      reason: null,
      note: "requested: no result recorded yet. If this persists the attempt is unresolved and its call charge stands.",
      fallback: null,
      pause: null,
    },
    clock,
  )
  await appendEvent(fs, paths.eventsPath, {
    schemaVersion: EVENT_SCHEMA_VERSION,
    at: requestedAt.toISOString(),
    type: "jev.decision.requested",
    projectId: packet.projectId,
    runId: packet.runId,
    decisionId: packet.decisionId,
    contract: packet.contract,
    attempt,
    questions: packet.questions.map((question) => ({ id: question.id, primitive: question.type })),
    composition: packet.composition,
    decisionPath: relativeDecision(packet),
  })
  return { attempt }
}
