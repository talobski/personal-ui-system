export const PACKET_SCHEMA_VERSION = "loop-jev-admission/1"
export const DECISION_SCHEMA_VERSION = "loop-jev-decision/1"
export const EVENT_SCHEMA_VERSION = "loop-jev-event/1"

/** Fixed transport target. Nothing in a packet or option can change it. */
export const JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone"
export const JEV_MODEL = "jev-latest"
export const DEFAULT_TIMEOUT_MS = 60_000

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
export type JsonObject = { [key: string]: Json }

export type Primitive = "choice" | "score" | "noul"

export type ChoiceOption = { id: string; description: string; billingClass?: string }

export type ChoiceQuestion = { id: string; type: "choice"; instructions: string; options: ChoiceOption[] }
export type ScoreQuestion = { id: string; type: "score"; instructions: string; scale: string[] }
export type NoulQuestion = {
  id: string
  type: "noul"
  instructions: string
  criteria: { true: string; false: string }
}
export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion

export type Authority = {
  billingClass: string
  paidCapacity: false
  permissionEscalation: false
  verificationWaived: false
  completionWaived: false
  completionPreconditionsPassed: boolean
}

export type AdmissionPacket = {
  schemaVersion: typeof PACKET_SCHEMA_VERSION
  projectId: string
  runId: string
  decisionId: string
  contract: string
  composition: { id: string; version: string }
  admission: { gate: string; questionsDigest: string; authority: Authority }
  state: JsonObject
  questions: Question[]
  /** Deterministic fallback declared before the call; must name an admitted Choice option. */
  fallback?: { id: string; output: string }
}

export type ReasonCode =
  | "packet.malformed"
  | "packet.unsupported-version"
  | "packet.unknown-field"
  | "packet.invalid-id"
  | "packet.empty"
  | "packet.single-option"
  | "packet.duplicate-question"
  | "packet.duplicate-option"
  | "packet.duplicate-decision"
  | "packet.inconsistent"
  | "packet.unauthorized"
  | "packet.paid-capacity"
  | "packet.permission-escalation"
  | "packet.verification-waived"
  | "packet.completion-waived"
  | "packet.secret"
  | "packet.state-invalid"
  | "denied.missing-api-key"
  | "denied.policy-unavailable"
  | "denied.state-unavailable"
  | "denied.paid-budget"
  | "denied.call-budget"
  | "denied.lock"
  | "failed.charge-write"
  | "failed.log-write"
  | "failed.timeout"
  | "failed.network"
  | "failed.http"
  | "failed.malformed-response"
  | "failed.answer-set"
  | "failed.primitive-mismatch"
  | "failed.malformed-answer"
  | "failed.confidence"
  | "failed.choice-not-offered"
  | "failed.choice-not-max"
  | "failed.score-range"
  | "failed.legend-mismatch"
  | "failed.probabilities"
  | "failed.noul-unresolved"
  | "failed.composition"

export type Reason = { code: ReasonCode; message: string }

export type AcceptedAnswer =
  | { type: "choice"; choice: string; confidence: number; probabilities: Record<string, number> }
  | {
      type: "score"
      score: number
      confidence: number
      legend: Record<string, string>
      probabilities: Record<string, number>
    }
  | { type: "noul"; noul: number; interpretation: "yes" | "no" }

export type Composer = {
  id: string
  version: string
  /** Returns a problem description when the question set cannot be composed by this composer. */
  validate(questions: readonly Question[]): string | null
  /** Pure and deterministic. Receives only fully accepted answers, in question order. */
  compose(answers: Readonly<Record<string, AcceptedAnswer>>, questions: readonly Question[]): Json
}

export type JevFs = {
  readFile(path: string): Promise<string>
  writeFile(path: string, data: string): Promise<void>
  rename(from: string, to: string): Promise<void>
  appendFile(path: string, data: string): Promise<void>
  mkdir(path: string): Promise<void>
  /** Creates the file or rejects with an error whose `code` is "EEXIST". */
  createExclusive(path: string, data: string): Promise<void>
  unlink(path: string): Promise<void>
  exists(path: string): Promise<boolean>
}

export type Timer = { promise: Promise<never>; cancel(): void }

export type Clock = {
  now(): Date
  sleep(ms: number): Promise<void>
  /** Returns a timer whose promise rejects with a TimeoutError after `ms`. */
  timeout(ms: number): Timer
}

export type FetchLike = (
  url: string,
  init: { method: "POST"; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Jev request exceeded ${ms}ms`)
    this.name = "TimeoutError"
  }
}

export type Outcome = {
  accepted: boolean
  status: "accepted" | "rejected" | "denied" | "failed"
  runId: string | null
  decisionId: string | null
  contract: string | null
  reason: Reason | null
  /** Composer output; present only when accepted. */
  output: Json | null
  composition: { id: string; version: string } | null
  answers: Record<string, AcceptedAnswer> | null
  /** Declared deterministic fallback, applied only on a post-charge failure. */
  fallback: { id: string; output: string } | null
  /** Set when a live attempt failed without a declared fallback. */
  pause: { state: "PAUSED(capability)"; unblock: readonly ["wait for Jev", "ask human"] } | null
  decisionPath: string | null
  attempt: number | null
  auditErrors: string[]
}
