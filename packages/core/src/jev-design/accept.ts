import type { TypeSafeAnswer, TypeSafeQuestion, TypeSafeResponse } from "./wire"

/**
 * Product-owned confidence/acceptance policy. This mirrors the documented TypeSafe primitive acceptance rules
 * (`docs/JEV_ADAPTER.md` "Fixed acceptance", itself a restatement of `docs.typesafe.ai/confidence` and the
 * primitive docs) and adds one stricter product-owned margin on top, because `Noul`/`Choice` confidence alone is
 * too permissive for six independent category triggers evaluated in parallel (source packet, "do not reuse
 * thresholds across primitive types without an explicit contract").
 */

/** Minimum confidence for a category/commandKind Choice to be treated as decided at all. Stricter than the fixed 0.5 floor. */
export const CHOICE_CONFIDENCE_MARGIN = 0.6
/** Minimum |value - 0.5| for a Noul to be treated as decisive, per-category and for `needsClarification`. */
export const NOUL_MARGIN = 0.2

export type AcceptRuleId =
  | "accept.missing-answer"
  | "accept.unknown-answer"
  | "accept.primitive-mismatch"
  | "accept.malformed-answer"
  | "accept.choice-not-offered"
  | "accept.choice-not-max"
  | "accept.choice-confidence"
  | "accept.score-range"
  | "accept.legend-mismatch"
  | "accept.score-confidence"
  | "accept.noul-range"
  | "accept.noul-unresolved"

export type AcceptError = { ruleId: AcceptRuleId; path: string }

export type AcceptedChoice = { primitive: "choice"; questionId: string; selected: string; probabilities: Record<string, number>; confidence: number; decided: boolean }
export type AcceptedScore = { primitive: "score"; questionId: string; level: number; label: string; confidence: number; decided: boolean }
export type AcceptedNoul = { primitive: "noul"; questionId: string; value: number; decided: boolean; decidedTrue: boolean }
export type AcceptedAnswer = AcceptedChoice | AcceptedScore | AcceptedNoul

export type AcceptResult = { ok: true; answers: Record<string, AcceptedAnswer> } | { ok: false; errors: AcceptError[] }

const isFiniteInRange = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max

function acceptChoice(question: Extract<TypeSafeQuestion, { type: "choice" }>, raw: TypeSafeAnswer): AcceptedChoice | AcceptError {
  if (raw.type !== "choice") return { ruleId: "accept.primitive-mismatch", path: question.id }
  const optionIds = question.options.map((option) => option.id)
  if (!optionIds.includes(raw.selected)) return { ruleId: "accept.choice-not-offered", path: question.id }
  const probabilities = raw.probabilities
  if (typeof probabilities !== "object" || probabilities === null) return { ruleId: "accept.malformed-answer", path: question.id }
  for (const id of optionIds) if (!isFiniteInRange(probabilities[id], 0, 1)) return { ruleId: "accept.malformed-answer", path: question.id }
  const max = Math.max(...optionIds.map((id) => probabilities[id]!))
  if (probabilities[raw.selected]! < max) return { ruleId: "accept.choice-not-max", path: question.id }
  if (!isFiniteInRange(raw.confidence, 0, 1) || raw.confidence < 0.5) return { ruleId: "accept.choice-confidence", path: question.id }
  return {
    primitive: "choice",
    questionId: question.id,
    selected: raw.selected,
    probabilities,
    confidence: raw.confidence,
    decided: raw.confidence >= CHOICE_CONFIDENCE_MARGIN,
  }
}

function acceptScore(question: Extract<TypeSafeQuestion, { type: "score" }>, raw: TypeSafeAnswer): AcceptedScore | AcceptError {
  if (raw.type !== "score") return { ruleId: "accept.primitive-mismatch", path: question.id }
  if (!Number.isInteger(raw.level) || raw.level < 0 || raw.level >= question.scale.length) return { ruleId: "accept.score-range", path: question.id }
  const legend = raw.legend
  if (!Array.isArray(legend) || legend.length !== question.scale.length || legend.some((label, index) => label !== question.scale[index]))
    return { ruleId: "accept.legend-mismatch", path: question.id }
  if (!isFiniteInRange(raw.confidence, 0, 1) || raw.confidence < 0.5) return { ruleId: "accept.score-confidence", path: question.id }
  return { primitive: "score", questionId: question.id, level: raw.level, label: question.scale[raw.level]!, confidence: raw.confidence, decided: true }
}

function acceptNoul(question: Extract<TypeSafeQuestion, { type: "noul" }>, raw: TypeSafeAnswer): AcceptedNoul | AcceptError {
  if (raw.type !== "noul") return { ruleId: "accept.primitive-mismatch", path: question.id }
  if (!isFiniteInRange(raw.value, 0, 1)) return { ruleId: "accept.noul-range", path: question.id }
  if (raw.value === 0.5) return { ruleId: "accept.noul-unresolved", path: question.id }
  const decided = Math.abs(raw.value - 0.5) >= NOUL_MARGIN
  return { primitive: "noul", questionId: question.id, value: raw.value, decided, decidedTrue: raw.value > 0.5 }
}

/**
 * Total-batch acceptance: every question sent must have exactly one well-formed, in-contract answer or the whole
 * decision is unusable (no partial credit), matching the documented TypeSafe/adapter behavior. `decided` on each
 * accepted answer additionally carries this product's stricter margin so composition (`compose.ts`) never has to
 * re-derive it.
 */
export function acceptAnswers(questions: readonly TypeSafeQuestion[], response: TypeSafeResponse): AcceptResult {
  const errors: AcceptError[] = []
  const accepted: Record<string, AcceptedAnswer> = {}
  const answers = response?.answers
  if (typeof answers !== "object" || answers === null) return { ok: false, errors: [{ ruleId: "accept.malformed-answer", path: "" }] }

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
