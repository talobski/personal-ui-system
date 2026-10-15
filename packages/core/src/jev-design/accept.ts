import type { InternalQuestion } from "./questions"
import type { TypeSafeResponse } from "./wire"

/**
 * Product-owned confidence/acceptance policy, validated against the real `POST /v1/systemone` raw answer shapes
 * (`type`/`choice`/`probabilities`/`confidence`, `type`/`score`/`legend`/`probabilities`/`confidence`,
 * `type`/`noul`) — not a normalized internal representation. Every answer's required `type` field
 * must match the primitive the question was asked as. On top of the documented fixed floor (Choice/Score need
 * `confidence >= 0.5`; Noul rejects exactly `0.5`), this adds one stricter product-owned margin, because
 * `Noul`/`Choice` confidence alone is too permissive for independent category triggers evaluated in parallel
 * (source packet, "do not reuse thresholds across primitive types without an explicit contract").
 */

/** Minimum confidence for a category/commandKind Choice to be treated as decided at all. Stricter than the fixed 0.5 floor. */
export const CHOICE_CONFIDENCE_MARGIN = 0.6
/** Minimum |value - 0.5| for a Noul to be treated as decisive. */
export const NOUL_MARGIN = 0.2
/** Probability sets must sum to 1 within this tolerance (floating-point/rounding slack, not a semantic allowance). */
export const PROBABILITY_SUM_TOLERANCE = 0.02

export type AcceptRuleId =
  | "accept.missing-answer"
  | "accept.unknown-answer"
  | "accept.malformed-answer"
  | "accept.primitive-mismatch"
  | "accept.choice-not-offered"
  | "accept.choice-not-max"
  | "accept.choice-confidence"
  | "accept.choice-probability-keys"
  | "accept.choice-probability-range"
  | "accept.choice-probability-sum"
  | "accept.score-range"
  | "accept.score-confidence"
  | "accept.score-legend-mismatch"
  | "accept.score-probability-keys"
  | "accept.score-probability-range"
  | "accept.score-probability-sum"
  | "accept.noul-range"
  | "accept.noul-unresolved"

export type AcceptError = { ruleId: AcceptRuleId; path: string }

export type AcceptedChoice = {
  primitive: "choice"
  questionId: string
  selected: string
  probabilities: Record<string, number>
  confidence: number
  decided: boolean
}
export type AcceptedScore = {
  primitive: "score"
  questionId: string
  /** Raw fractional score, exactly as returned. */
  score: number
  /** Product-derived bucket label: `STRENGTH_SCALE[clamp(round(score))]`, never sent to or read as-is from Jev. */
  label: string
  legend: Record<string, string>
  probabilities: Record<string, number>
  confidence: number
  decided: boolean
}
export type AcceptedNoul = { primitive: "noul"; questionId: string; value: number; decided: boolean; decidedTrue: boolean }
export type AcceptedAnswer = AcceptedChoice | AcceptedScore | AcceptedNoul

export type AcceptResult = { ok: true; answers: Record<string, AcceptedAnswer> } | { ok: false; errors: AcceptError[] }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)
const isFiniteInRange = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
const sameKeySet = (actual: readonly string[], expected: readonly string[]): boolean => {
  const a = [...actual].sort()
  const b = [...expected].sort()
  return a.length === b.length && a.every((key, index) => key === b[index])
}
const sumsToOne = (values: readonly number[]): boolean => Math.abs(values.reduce((sum, v) => sum + v, 0) - 1) <= PROBABILITY_SUM_TOLERANCE

function acceptChoice(question: Extract<InternalQuestion, { type: "choice" }>, raw: unknown): AcceptedChoice | AcceptError {
  if (!isRecord(raw)) return { ruleId: "accept.malformed-answer", path: question.id }
  if (raw.type !== "choice") return { ruleId: "accept.primitive-mismatch", path: question.id }
  if (!sameKeySet(Object.keys(raw), ["type", "choice", "probabilities", "confidence"])) return { ruleId: "accept.malformed-answer", path: question.id }
  const optionIds = question.options.map((option) => option.id)
  const selected = raw.choice
  if (typeof selected !== "string" || !optionIds.includes(selected)) return { ruleId: "accept.choice-not-offered", path: question.id }
  const probabilities = raw.probabilities
  if (!isRecord(probabilities)) return { ruleId: "accept.malformed-answer", path: question.id }
  if (!sameKeySet(Object.keys(probabilities), optionIds)) return { ruleId: "accept.choice-probability-keys", path: question.id }
  for (const id of optionIds) if (!isFiniteInRange(probabilities[id], 0, 1)) return { ruleId: "accept.choice-probability-range", path: question.id }
  const values = optionIds.map((id) => probabilities[id] as number)
  if (!sumsToOne(values)) return { ruleId: "accept.choice-probability-sum", path: question.id }
  const max = Math.max(...values)
  if ((probabilities[selected] as number) < max) return { ruleId: "accept.choice-not-max", path: question.id }
  const confidence = raw.confidence
  if (!isFiniteInRange(confidence, 0, 1) || confidence < 0.5) return { ruleId: "accept.choice-confidence", path: question.id }
  return {
    primitive: "choice",
    questionId: question.id,
    selected,
    probabilities: probabilities as Record<string, number>,
    confidence,
    decided: confidence >= CHOICE_CONFIDENCE_MARGIN,
  }
}

function acceptScore(question: Extract<InternalQuestion, { type: "score" }>, raw: unknown): AcceptedScore | AcceptError {
  if (!isRecord(raw)) return { ruleId: "accept.malformed-answer", path: question.id }
  if (raw.type !== "score") return { ruleId: "accept.primitive-mismatch", path: question.id }
  if (!sameKeySet(Object.keys(raw), ["type", "score", "legend", "probabilities", "confidence"])) return { ruleId: "accept.malformed-answer", path: question.id }
  const levels = question.scale.length
  const indexKeys = Array.from({ length: levels }, (_, i) => String(i))

  const legend = raw.legend
  if (!isRecord(legend) || !sameKeySet(Object.keys(legend), indexKeys)) return { ruleId: "accept.score-legend-mismatch", path: question.id }
  for (let i = 0; i < levels; i++) if (legend[String(i)] !== question.scale[i]) return { ruleId: "accept.score-legend-mismatch", path: question.id }

  const probabilities = raw.probabilities
  if (!isRecord(probabilities)) return { ruleId: "accept.malformed-answer", path: question.id }
  if (!sameKeySet(Object.keys(probabilities), indexKeys)) return { ruleId: "accept.score-probability-keys", path: question.id }
  for (const key of indexKeys) if (!isFiniteInRange(probabilities[key], 0, 1)) return { ruleId: "accept.score-probability-range", path: question.id }
  if (!sumsToOne(indexKeys.map((key) => probabilities[key] as number))) return { ruleId: "accept.score-probability-sum", path: question.id }

  const score = raw.score
  if (!isFiniteInRange(score, 0, levels - 1)) return { ruleId: "accept.score-range", path: question.id }
  const confidence = raw.confidence
  if (!isFiniteInRange(confidence, 0, 1) || confidence < 0.5) return { ruleId: "accept.score-confidence", path: question.id }

  const roundedIndex = Math.min(levels - 1, Math.max(0, Math.round(score)))
  return {
    primitive: "score",
    questionId: question.id,
    score,
    label: question.scale[roundedIndex]!,
    legend: legend as Record<string, string>,
    probabilities: probabilities as Record<string, number>,
    confidence,
    decided: true,
  }
}

function acceptNoul(question: Extract<InternalQuestion, { type: "noul" }>, raw: unknown): AcceptedNoul | AcceptError {
  if (!isRecord(raw)) return { ruleId: "accept.malformed-answer", path: question.id }
  if (raw.type !== "noul") return { ruleId: "accept.primitive-mismatch", path: question.id }
  if (!sameKeySet(Object.keys(raw), ["type", "noul"])) return { ruleId: "accept.malformed-answer", path: question.id }
  const value = raw.noul
  if (!isFiniteInRange(value, 0, 1)) return { ruleId: "accept.noul-range", path: question.id }
  if (value === 0.5) return { ruleId: "accept.noul-unresolved", path: question.id }
  return { primitive: "noul", questionId: question.id, value, decided: Math.abs(value - 0.5) >= NOUL_MARGIN, decidedTrue: value > 0.5 }
}

/**
 * Total-batch acceptance: every question sent must have exactly one well-formed, in-contract answer, at its exact
 * expected key set, or the whole decision is unusable (no partial credit). Every answer is validated against the
 * raw `POST /v1/systemone` wire shape for the primitive it was asked as. The official API requires every answer to
 * carry a `type` field matching the question's primitive; a missing, unrecognized, or mismatched `type` is rejected
 * as `accept.primitive-mismatch` before any other field is inspected. Any other shape deviation (missing/extra
 * field, wrong value type, etc.) is `accept.malformed-answer`.
 */
export function acceptAnswers(questions: readonly InternalQuestion[], response: TypeSafeResponse): AcceptResult {
  const errors: AcceptError[] = []
  const accepted: Record<string, AcceptedAnswer> = {}
  const answers = response?.answers
  if (!isRecord(answers)) return { ok: false, errors: [{ ruleId: "accept.malformed-answer", path: "" }] }

  const answered = new Set(Object.keys(answers))
  for (const question of questions) {
    answered.delete(question.id)
    const raw = answers[question.id]
    if (raw === undefined) {
      errors.push({ ruleId: "accept.missing-answer", path: question.id })
      continue
    }
    const result = question.type === "choice" ? acceptChoice(question, raw) : question.type === "score" ? acceptScore(question, raw) : acceptNoul(question, raw)
    if ("ruleId" in result) errors.push(result)
    else accepted[question.id] = result
  }
  for (const extra of answered) errors.push({ ruleId: "accept.unknown-answer", path: extra })

  return errors.length > 0 ? { ok: false, errors } : { ok: true, answers: accepted }
}
