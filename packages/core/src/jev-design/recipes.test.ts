import { describe, expect, it } from "vitest"
import { validateMutation } from "../mutations/mutation"
import { DESIGN_CATEGORIES } from "./questions"
import { buildOperation } from "./recipes"

const STRENGTHS = ["subtle", "moderate", "strong"] as const
const DIRECTIONS = ["positive", "negative"] as const

const proposalBase = { themeId: "t", revision: 1 }
const theme = { id: "t", revision: 1 }

describe("buildOperation", () => {
  it("every (category, direction, strength, mode) combination produces an operation that passes validateMutation", () => {
    for (const category of DESIGN_CATEGORIES) {
      for (const direction of DIRECTIONS) {
        for (const strength of STRENGTHS) {
          for (const mode of ["light", "dark"] as const) {
            const operation = buildOperation(category, direction, strength, mode)
            const result = validateMutation(
              { schemaVersion: "1.0", requestId: "r", base: proposalBase, operations: [operation] },
              theme
            )
            expect(result.ok, `${category}/${direction}/${strength}/${mode}: ${JSON.stringify(!result.ok && result.errors)}`).toBe(true)
          }
        }
      }
    }
  })

  it("positive and negative directions produce different values for the same strength", () => {
    for (const category of DESIGN_CATEGORIES) {
      const positive = buildOperation(category, "positive", "moderate", "light")
      const negative = buildOperation(category, "negative", "moderate", "light")
      expect(JSON.stringify(positive)).not.toBe(JSON.stringify(negative))
    }
  })

  it("is pure and deterministic", () => {
    const a = buildOperation("shadow", "positive", "strong", "dark")
    const b = buildOperation("shadow", "positive", "strong", "dark")
    expect(a).toEqual(b)
  })
})
