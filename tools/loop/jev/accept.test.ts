import { describe, expect, it } from "vitest"
import { acceptAnswer, acceptBatch } from "./accept.ts"
import { choiceAnswer, choiceQuestion, noulAnswer, noulQuestion, scoreAnswer, scoreQuestion } from "./testkit.ts"

const code = (question: Parameters<typeof acceptAnswer>[0], raw: unknown) => {
  const verdict = acceptAnswer(question, raw)
  return verdict.ok ? "ok" : verdict.reason.code
}

describe("Choice acceptance", () => {
  const q = choiceQuestion()
  it("accepts the maximum-probability offered option with confidence >= 0.5", () => {
    const verdict = acceptAnswer(q, choiceAnswer())
    expect(verdict).toMatchObject({ ok: true, answer: { type: "choice", choice: "RESEARCH", confidence: 0.8 } })
  })
  it("accepts a tie when the selection is among the maxima", () => {
    expect(code(q, choiceAnswer("VERIFY", { probabilities: { RESEARCH: 0.45, VERIFY: 0.45, WAIT: 0.1 } }))).toBe("ok")
  })
  it("accepts confidence exactly 0.5 and rejects just below", () => {
    expect(code(q, choiceAnswer("RESEARCH", { confidence: 0.5 }))).toBe("ok")
    expect(code(q, choiceAnswer("RESEARCH", { confidence: 0.4999 }))).toBe("failed.confidence")
  })
  it("rejects an option that was not offered", () => {
    expect(code(q, choiceAnswer("COMPLETE", { probabilities: { COMPLETE: 0.9, RESEARCH: 0.1 } }))).toBe("failed.choice-not-offered")
  })
  it("rejects a selection that is not a maximum", () => {
    expect(code(q, choiceAnswer("VERIFY"))).toBe("failed.choice-not-max")
  })
  it("rejects invalid probabilities", () => {
    for (const p of [{ RESEARCH: 1.2, VERIFY: 0, WAIT: 0 }, { RESEARCH: -0.1 }, { RESEARCH: Number.NaN }, { RESEARCH: "0.9" }, { RESEARCH: 0.9, OTHER: 0.1 }]) {
      expect(code(q, choiceAnswer("RESEARCH", { probabilities: p }))).toBe("failed.probabilities")
    }
    expect(code(q, choiceAnswer("RESEARCH", { probabilities: [0.9] }))).toBe("failed.probabilities")
    expect(code(q, choiceAnswer("RESEARCH", { probabilities: { VERIFY: 0.9 } }))).toBe("failed.probabilities")
  })
  it("rejects malformed confidence and fields", () => {
    for (const confidence of [undefined, "0.9", Number.NaN, 1.5, -1]) {
      expect(code(q, choiceAnswer("RESEARCH", { confidence }))).toBe("failed.malformed-answer")
    }
    expect(code(q, choiceAnswer("RESEARCH", { choice: 3 }))).toBe("failed.malformed-answer")
    expect(code(q, null)).toBe("failed.malformed-answer")
    expect(code(q, "RESEARCH")).toBe("failed.malformed-answer")
  })
  it("rejects a different primitive", () => {
    expect(code(q, noulAnswer())).toBe("failed.primitive-mismatch")
    expect(code(q, { choice: "RESEARCH" })).toBe("failed.primitive-mismatch")
  })
})

describe("Score acceptance", () => {
  const q = scoreQuestion()
  it("accepts a score within range with the exact legend", () => {
    expect(acceptAnswer(q, scoreAnswer())).toMatchObject({ ok: true, answer: { type: "score", score: 1.4 } })
    expect(code(q, scoreAnswer({ score: 0 }))).toBe("ok")
    expect(code(q, scoreAnswer({ score: 2 }))).toBe("ok")
  })
  it("rejects scores outside [0, n-1] or non-finite", () => {
    expect(code(q, scoreAnswer({ score: -0.01 }))).toBe("failed.score-range")
    expect(code(q, scoreAnswer({ score: 2.01 }))).toBe("failed.score-range")
    expect(code(q, scoreAnswer({ score: Number.NaN }))).toBe("failed.malformed-answer")
    expect(code(q, scoreAnswer({ score: "1" }))).toBe("failed.malformed-answer")
  })
  it("rejects legends that differ from the declared scale in any way", () => {
    expect(code(q, scoreAnswer({ legend: { "0": "Trivial", "1": "Moderate" } }))).toBe("failed.legend-mismatch")
    expect(code(q, scoreAnswer({ legend: { "0": "Trivial", "1": "Moderate", "2": "Hard", "3": "Extra" } }))).toBe("failed.legend-mismatch")
    expect(code(q, scoreAnswer({ legend: { "0": "Trivial", "1": "Hard", "2": "Moderate" } }))).toBe("failed.legend-mismatch")
    expect(code(q, scoreAnswer({ legend: { "0": "trivial", "1": "Moderate", "2": "Hard" } }))).toBe("failed.legend-mismatch")
    expect(code(q, scoreAnswer({ legend: ["Trivial", "Moderate", "Hard"] }))).toBe("failed.legend-mismatch")
    expect(code(q, scoreAnswer({ legend: undefined }))).toBe("failed.legend-mismatch")
  })
  it("enforces confidence and probability validity", () => {
    expect(code(q, scoreAnswer({ confidence: 0.49 }))).toBe("failed.confidence")
    expect(code(q, scoreAnswer({ confidence: 0.5 }))).toBe("ok")
    expect(code(q, scoreAnswer({ probabilities: { "0": 2 } }))).toBe("failed.probabilities")
    expect(code(q, scoreAnswer({ probabilities: { "5": 0.1 } }))).toBe("failed.probabilities")
    expect(code(q, scoreAnswer({ probabilities: undefined }))).toBe("failed.probabilities")
  })
  it("rejects a different primitive", () => {
    expect(code(q, choiceAnswer())).toBe("failed.primitive-mismatch")
  })
})

describe("Noul acceptance", () => {
  const q = noulQuestion()
  it("interprets >0.5 as yes and <0.5 as no", () => {
    expect(acceptAnswer(q, noulAnswer(0.51))).toMatchObject({ ok: true, answer: { noul: 0.51, interpretation: "yes" } })
    expect(acceptAnswer(q, noulAnswer(0.49))).toMatchObject({ ok: true, answer: { noul: 0.49, interpretation: "no" } })
    expect(code(q, noulAnswer(0))).toBe("ok")
    expect(code(q, noulAnswer(1))).toBe("ok")
  })
  it("rejects exactly 0.5 as unresolved", () => {
    expect(code(q, noulAnswer(0.5))).toBe("failed.noul-unresolved")
  })
  it("rejects out-of-range, non-finite, and non-numeric values", () => {
    for (const value of [1.01, -0.01, Number.NaN, Number.POSITIVE_INFINITY, "0.9", null, undefined]) {
      expect(code(q, { type: "noul", noul: value })).toBe("failed.malformed-answer")
    }
  })
  it("rejects a different primitive", () => {
    expect(code(q, { noul: 0.9 })).toBe("failed.primitive-mismatch")
    expect(code(q, scoreAnswer())).toBe("failed.primitive-mismatch")
  })
})

describe("composite acceptance", () => {
  const questions = [choiceQuestion(), scoreQuestion(), noulQuestion()]
  it("is usable only when every answer passes, and reports every verdict", () => {
    const good = { next_action: choiceAnswer(), difficulty: scoreAnswer(), human_pref: noulAnswer(0.9) }
    expect(acceptBatch(questions, good)).toMatchObject({ usable: true, firstFailure: null })
    const bad = acceptBatch(questions, { ...good, difficulty: scoreAnswer({ confidence: 0.1 }), human_pref: noulAnswer(0.5) })
    expect(bad.usable).toBe(false)
    expect(bad.firstFailure?.code).toBe("failed.confidence")
    expect(bad.results.human_pref).toMatchObject({ ok: false })
    expect(bad.results.next_action).toMatchObject({ ok: true })
  })
})
