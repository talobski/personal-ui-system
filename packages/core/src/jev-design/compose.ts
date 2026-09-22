import type { AcceptedAnswer } from "./accept"
import {
  CATEGORY_DIRECTIONS,
  COMMAND_KIND_OUT_OF_SCOPE,
  COMMAND_KIND_QUESTION_ID,
  DESIGN_CATEGORIES,
  NEEDS_CLARIFICATION_QUESTION_ID,
  NOT_TARGETED,
  STRENGTH_QUESTION_ID,
  categoryQuestionId,
} from "./questions"
import type { DesignCategory } from "./questions"
import { RECIPE_CATALOG_VERSION, buildOperation, isStrengthLevel } from "./recipes"
import type { RecipeDirection } from "./recipes"
import type { ActiveMode } from "./state"
import type { ThemeOperation } from "../mutations/mutation"

export type CategoryEvidence = { category: DesignCategory; selected: string; targeted: boolean; direction: RecipeDirection | null; confidence: number }

export type DesignCommandEvidence = {
  questionCatalogVersion: string
  recipeCatalogVersion: string
  commandKindSelected: string
  commandKindConfidence: number
  categories: readonly CategoryEvidence[]
  strengthLabel: string
  strengthConfidence: number
  needsClarificationValue: number
  needsClarificationDecided: boolean
}

export type DesignCommandOutcome =
  | { kind: "staged"; operations: readonly ThemeOperation[]; evidence: DesignCommandEvidence }
  | { kind: "clarification-required"; evidence: DesignCommandEvidence }
  | { kind: "unsupported"; evidence: DesignCommandEvidence }
  | { kind: "rejected"; reason: { code: string; path?: string } }

/**
 * Deterministic composition: accepted typed answers -> zero or more existing `ThemeOperation` values -> outcome.
 * Every categorically-accepted answer is composed independently (bounded multi-category composition, up to the
 * proposal's existing 8-operation limit); this does not require free-form command decomposition or a second Jev
 * call. Code owns every value, clamp, default, and operation construction; Jev supplies only the typed judgments.
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
    if (answer?.primitive !== "choice") return { category, selected: NOT_TARGETED, targeted: false, direction: null, confidence: 0 }
    const { positive, negative } = CATEGORY_DIRECTIONS[category]
    const direction: RecipeDirection | null = answer.selected === positive ? "positive" : answer.selected === negative ? "negative" : null
    const targeted = answer.decided && direction !== null
    return { category, selected: answer.selected, targeted, direction, confidence: answer.confidence }
  })

  const evidence: DesignCommandEvidence = {
    questionCatalogVersion: "design-command-questions/1",
    recipeCatalogVersion: RECIPE_CATALOG_VERSION,
    commandKindSelected: commandKind.selected,
    commandKindConfidence: commandKind.confidence,
    categories,
    strengthLabel: strength,
    strengthConfidence: strengthAnswer.confidence,
    needsClarificationValue: clarification.value,
    needsClarificationDecided: clarification.decided,
  }

  // A confidently out-of-scope command never edits the theme, regardless of any category signal.
  if (commandKind.decided && commandKind.selected === COMMAND_KIND_OUT_OF_SCOPE) return { kind: "unsupported", evidence }

  // A confidently compound/ambiguous command is never resolved by a best-guess pick.
  if (clarification.decided && clarification.decidedTrue) return { kind: "clarification-required", evidence }

  const targeted = categories.filter((entry) => entry.targeted)
  if (targeted.length === 0) return { kind: "unsupported", evidence }

  const operations = targeted.map((entry) => buildOperation(entry.category, entry.direction!, strength, activeMode))
  return { kind: "staged", operations, evidence }
}
