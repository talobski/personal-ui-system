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

const choice = (id: string, selected: string, confidence: number, probabilities?: Record<string, number>): AcceptedAnswer => ({
  primitive: "choice",
  questionId: id,
  selected,
  probabilities: probabilities ?? { [selected]: confidence, __rest__: 1 - confidence },
  confidence,
  decided: confidence >= 0.6,
})
const score = (label: string, confidence = 0.9): AcceptedAnswer => {
  const scale = ["subtle", "moderate", "strong"]
  const index = scale.indexOf(label)
  return {
    primitive: "score",
    questionId: STRENGTH_QUESTION_ID,
    score: index,
    label,
    legend: { "0": "subtle", "1": "moderate", "2": "strong" },
    probabilities: { "0": index === 0 ? confidence : (1 - confidence) / 2, "1": index === 1 ? confidence : (1 - confidence) / 2, "2": index === 2 ? confidence : (1 - confidence) / 2 },
    confidence,
    decided: true,
  }
}
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

  it("stages two operations for a legitimate multi-category command ('make it denser and warmer')", () => {
    const answers = baseAnswers({
      [categoryQuestionId.density]: choice(categoryQuestionId.density, "denser", 0.9),
      [categoryQuestionId.color]: choice(categoryQuestionId.color, "warmer", 0.9),
    })
    const outcome = composeDesignCommandOutcome(answers, "light")
    expect(outcome.kind).toBe("staged")
    if (outcome.kind === "staged") {
      expect(outcome.operations).toHaveLength(2)
      expect(outcome.operations.map((op) => op.op).sort()).toEqual(["setColor", "setDensity"])
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

  it("is unsupported (no-category-targeted) when zero categories clear the margin", () => {
    const outcome = composeDesignCommandOutcome(baseAnswers(), "light")
    expect(outcome).toMatchObject({ kind: "unsupported", cause: "no-category-targeted" })
  })

  it("is unsupported (out-of-scope) when commandKind confidently resolves out of scope, even if a category looks targeted", () => {
    const answers = baseAnswers({
      [COMMAND_KIND_QUESTION_ID]: choice(COMMAND_KIND_QUESTION_ID, COMMAND_KIND_OUT_OF_SCOPE, 0.9),
      [categoryQuestionId.radius]: choice(categoryQuestionId.radius, "rounder", 0.9),
    })
    expect(composeDesignCommandOutcome(answers, "light")).toMatchObject({ kind: "unsupported", cause: "out-of-scope" })
  })

  it("requires clarification (ambiguous) when needsClarification clears its margin as true, e.g. a contradictory command", () => {
    const answers = baseAnswers({
      [categoryQuestionId.radius]: choice(categoryQuestionId.radius, "rounder", 0.9),
      [NEEDS_CLARIFICATION_QUESTION_ID]: noul(0.9),
    })
    const outcome = composeDesignCommandOutcome(answers, "light")
    expect(outcome).toMatchObject({ kind: "clarification-required", cause: "ambiguous" })
    if (outcome.kind === "clarification-required") expect(outcome.evidence).toBeDefined()
  })

  it("requires clarification (never stages) when commandKind is accepted but undecided (below the product margin)", () => {
    const answers = baseAnswers({
      [COMMAND_KIND_QUESTION_ID]: choice(COMMAND_KIND_QUESTION_ID, COMMAND_KIND_THEME_ADJUSTMENT, 0.55),
      [categoryQuestionId.radius]: choice(categoryQuestionId.radius, "rounder", 0.9),
    })
    const outcome = composeDesignCommandOutcome(answers, "light")
    expect(outcome).toMatchObject({ kind: "clarification-required", cause: "command-kind-undecided" })
    expect(outcome.kind).not.toBe("staged")
  })

  it("requires clarification (never stages) when needsClarification is accepted but undecided (below the product margin)", () => {
    const answers = baseAnswers({
      [categoryQuestionId.radius]: choice(categoryQuestionId.radius, "rounder", 0.9),
      [NEEDS_CLARIFICATION_QUESTION_ID]: noul(0.55),
    })
    const outcome = composeDesignCommandOutcome(answers, "light")
    expect(outcome).toMatchObject({ kind: "clarification-required", cause: "needs-clarification-undecided" })
    expect(outcome.kind).not.toBe("staged")
  })

  it("a category Choice at the fixed floor but under the product margin is not targeted and constructs no operation", () => {
    const answers = baseAnswers({ [categoryQuestionId.radius]: choice(categoryQuestionId.radius, "rounder", 0.5) })
    const outcome = composeDesignCommandOutcome(answers, "light")
    expect(outcome).toMatchObject({ kind: "unsupported", cause: "no-category-targeted" })
    if (outcome.kind === "unsupported") expect(outcome.evidence.categories.find((c) => c.category === "radius")).toMatchObject({ targeted: false })
  })

  it("never produces an operation outside the closed ThemeOperation set", () => {
    const answers = baseAnswers({ [categoryQuestionId.color]: choice(categoryQuestionId.color, "cooler", 0.9) })
    const outcome = composeDesignCommandOutcome(answers, "dark")
    if (outcome.kind === "staged") for (const op of outcome.operations) expect(KNOWN_OPERATIONS).toContain(op.op)
  })

  it("evidence carries full typed probabilities/legend, not just the winning label", () => {
    const answers = baseAnswers({ [categoryQuestionId.radius]: choice(categoryQuestionId.radius, "rounder", 0.9, { rounder: 0.9, sharper: 0.05, notTargeted: 0.05 }) })
    const outcome = composeDesignCommandOutcome(answers, "light")
    if (outcome.kind === "rejected") throw new Error("unexpected rejection")
    expect(outcome.evidence.commandKindProbabilities).toBeDefined()
    expect(outcome.evidence.strengthProbabilities).toBeDefined()
    expect(outcome.evidence.strengthLegend).toEqual({ "0": "subtle", "1": "moderate", "2": "strong" })
    const radius = outcome.evidence.categories.find((c) => c.category === "radius")!
    expect(radius.probabilities).toEqual({ rounder: 0.9, sharper: 0.05, notTargeted: 0.05 })
  })
})
