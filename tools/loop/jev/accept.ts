import type { AcceptedAnswer, Question, Reason, ReasonCode } from "./types.ts"

/** Fixed V1 boundary; deliberately not configurable. */
export const CONFIDENCE_THRESHOLD = 0.5

export type Acceptance = { ok: true; answer: AcceptedAnswer } | { ok: false; reason: Reason }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isUnit = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1

const no = (code: ReasonCode, message: string): Acceptance => ({ ok: false, reason: { code, message } })

/** Returns validated probabilities restricted to `allowed` keys, or a failure. */
function readProbabilities(raw: unknown, allowed: ReadonlySet<string>): Record<string, number> | Reason {
  if (!isRecord(raw)) return { code: "failed.probabilities", message: "probabilities must be an object" }
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.has(key)) return { code: "failed.probabilities", message: `unexpected probability key "${key}"` }
    if (!isUnit(value)) return { code: "failed.probabilities", message: `probability for "${key}" is not a finite number in [0,1]` }
    out[key] = value
  }
  return out
}

const isReason = (value: Record<string, number> | Reason): value is Reason => typeof value.code === "string" && typeof value.message === "string"

function readConfidence(raw: unknown): number | Reason {
  if (!isUnit(raw)) return { code: "failed.malformed-answer", message: "confidence is not a finite number in [0,1]" }
  if (raw < CONFIDENCE_THRESHOLD) {
    return { code: "failed.confidence", message: `confidence ${raw} is below ${CONFIDENCE_THRESHOLD}` }
  }
  return raw
}

/** Applies the canonical fixed acceptance rule for one question's answer. */
export function acceptAnswer(question: Question, raw: unknown): Acceptance {
  if (!isRecord(raw)) return no("failed.malformed-answer", "answer is not an object")
  if (raw.type !== question.type) {
    return no("failed.primitive-mismatch", `expected a ${question.type} answer, received ${JSON.stringify(raw.type) ?? "none"}`)
  }

  if (question.type === "choice") {
    const offered = new Set(question.options.map((option) => option.id))
    if (typeof raw.choice !== "string") return no("failed.malformed-answer", "choice is not a string")
    if (!offered.has(raw.choice)) return no("failed.choice-not-offered", `"${raw.choice}" was not offered`)
    const probabilities = readProbabilities(raw.probabilities, offered)
    if (isReason(probabilities)) return { ok: false, reason: probabilities }
    const selected = probabilities[raw.choice]
    if (selected === undefined) return no("failed.probabilities", `no probability reported for selected choice "${raw.choice}"`)
    if (selected < Math.max(...Object.values(probabilities))) {
      return no("failed.choice-not-max", `"${raw.choice}" is not a maximum-probability option`)
    }
    const confidence = readConfidence(raw.confidence)
    if (typeof confidence !== "number") return { ok: false, reason: confidence }
    return { ok: true, answer: { type: "choice", choice: raw.choice, confidence, probabilities } }
  }

  if (question.type === "score") {
    const indices = question.scale.map((_, index) => String(index))
    if (typeof raw.score !== "number" || !Number.isFinite(raw.score)) {
      return no("failed.malformed-answer", "score is not a finite number")
    }
    if (raw.score < 0 || raw.score > question.scale.length - 1) {
      return no("failed.score-range", `score ${raw.score} is outside [0,${question.scale.length - 1}]`)
    }
    const returnedLegend = raw.legend
    if (!isRecord(returnedLegend)) return no("failed.legend-mismatch", "legend must be an object")
    const legendMatches =
      Object.keys(returnedLegend).length === indices.length &&
      indices.every((key, index) => returnedLegend[key] === question.scale[index])
    if (!legendMatches) return no("failed.legend-mismatch", "legend does not exactly match the declared scale")
    const probabilities = readProbabilities(raw.probabilities, new Set(indices))
    if (isReason(probabilities)) return { ok: false, reason: probabilities }
    const confidence = readConfidence(raw.confidence)
    if (typeof confidence !== "number") return { ok: false, reason: confidence }
    const legend = Object.fromEntries(indices.map((key, index) => [key, question.scale[index] as string]))
    return { ok: true, answer: { type: "score", score: raw.score, confidence, legend, probabilities } }
  }

  if (typeof raw.noul !== "number" || !Number.isFinite(raw.noul) || raw.noul < 0 || raw.noul > 1) {
    return no("failed.malformed-answer", "noul is not a finite number in [0,1]")
  }
  if (raw.noul === 0.5) return no("failed.noul-unresolved", "noul is exactly 0.5 (unresolved)")
  return { ok: true, answer: { type: "noul", noul: raw.noul, interpretation: raw.noul > 0.5 ? "yes" : "no" } }
}

export type BatchAcceptance = {
  /** Per-question verdicts, in question order. */
  results: Record<string, Acceptance>
  usable: boolean
  firstFailure: Reason | null
}

/** Composite results are usable only when every required answer passes. */
export function acceptBatch(questions: readonly Question[], answers: Record<string, unknown>): BatchAcceptance {
  const results: Record<string, Acceptance> = {}
  let firstFailure: Reason | null = null
  for (const question of questions) {
    const verdict = acceptAnswer(question, answers[question.id])
    results[question.id] = verdict
    if (!verdict.ok) firstFailure ??= verdict.reason
  }
  return { results, usable: firstFailure === null, firstFailure }
}
