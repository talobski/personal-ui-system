import type { DesignCommandState } from "./state"
import type { ChoiceQuestion, NoulQuestion, ScoreQuestion, TypeSafeQuestion, TypeSafeRequest } from "./wire"
import { TYPESAFE_MODEL } from "./wire"

export const QUESTION_CATALOG_VERSION = "design-command-questions/1"

export const DESIGN_CATEGORIES = ["color", "radius", "density", "typography", "shadow", "motion"] as const
export type DesignCategory = (typeof DESIGN_CATEGORIES)[number]

export const NOT_TARGETED = "notTargeted"

/** One directional axis per existing theme category; each option maps to an existing `ThemeOperation` (`recipes.ts`). */
export const CATEGORY_DIRECTIONS: Record<DesignCategory, { positive: string; negative: string }> = {
  color: { positive: "warmer", negative: "cooler" },
  radius: { positive: "rounder", negative: "sharper" },
  density: { positive: "looser", negative: "denser" },
  typography: { positive: "editorial", negative: "neutral" },
  shadow: { positive: "stronger", negative: "softer" },
  motion: { positive: "faster", negative: "slower" },
}

const buildCategoryQuestionId = (category: DesignCategory): string => `targets${category[0]!.toUpperCase()}${category.slice(1)}`

const CATEGORY_QUESTION_IDS: Record<DesignCategory, string> = Object.fromEntries(
  DESIGN_CATEGORIES.map((category) => [category, buildCategoryQuestionId(category)])
) as Record<DesignCategory, string>

export const COMMAND_KIND_QUESTION_ID = "commandKind"
export const STRENGTH_QUESTION_ID = "strength"
export const NEEDS_CLARIFICATION_QUESTION_ID = "needsClarification"

export const COMMAND_KIND_THEME_ADJUSTMENT = "themeAdjustment"
export const COMMAND_KIND_OUT_OF_SCOPE = "outOfScope"

export const STRENGTH_SCALE = ["subtle", "moderate", "strong"] as const
export type StrengthLevel = (typeof STRENGTH_SCALE)[number]

function categoryQuestion(category: DesignCategory): ChoiceQuestion {
  const { positive, negative } = CATEGORY_DIRECTIONS[category]
  return {
    id: CATEGORY_QUESTION_IDS[category],
    type: "choice",
    instructions:
      `Does the design command in state.commandText ask for a change to this project's ${category} theme tokens? ` +
      `Answer "${positive}" if it asks to move ${category} toward more ${positive}, "${negative}" if it asks to move ` +
      `${category} toward more ${negative}, or "${NOT_TARGETED}" if the command does not address ${category} at all. ` +
      `Judge only from the literal text of state.commandText.`,
    options: [
      { id: positive, description: `The command asks for more ${positive} ${category}.` },
      { id: negative, description: `The command asks for more ${negative} ${category}.` },
      { id: NOT_TARGETED, description: `The command does not address ${category}.` },
    ],
  }
}

const commandKindQuestion: ChoiceQuestion = {
  id: COMMAND_KIND_QUESTION_ID,
  type: "choice",
  instructions:
    "Is state.commandText a request to adjust this project's visual theme (color, corner roundness, spacing " +
    "density, typography character, shadow elevation, or motion speed), or is it unrelated to a theme change?",
  options: [
    { id: COMMAND_KIND_THEME_ADJUSTMENT, description: "The text asks for a visual theme adjustment." },
    { id: COMMAND_KIND_OUT_OF_SCOPE, description: "The text is unrelated to a theme adjustment." },
  ],
}

const strengthQuestion: ScoreQuestion = {
  id: STRENGTH_QUESTION_ID,
  type: "score",
  instructions:
    "How strong should whichever theme change state.commandText asks for be? Judge intensity words in the text " +
    '("a bit", "slightly" -> subtle; "more", "quite" -> moderate; "much", "dramatically", "a lot" -> strong). ' +
    "If the command does not ask for any theme change, answer with your best-guess default of \"moderate\".",
  scale: STRENGTH_SCALE,
}

const needsClarificationQuestion: NoulQuestion = {
  id: NEEDS_CLARIFICATION_QUESTION_ID,
  type: "noul",
  instructions:
    "Does state.commandText express more than one distinct directional theme intent (for example, two different " +
    'categories, or contradictory directions for the same category), such that a single unambiguous change cannot ' +
    "be determined? Answer strictly from the literal text.",
  criteria: {
    true: "The command expresses two or more distinct directional intents, or is self-contradictory.",
    false: "The command expresses at most one clear directional intent (or none).",
  },
}

/** All nine questions, in a fixed order, sent together in one packet. Irrelevant answers are ignored by code. */
export function buildQuestionCatalog(): readonly TypeSafeQuestion[] {
  return [
    commandKindQuestion,
    ...DESIGN_CATEGORIES.map((category) => categoryQuestion(category)),
    strengthQuestion,
    needsClarificationQuestion,
  ]
}

export const categoryQuestionId = CATEGORY_QUESTION_IDS

/** Builds the exact one-call TypeSafe request for a command evaluation. State is the only user-authored value. */
export function buildTypeSafeRequest(state: DesignCommandState): TypeSafeRequest {
  return { model: TYPESAFE_MODEL, state, questions: buildQuestionCatalog() }
}
