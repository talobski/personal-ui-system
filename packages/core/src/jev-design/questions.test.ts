import { describe, expect, it } from "vitest"
import {
  COMMAND_KIND_QUESTION_ID,
  DESIGN_CATEGORIES,
  NEEDS_CLARIFICATION_QUESTION_ID,
  STRENGTH_QUESTION_ID,
  buildQuestionCatalog,
  buildTypeSafeRequest,
  categoryQuestionId,
  toWireRequest,
} from "./questions"
import { buildDesignCommandState } from "./state"
import { TYPESAFE_MODEL } from "./wire"

describe("buildQuestionCatalog", () => {
  it("asks one question per category plus commandKind, strength, and needsClarification", () => {
    const questions = buildQuestionCatalog()
    const ids = questions.map((q) => q.id)
    expect(ids).toContain(COMMAND_KIND_QUESTION_ID)
    expect(ids).toContain(STRENGTH_QUESTION_ID)
    expect(ids).toContain(NEEDS_CLARIFICATION_QUESTION_ID)
    for (const category of DESIGN_CATEGORIES) expect(ids).toContain(categoryQuestionId[category])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("mixes all three primitives", () => {
    const types = new Set(buildQuestionCatalog().map((q) => q.type))
    expect(types).toEqual(new Set(["choice", "score", "noul"]))
  })

  it("every category question offers a notTargeted escape option", () => {
    for (const category of DESIGN_CATEGORIES) {
      const question = buildQuestionCatalog().find((q) => q.id === categoryQuestionId[category])!
      expect(question.type).toBe("choice")
      if (question.type === "choice") expect(question.options.map((o) => o.id)).toContain("notTargeted")
    }
  })

  it("needsClarification's wording never conflates multi-category commands with clarification", () => {
    const question = buildQuestionCatalog().find((q) => q.id === NEEDS_CLARIFICATION_QUESTION_ID)!
    expect(question.type).toBe("noul")
    if (question.type === "noul") {
      expect(question.instructions.toLowerCase()).toContain("do not answer true merely because")
      expect(question.criteria.false.toLowerCase()).toContain("even if it touches more than one")
    }
  })
})

describe("toWireRequest / buildTypeSafeRequest", () => {
  it("sends only state plus the fixed catalog, using the fixed model, with questions keyed by id (real wire shape)", () => {
    const state = buildDesignCommandState("make it denser", "light")
    const request = buildTypeSafeRequest(state)
    expect(request.model).toBe(TYPESAFE_MODEL)
    expect(request.state).toEqual(state)
    const ids = buildQuestionCatalog().map((q) => q.id)
    expect(Object.keys(request.questions).sort()).toEqual([...ids].sort())
    // No question body carries an `id` field; the id is only the object key.
    for (const body of Object.values(request.questions)) expect(body).not.toHaveProperty("id")
  })

  it("converts a Choice question's options into a criteria id->description map", () => {
    const state = buildDesignCommandState("x", "light")
    const request = toWireRequest(state, buildQuestionCatalog())
    const radius = request.questions[categoryQuestionId.radius]!
    expect(radius.type).toBe("choice")
    if (radius.type === "choice") {
      expect(radius.criteria).toHaveProperty("rounder")
      expect(radius.criteria).toHaveProperty("sharper")
      expect(radius.criteria).toHaveProperty("notTargeted")
    }
  })

  it("converts a Score question's scale into an ordered criteria array", () => {
    const state = buildDesignCommandState("x", "light")
    const request = toWireRequest(state, buildQuestionCatalog())
    const strength = request.questions[STRENGTH_QUESTION_ID]!
    expect(strength.type).toBe("score")
    if (strength.type === "score") expect(strength.criteria).toEqual(["subtle", "moderate", "strong"])
  })

  it("converts a Noul question's criteria through unchanged", () => {
    const state = buildDesignCommandState("x", "light")
    const request = toWireRequest(state, buildQuestionCatalog())
    const clarification = request.questions[NEEDS_CLARIFICATION_QUESTION_ID]!
    expect(clarification.type).toBe("noul")
    if (clarification.type === "noul") expect(Object.keys(clarification.criteria).sort()).toEqual(["false", "true"])
  })
})
