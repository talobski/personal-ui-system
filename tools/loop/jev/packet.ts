import { createHash } from "node:crypto"
import { redactString, sanitize } from "./sanitize.ts"
import { PACKET_SCHEMA_VERSION } from "./types.ts"
import type { AdmissionPacket, Composer, JsonObject, Primitive, Question, Reason, ReasonCode } from "./types.ts"

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const QUESTION_ID = /^[A-Za-z][A-Za-z0-9_]{0,63}$/
const OPTION_ID = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,63}$/

export const MAX_QUESTIONS = 8
export const MAX_OPTIONS = 32
export const MAX_SCALE_LEVELS = 11
export const MAX_TEXT = 4000

type ContractSpec = { primitives: readonly Primitive[]; choices?: readonly string[] }

/** Static shape of each versioned Loop contract. Dynamic route IDs are left open (`choices` omitted). */
export const CONTRACTS: Readonly<Record<string, ContractSpec>> = {
  NEXT_ACTION: {
    primitives: ["choice"],
    choices: ["RESEARCH", "PRODUCE", "VERIFY", "RETRY", "RED_TEAM", "SYNTHESIZE", "WAIT", "PAUSE_ASK", "COMPLETE"],
  },
  ROUTE_PROFILE: { primitives: ["choice", "score"] },
  MODEL_CLASS: { primitives: ["score"] },
  PROVIDER_FALLBACK: { primitives: ["choice"] },
  RETRY_STRATEGY: {
    primitives: ["choice", "score"],
    choices: [
      "CHANGE_MODEL",
      "CHANGE_PROVIDER",
      "CHANGE_ROLE",
      "CHANGE_TOOL_CAPABILITY",
      "CHANGE_INPUT_CONTEXT",
      "STOP_RETRYING",
    ],
  },
  HUMAN_INTERRUPT: { primitives: ["noul"] },
  CONVERGENCE: { primitives: ["choice", "score", "noul"], choices: ["CONTINUE", "SYNTHESIZE", "COMPLETE"] },
  VERIFICATION_DIAGNOSIS: {
    primitives: ["choice"],
    choices: [
      "PRODUCT_DEFECT",
      "TEST_DEFECT",
      "MISSING_CAPABILITY",
      "INSUFFICIENT_EVIDENCE",
      "ENVIRONMENT_PROBLEM",
      "AMBIGUOUS_REQUIREMENT",
    ],
  },
  WORKER_FAN_OUT: { primitives: ["noul", "score"] },
}

export type PacketPolicyView = {
  /** True when the global policy currently allows this billing class. */
  allowsBillingClass(name: string): boolean
}

export type PacketCheck =
  | { ok: true; packet: AdmissionPacket; composer: Composer }
  | { ok: false; reason: Reason; runId: string | null; decisionId: string | null }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

/** Digest the gate computes over exactly what Jev will be shown. */
export const digestQuestions = (contract: string, questions: readonly Question[]): string =>
  createHash("sha256").update(canonical({ contract, questions })).digest("hex")

/** The wire `questions` object for the fixed endpoint. */
export function toWireQuestions(questions: readonly Question[]): Record<string, unknown> {
  const wire: Record<string, unknown> = {}
  for (const question of questions) {
    if (question.type === "choice") {
      wire[question.id] = {
        type: "choice",
        instructions: question.instructions,
        criteria: Object.fromEntries(question.options.map((option) => [option.id, option.description])),
      }
    } else if (question.type === "score") {
      wire[question.id] = { type: "score", instructions: question.instructions, criteria: [...question.scale] }
    } else {
      wire[question.id] = { type: "noul", instructions: question.instructions, criteria: { ...question.criteria } }
    }
  }
  return wire
}

const TOP_KEYS = new Set([
  "schemaVersion",
  "projectId",
  "runId",
  "decisionId",
  "contract",
  "composition",
  "admission",
  "state",
  "questions",
  "fallback",
])
const AUTHORITY_KEYS = new Set([
  "billingClass",
  "paidCapacity",
  "permissionEscalation",
  "verificationWaived",
  "completionWaived",
  "completionPreconditionsPassed",
])

/**
 * Pure, pre-transport validation of a gate-admission packet. Nothing here
 * touches the network or the filesystem; budget/duplicate checks live elsewhere.
 */
export function validatePacket(input: unknown, policy: PacketPolicyView, composers: ReadonlyMap<string, Composer>, secrets: readonly string[] = []): PacketCheck {
  let runId: string | null = null
  let decisionId: string | null = null
  const reject = (code: ReasonCode, message: string): PacketCheck => ({ ok: false, reason: { code, message }, runId, decisionId })

  if (!isRecord(input)) return reject("packet.malformed", "packet must be a JSON object")
  if (typeof input.runId === "string" && ID.test(input.runId)) runId = input.runId
  if (typeof input.decisionId === "string" && ID.test(input.decisionId)) decisionId = input.decisionId

  if (input.schemaVersion !== PACKET_SCHEMA_VERSION) {
    return reject("packet.unsupported-version", `schemaVersion must be "${PACKET_SCHEMA_VERSION}"`)
  }
  for (const key of Object.keys(input)) if (!TOP_KEYS.has(key)) return reject("packet.unknown-field", `unknown packet field "${key}"`)
  for (const field of ["projectId", "runId", "decisionId"] as const) {
    if (typeof input[field] !== "string" || !ID.test(input[field])) return reject("packet.invalid-id", `${field} is missing or not a safe identifier`)
  }

  // Authority: every escalation flag must be explicitly false; nothing is inferred.
  const admission = input.admission
  if (!isRecord(admission)) return reject("packet.malformed", "admission is required")
  if (typeof admission.gate !== "string" || admission.gate.length === 0) return reject("packet.malformed", "admission.gate is required")
  if (typeof admission.questionsDigest !== "string") return reject("packet.malformed", "admission.questionsDigest is required")
  for (const key of Object.keys(admission)) {
    if (!["gate", "questionsDigest", "authority"].includes(key)) return reject("packet.unknown-field", `unknown admission field "${key}"`)
  }
  const authority = admission.authority
  if (!isRecord(authority)) return reject("packet.malformed", "admission.authority is required")
  for (const key of Object.keys(authority)) if (!AUTHORITY_KEYS.has(key)) return reject("packet.unknown-field", `unknown authority field "${key}"`)
  if (authority.paidCapacity !== false) return reject("packet.paid-capacity", "authority.paidCapacity must be false")
  if (typeof authority.billingClass !== "string" || !policy.allowsBillingClass(authority.billingClass)) {
    return reject("packet.paid-capacity", "authority.billingClass is not an allowed included billing class")
  }
  if (authority.permissionEscalation !== false) return reject("packet.permission-escalation", "authority.permissionEscalation must be false")
  if (authority.verificationWaived !== false) return reject("packet.verification-waived", "authority.verificationWaived must be false")
  if (authority.completionWaived !== false) return reject("packet.completion-waived", "authority.completionWaived must be false")
  if (typeof authority.completionPreconditionsPassed !== "boolean") {
    return reject("packet.malformed", "authority.completionPreconditionsPassed must be a boolean")
  }

  const contractName = input.contract
  if (typeof contractName !== "string" || !Object.hasOwn(CONTRACTS, contractName)) {
    return reject("packet.unauthorized", `unknown contract ${JSON.stringify(contractName)}`)
  }
  const spec = CONTRACTS[contractName] as ContractSpec

  const rawQuestions = input.questions
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) return reject("packet.empty", "packet has no questions")
  if (rawQuestions.length > MAX_QUESTIONS) return reject("packet.inconsistent", `more than ${MAX_QUESTIONS} questions`)

  const questions: Question[] = []
  const seenQuestions = new Set<string>()
  const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= MAX_TEXT
  const admittedChoices = new Set<string>()

  for (const raw of rawQuestions) {
    if (!isRecord(raw)) return reject("packet.malformed", "question must be an object")
    if (typeof raw.id !== "string" || !QUESTION_ID.test(raw.id)) return reject("packet.invalid-id", "question id must match [A-Za-z][A-Za-z0-9_]*")
    if (seenQuestions.has(raw.id)) return reject("packet.duplicate-question", `duplicate question id "${raw.id}"`)
    seenQuestions.add(raw.id)
    if (!text(raw.instructions)) return reject("packet.malformed", `question "${raw.id}" needs non-empty instructions`)
    const type = raw.type
    if (type !== "choice" && type !== "score" && type !== "noul") return reject("packet.malformed", `question "${raw.id}" has an unknown primitive`)
    if (!spec.primitives.includes(type)) return reject("packet.unauthorized", `${type} questions are not part of contract ${contractName}`)

    if (type === "choice") {
      for (const key of Object.keys(raw)) if (!["id", "type", "instructions", "options"].includes(key)) return reject("packet.unknown-field", `unknown field "${key}" on question "${raw.id}"`)
      const options = raw.options
      if (!Array.isArray(options) || options.length === 0) return reject("packet.empty", `choice "${raw.id}" has no admitted options`)
      if (options.length === 1) return reject("packet.single-option", `choice "${raw.id}" has a single admitted option; proceed deterministically instead of asking Jev`)
      if (options.length > MAX_OPTIONS) return reject("packet.inconsistent", `choice "${raw.id}" has more than ${MAX_OPTIONS} options`)
      const seen = new Set<string>()
      const parsed = []
      for (const option of options) {
        if (!isRecord(option)) return reject("packet.malformed", `choice "${raw.id}" option must be an object`)
        for (const key of Object.keys(option)) if (!["id", "description", "billingClass"].includes(key)) return reject("packet.unknown-field", `unknown option field "${key}"`)
        if (typeof option.id !== "string" || !OPTION_ID.test(option.id)) return reject("packet.invalid-id", `choice "${raw.id}" has an invalid option id`)
        if (seen.has(option.id)) return reject("packet.duplicate-option", `duplicate option "${option.id}" in "${raw.id}"`)
        seen.add(option.id)
        if (!text(option.description)) return reject("packet.malformed", `option "${option.id}" needs a description`)
        if (option.billingClass !== undefined && (typeof option.billingClass !== "string" || !policy.allowsBillingClass(option.billingClass))) {
          return reject("packet.paid-capacity", `option "${option.id}" uses a billing class the policy does not allow`)
        }
        if (spec.choices !== undefined && !spec.choices.includes(option.id)) {
          return reject("packet.unauthorized", `option "${option.id}" is not a ${contractName} result`)
        }
        if (option.id === "COMPLETE" && authority.completionPreconditionsPassed !== true) {
          return reject("packet.completion-waived", "COMPLETE is offered while completion preconditions have not passed")
        }
        admittedChoices.add(option.id)
        parsed.push({ id: option.id, description: option.description, ...(option.billingClass !== undefined ? { billingClass: option.billingClass } : {}) })
      }
      questions.push({ id: raw.id, type, instructions: raw.instructions, options: parsed })
    } else if (type === "score") {
      for (const key of Object.keys(raw)) if (!["id", "type", "instructions", "scale"].includes(key)) return reject("packet.unknown-field", `unknown field "${key}" on question "${raw.id}"`)
      const scale = raw.scale
      if (!Array.isArray(scale) || scale.length === 0) return reject("packet.empty", `score "${raw.id}" has no scale`)
      if (scale.length < 2 || scale.length > MAX_SCALE_LEVELS) return reject("packet.inconsistent", `score "${raw.id}" needs 2-${MAX_SCALE_LEVELS} levels`)
      if (!scale.every(text)) return reject("packet.malformed", `score "${raw.id}" levels must be non-empty strings`)
      if (new Set(scale).size !== scale.length) return reject("packet.duplicate-option", `score "${raw.id}" has duplicate scale levels`)
      questions.push({ id: raw.id, type, instructions: raw.instructions, scale: [...scale] })
    } else {
      for (const key of Object.keys(raw)) if (!["id", "type", "instructions", "criteria"].includes(key)) return reject("packet.unknown-field", `unknown field "${key}" on question "${raw.id}"`)
      const criteria = raw.criteria
      if (!isRecord(criteria)) return reject("packet.empty", `noul "${raw.id}" has no criteria`)
      const keys = Object.keys(criteria).sort()
      if (keys.length !== 2 || keys[0] !== "false" || keys[1] !== "true") return reject("packet.inconsistent", `noul "${raw.id}" criteria must be exactly {true,false}`)
      if (!text(criteria.true) || !text(criteria.false)) return reject("packet.malformed", `noul "${raw.id}" criteria need text`)
      questions.push({ id: raw.id, type, instructions: raw.instructions, criteria: { true: criteria.true, false: criteria.false } })
    }
  }

  if (admission.questionsDigest !== digestQuestions(contractName, questions)) {
    return reject("packet.inconsistent", "admission.questionsDigest does not match the questions Jev would see")
  }

  const composition = input.composition
  if (!isRecord(composition) || typeof composition.id !== "string" || typeof composition.version !== "string") {
    return reject("packet.malformed", "composition {id, version} is required")
  }
  const composer = composers.get(`${composition.id}/${composition.version}`)
  if (composer === undefined) return reject("packet.unauthorized", `unknown composition ${composition.id}/${composition.version}`)
  const composerProblem = composer.validate(questions)
  if (composerProblem !== null) return reject("packet.inconsistent", composerProblem)

  let fallback: AdmissionPacket["fallback"]
  if (input.fallback !== undefined) {
    const raw = input.fallback
    if (!isRecord(raw) || typeof raw.id !== "string" || !ID.test(raw.id) || typeof raw.output !== "string") {
      return reject("packet.malformed", "fallback must be {id, output}")
    }
    if (!admittedChoices.has(raw.output)) return reject("packet.inconsistent", "fallback.output must be an admitted Choice option")
    fallback = { id: raw.id, output: raw.output }
  }

  const state = input.state
  if (!isRecord(state)) return reject("packet.state-invalid", "state must be a JSON object")
  const sanitized = sanitize(state, { secrets })
  if (!sanitized.ok) return reject("packet.state-invalid", `state rejected: ${sanitized.message}`)

  // Reject secret-shaped text in what Jev would see rather than silently rewriting gate-authored content.
  const visible = JSON.stringify(toWireQuestions(questions))
  if (redactString(visible, secrets) !== visible) return reject("packet.secret", "questions contain secret-shaped text")

  const packet: AdmissionPacket = {
    schemaVersion: PACKET_SCHEMA_VERSION,
    projectId: input.projectId as string,
    runId: input.runId as string,
    decisionId: input.decisionId as string,
    contract: contractName,
    composition: { id: composition.id, version: composition.version },
    admission: {
      gate: admission.gate,
      questionsDigest: admission.questionsDigest,
      authority: {
        billingClass: authority.billingClass,
        paidCapacity: false,
        permissionEscalation: false,
        verificationWaived: false,
        completionWaived: false,
        completionPreconditionsPassed: authority.completionPreconditionsPassed,
      },
    },
    // Only the sanitized copy is ever sent or logged.
    state: sanitized.value as JsonObject,
    questions,
    ...(fallback !== undefined ? { fallback } : {}),
  }
  return { ok: true, packet, composer }
}
