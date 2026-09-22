import { describe, expect, it } from "vitest"
import type { AcceptedAnswer } from "./accept"
import { composeDesignCommandOutcome } from "./compose"
import {
  COMMAND_KIND_OUT_OF_SCOPE,
  COMMAND_KIND_QUESTION_ID,
  COMMAND_KIND_THEME_ADJUSTMENT,
  NEEDS_CLARIFICATION_QUESTION_ID,
  NOT_TARGETED,
  STRENGTH_QUESTION_ID,
  categoryQuestionId,
} from "./questions"
import { KNOWN_OPERATIONS } from "./recipes.fixtures"

const choice = (id: string, selected: string, confidence: number): AcceptedAnswer => ({
  primitive: "choice",
  questionId: id,
  selected,
  probabilities: { [selected]: 1 },
  confidence,
  decided: confidence >= 0.6,
})
const score = (label: string, confidence = 0.9): AcceptedAnswer => ({
  primitive: "score",
  questionId: STRENGTH_QUESTION_ID,
  level: ["subtle", "moderate", "strong"].indexOf(label),
  label,
  confidence,
  decided: true,
})
const noul = (value: number): AcceptedAnswer => ({
  primitive: "noul",
  questionId: NEEDS_CLARIFICATION_QUESTION_ID,
  value,
  decided: Math.abs(value - 0.5) >= 0.2,
  decidedTrue: value > 0.5,
})

function baseAnswers(overrides: Record<string, AcceptedAnswer> = {}): Record<string, AcceptedAnswer> {
  const answers: Record<string, AcceptedAnswer> = {
    [COMMAND_KIND_QUESTION_ID]: choice(COMMAND_KIND_QUESTION_ID, COMMAND_KIND_THEME_ADJUSTMENT, 0.9),
    [STRENGTH_QUESTION_ID]: score("moderate"),
    [NEEDS_CLARIFICATION_QUESTION_ID]: noul(0.1),
  }
  for (const category of Object.keys(categoryQuestionId) as (keyof typeof categoryQuestionId)[]) {
    answers[categoryQuestionId[category]] = choice(categoryQuestionId[category], NOT_TARGETED, 0.9)
  }
  return { ...answers, ...overrides }
}

describe("composeDesignCommandOutcome", () => {
  it("stages exactly one operation for a single targeted category", () => {
    const answers = baseAnswers({ [categoryQuestionId.radius]: choice(categoryQuestionId.radius, "rounder", 0.9) })
    const outcome = composeDesignCommandOutcome(answers, "light")
    expect(outcome.kind).toBe("staged")
    if (outcome.kind === "staged") {
      expect(outcome.operations).toHaveLength(1)
      expect(outcome.operations[0]).toEqual({ op: "setRadius", value: "0.75rem" })
    }
  })

  it("composes up to all six categories into independent operations in one command", () => {
    const answers = baseAnswers({
      [categoryQuestionId.radius]: choice(categoryQuestionId.radius, "rounder", 0.9),
      [categoryQuestionId.density]: choice(categoryQuestionId.density, "denser", 0.9),
      [categoryQuestionId.color]: choice(categoryQuestionId.color, "warmer", 0.9),
      [categoryQuestionId.shadow]: choice(categoryQuestionId.shadow, "stronger", 0.9),
      [categoryQuestionId.motion]: choice(categoryQuestionId.motion, "faster", 0.9),
      [categoryQuestionId.typography]: choice(categoryQuestionId.typography, "editorial", 0.9),
    })
    const outcome = composeDesignCommandOutcome(answers, "light")
    expect(outcome.kind).toBe("staged")
    if (outcome.kind === "staged") {
      expect(outcome.operations).toHaveLength(6)
      expect(outcome.operations.map((op) => op.op).sort()).toEqual(
        ["setColor", "setDensity", "setMotionDuration", "setRadius", "setSansFamily", "setShadowBlur"].sort()
      )
      for (const op of outcome.operations) expect(KNOWN_OPERATIONS).toContain(op.op)
    }
  })

  it("is deterministic: identical accepted answers always produce byte-identical operations", () => {
    const answers = baseAnswers({ [categoryQuestionId.motion]: choice(categoryQuestionId.motion, "slower", 0.9) })
    const a = composeDesignCommandOutcome(answers, "dark")
    const b = composeDesignCommandOutcome(answers, "dark")
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it("is unsupported when zero categories clear the margin", () => {
    const outcome = composeDesignCommandOutcome(baseAnswers(), "light")
    expect(outcome.kind).toBe("unsupported")
  })

  it("is unsupported when commandKind confidently resolves out of scope, even if a category looks targeted", () => {
    const answers = baseAnswers({
      [COMMAND_KIND_QUESTION_ID]: choice(COMMAND_KIND_QUESTION_ID, COMMAND_KIND_OUT_OF_SCOPE, 0.9),
      [categoryQuestionId.radius]: choice(categoryQuestionId.radius, "rounder", 0.9),
    })
    expect(composeDesignCommandOutcome(answers, "light").kind).toBe("unsupported")
  })

  it("requires clarification when needsClarification clears its margin as true", () => {
    const answers = baseAnswers({
      [categoryQuestionId.radius]: choice(categoryQuestionId.radius, "rounder", 0.9),
      [NEEDS_CLARIFICATION_QUESTION_ID]: noul(0.9),
    })
    const outcome = composeDesignCommandOutcome(answers, "light")
    expect(outcome.kind).toBe("clarification-required")
  })

  it("a category Choice at the fixed floor but under the product margin is not targeted", () => {
    const answers = baseAnswers({ [categoryQuestionId.radius]: choice(categoryQuestionId.radius, "rounder", 0.5) })
    expect(composeDesignCommandOutcome(answers, "light").kind).toBe("unsupported")
  })

  it("never produces an operation outside the closed ThemeOperation set", () => {
    const answers = baseAnswers({ [categoryQuestionId.color]: choice(categoryQuestionId.color, "cooler", 0.9) })
    const outcome = composeDesignCommandOutcome(answers, "dark")
    if (outcome.kind === "staged") for (const op of outcome.operations) expect(KNOWN_OPERATIONS).toContain(op.op)
  })
})
