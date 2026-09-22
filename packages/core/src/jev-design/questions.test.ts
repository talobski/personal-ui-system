import { describe, expect, it } from "vitest"
import {
  COMMAND_KIND_QUESTION_ID,
  DESIGN_CATEGORIES,
  NEEDS_CLARIFICATION_QUESTION_ID,
  STRENGTH_QUESTION_ID,
  buildQuestionCatalog,
  buildTypeSafeRequest,
  categoryQuestionId,
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
})

describe("buildTypeSafeRequest", () => {
  it("sends only state plus the fixed catalog, using the fixed model", () => {
    const state = buildDesignCommandState("make it denser", "light")
    const request = buildTypeSafeRequest(state)
    expect(request.model).toBe(TYPESAFE_MODEL)
    expect(request.state).toEqual(state)
    expect(request.questions).toEqual(buildQuestionCatalog())
  })
})
