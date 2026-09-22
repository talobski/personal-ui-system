import type { DesignCommandState } from "./state"
import type { TypeSafeRequest, WireQuestion } from "./wire"
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

/** Product-owned internal catalog representation. Ids are explicit fields here for ergonomic code; `toWireRequest`
 * is the one place that converts this into the real wire shape, where ids become object keys instead. */
export type InternalChoiceQuestion = { id: string; type: "choice"; instructions: string; options: readonly { id: string; description: string }[] }
export type InternalScoreQuestion = { id: string; type: "score"; instructions: string; scale: readonly string[] }
export type InternalNoulQuestion = { id: string; type: "noul"; instructions: string; criteria: { true: string; false: string } }
export type InternalQuestion = InternalChoiceQuestion | InternalScoreQuestion | InternalNoulQuestion

function categoryQuestion(category: DesignCategory): InternalChoiceQuestion {
  const { positive, negative } = CATEGORY_DIRECTIONS[category]
  return {
    id: CATEGORY_QUESTION_IDS[category],
    type: "choice",
    instructions:
      `Does the design command in state.commandText ask for a change to this project's ${category} theme tokens? ` +
      `Answer "${positive}" if it asks to move ${category} toward more ${positive}, "${negative}" if it asks to move ` +
      `${category} toward more ${negative}, or "${NOT_TARGETED}" if the command does not address ${category} at all. ` +
      `Judge only from the literal text of state.commandText. A command can address more than one category at once — ` +
      `judge this category entirely independently of any other category the text might also mention.`,
    options: [
      { id: positive, description: `The command asks for more ${positive} ${category}.` },
      { id: negative, description: `The command asks for more ${negative} ${category}.` },
      { id: NOT_TARGETED, description: `The command does not address ${category}.` },
    ],
  }
}

const commandKindQuestion: InternalChoiceQuestion = {
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

const strengthQuestion: InternalScoreQuestion = {
  id: STRENGTH_QUESTION_ID,
  type: "score",
  instructions:
    "How strong should whichever theme change state.commandText asks for be? Judge intensity words in the text " +
    '("a bit", "slightly" -> subtle; "more", "quite" -> moderate; "much", "dramatically", "a lot" -> strong). ' +
    "If the command does not ask for any theme change, answer with your best-guess default of \"moderate\".",
  scale: STRENGTH_SCALE,
}

/**
 * `needsClarification` is deliberately NOT a proxy for "does this command touch more than one category" — a
 * command that asks for several independent, unambiguous category changes at once (e.g. "make it denser and
 * warmer") is fully supported and must compose every one of them, not be routed to clarification. This question is
 * reserved for genuine contradiction, irreducible vagueness, or scope outside the six supported categories in a
 * way that prevents a safe, specific mapping.
 */
const needsClarificationQuestion: InternalNoulQuestion = {
  id: NEEDS_CLARIFICATION_QUESTION_ID,
  type: "noul",
  instructions:
    "Is state.commandText contradictory (for example, it asks for two opposite changes to the same aspect, such " +
    'as "rounder but also sharper corners"), too vague to determine any concrete change, or does it ask for ' +
    "something entirely outside color, corner roundness, spacing density, typography character, shadow elevation, " +
    "and motion speed, such that it cannot be safely and specifically mapped to those six categories? Answer " +
    "true only for genuine contradiction, vagueness, or out-of-catalog scope. Do NOT answer true merely because " +
    "the command touches more than one of the six categories at once — requesting several independent category " +
    "changes in one command is fully supported and is never by itself a reason to answer true.",
  criteria: {
    true: "The command contradicts itself, is too vague to act on, or asks for something outside the six supported categories, in a way that prevents a safe, specific mapping.",
    false: "The command's intent(s) can each be safely and specifically mapped to the six categories, even if it touches more than one of them.",
  },
}

/** All nine questions, in a fixed order, sent together in one packet. Irrelevant answers are ignored by code. */
export function buildQuestionCatalog(): readonly InternalQuestion[] {
  return [
    commandKindQuestion,
    ...DESIGN_CATEGORIES.map((category) => categoryQuestion(category)),
    strengthQuestion,
    needsClarificationQuestion,
  ]
}

export const categoryQuestionId = CATEGORY_QUESTION_IDS

function toWireQuestion(question: InternalQuestion): WireQuestion {
  switch (question.type) {
    case "choice":
      return { type: "choice", instructions: question.instructions, criteria: Object.fromEntries(question.options.map((o) => [o.id, o.description])) }
    case "score":
      return { type: "score", instructions: question.instructions, criteria: question.scale }
    case "noul":
      return { type: "noul", instructions: question.instructions, criteria: question.criteria }
  }
}

/** The one audited conversion from the internal catalog to the real `POST /v1/systemone` wire request shape. */
export function toWireRequest(state: DesignCommandState, questions: readonly InternalQuestion[]): TypeSafeRequest {
  return { model: TYPESAFE_MODEL, state, questions: Object.fromEntries(questions.map((q) => [q.id, toWireQuestion(q)])) }
}

/** Builds the exact one-call TypeSafe request for a command evaluation. State is the only user-authored value. */
export function buildTypeSafeRequest(state: DesignCommandState): TypeSafeRequest {
  return toWireRequest(state, buildQuestionCatalog())
}
