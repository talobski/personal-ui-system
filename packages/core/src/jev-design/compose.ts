import type { AcceptedAnswer } from "./accept"
import {
  CATEGORY_DIRECTIONS,
  COMMAND_KIND_OUT_OF_SCOPE,
  COMMAND_KIND_QUESTION_ID,
  DESIGN_CATEGORIES,
  NEEDS_CLARIFICATION_QUESTION_ID,
  NOT_TARGETED,
  QUESTION_CATALOG_VERSION,
  STRENGTH_QUESTION_ID,
  categoryQuestionId,
} from "./questions"
import type { DesignCategory } from "./questions"
import { RECIPE_CATALOG_VERSION, buildOperation, isStrengthLevel } from "./recipes"
import type { RecipeDirection } from "./recipes"
import type { ActiveMode } from "./state"
import type { ThemeOperation } from "../mutations/mutation"

export type CategoryEvidence = {
  category: DesignCategory
  selected: string
  targeted: boolean
  direction: RecipeDirection | null
  confidence: number
  probabilities: Record<string, number>
}

export type DesignCommandEvidence = {
  questionCatalogVersion: string
  recipeCatalogVersion: string
  commandKindSelected: string
  commandKindConfidence: number
  commandKindProbabilities: Record<string, number>
  categories: readonly CategoryEvidence[]
  strengthLabel: string
  strengthScore: number
  strengthConfidence: number
  strengthProbabilities: Record<string, number>
  strengthLegend: Record<string, string>
  needsClarificationValue: number
  needsClarificationDecided: boolean
}

/** Fixed, code-authored labels for why a non-staged outcome happened. Never Jev-generated prose. */
export type ClarificationCause = "command-kind-undecided" | "needs-clarification-undecided" | "ambiguous"
export type UnsupportedCause = "out-of-scope" | "no-category-targeted"

export type DesignCommandOutcome =
  | { kind: "staged"; operations: readonly ThemeOperation[]; evidence: DesignCommandEvidence }
  | { kind: "clarification-required"; cause: ClarificationCause; evidence: DesignCommandEvidence }
  | { kind: "unsupported"; cause: UnsupportedCause; evidence: DesignCommandEvidence }
  | { kind: "rejected"; reason: { code: string; path?: string } }

/**
 * Deterministic composition: accepted typed answers -> zero or more existing `ThemeOperation` values -> outcome.
 * Every independently-accepted, confidently-targeted category composes into its own operation in the same command
 * (bounded multi-category composition, up to the proposal's existing 8-operation limit) — "make it denser and
 * warmer" is a fully supported two-operation command, not a clarification case. `needsClarification` is reserved
 * for genuine contradiction, irreducible vagueness, or out-of-catalog scope (`questions.ts`), never for merely
 * touching more than one category.
 *
 * Both `commandKind` and `needsClarification` are *required* judgments: an undecided answer for either (below the
 * product confidence margin) never permits staging, regardless of what the six category answers say, and always
 * carries its full typed evidence rather than a free-form reason.
 */
export function composeDesignCommandOutcome(answers: Record<string, AcceptedAnswer>, activeMode: ActiveMode): DesignCommandOutcome {
  const commandKind = answers[COMMAND_KIND_QUESTION_ID]
  const strengthAnswer = answers[STRENGTH_QUESTION_ID]
  const clarification = answers[NEEDS_CLARIFICATION_QUESTION_ID]
  if (commandKind?.primitive !== "choice" || strengthAnswer?.primitive !== "score" || clarification?.primitive !== "noul") {
    return { kind: "rejected", reason: { code: "compose.missing-required-answer" } }
  }
  if (!isStrengthLevel(strengthAnswer.label)) return { kind: "rejected", reason: { code: "compose.invalid-strength-label" } }
  const strength = strengthAnswer.label

  const categories: CategoryEvidence[] = DESIGN_CATEGORIES.map((category) => {
    const answer = answers[categoryQuestionId[category]]
    if (answer?.primitive !== "choice") return { category, selected: NOT_TARGETED, targeted: false, direction: null, confidence: 0, probabilities: {} }
    const { positive, negative } = CATEGORY_DIRECTIONS[category]
    const direction: RecipeDirection | null = answer.selected === positive ? "positive" : answer.selected === negative ? "negative" : null
    const targeted = answer.decided && direction !== null
    return { category, selected: answer.selected, targeted, direction, confidence: answer.confidence, probabilities: answer.probabilities }
  })

  const evidence: DesignCommandEvidence = {
    questionCatalogVersion: QUESTION_CATALOG_VERSION,
    recipeCatalogVersion: RECIPE_CATALOG_VERSION,
    commandKindSelected: commandKind.selected,
    commandKindConfidence: commandKind.confidence,
    commandKindProbabilities: commandKind.probabilities,
    categories,
    strengthLabel: strength,
    strengthScore: strengthAnswer.score,
    strengthConfidence: strengthAnswer.confidence,
    strengthProbabilities: strengthAnswer.probabilities,
    strengthLegend: strengthAnswer.legend,
    needsClarificationValue: clarification.value,
    needsClarificationDecided: clarification.decided,
  }

  // Required-judgment confidence must fail closed: an undecided commandKind never permits staging, whatever the
  // category answers say.
  if (!commandKind.decided) return { kind: "clarification-required", cause: "command-kind-undecided", evidence }
  if (commandKind.selected === COMMAND_KIND_OUT_OF_SCOPE) return { kind: "unsupported", cause: "out-of-scope", evidence }

  // Likewise an undecided needsClarification never permits staging: an unresolved "is this safe to act on"
  // judgment is not the same as a confident "no".
  if (!clarification.decided) return { kind: "clarification-required", cause: "needs-clarification-undecided", evidence }
  if (clarification.decidedTrue) return { kind: "clarification-required", cause: "ambiguous", evidence }

  const targeted = categories.filter((entry) => entry.targeted)
  if (targeted.length === 0) return { kind: "unsupported", cause: "no-category-targeted", evidence }

  const operations = targeted.map((entry) => buildOperation(entry.category, entry.direction!, strength, activeMode))
  return { kind: "staged", operations, evidence }
}
