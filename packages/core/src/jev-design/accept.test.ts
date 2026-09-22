import { describe, expect, it } from "vitest"
import { acceptAnswers } from "./accept"
import type { InternalChoiceQuestion, InternalNoulQuestion, InternalScoreQuestion } from "./questions"

const choiceQ: InternalChoiceQuestion = { id: "c", type: "choice", instructions: "x", options: [{ id: "a", description: "a" }, { id: "b", description: "b" }] }
const scoreQ: InternalScoreQuestion = { id: "s", type: "score", instructions: "x", scale: ["low", "mid", "high"] }
const noulQ: InternalNoulQuestion = { id: "n", type: "noul", instructions: "x", criteria: { true: "t", false: "f" } }

const answers = (map: Record<string, unknown>) => ({ answers: map })

describe("acceptAnswers", () => {
  it("accepts a well-formed batch using the real raw wire shapes, including the required type discriminator", () => {
    const result = acceptAnswers(
      [choiceQ, scoreQ, noulQ],
      answers({
        c: { type: "choice", choice: "a", probabilities: { a: 0.7, b: 0.3 }, confidence: 0.9 },
        s: { type: "score", score: 1, legend: { "0": "low", "1": "mid", "2": "high" }, probabilities: { "0": 0.1, "1": 0.8, "2": 0.1 }, confidence: 0.8 },
        n: { type: "noul", noul: 0.9 },
      })
    )
    expect(result.ok).toBe(true)
  })

  it("accepts a fractional Score value", () => {
    const result = acceptAnswers(
      [scoreQ],
      answers({ s: { type: "score", score: 1.4, legend: { "0": "low", "1": "mid", "2": "high" }, probabilities: { "0": 0.1, "1": 0.7, "2": 0.2 }, confidence: 0.8 } })
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.answers.s).toMatchObject({ score: 1.4, label: "mid" })
  })

  it("rejects the whole batch if one answer is missing (no partial credit)", () => {
    const result = acceptAnswers([choiceQ, scoreQ], answers({ c: { type: "choice", choice: "a", probabilities: { a: 1, b: 0 }, confidence: 0.9 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.missing-answer")
  })

  it("rejects an answer for a question that was not asked", () => {
    const result = acceptAnswers([choiceQ], answers({ c: { type: "choice", choice: "a", probabilities: { a: 1, b: 0 }, confidence: 0.9 }, extra: { type: "noul", noul: 1 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.ruleId === "accept.unknown-answer")).toBe(true)
  })

  describe("required type discriminator", () => {
    it("rejects an answer with a missing type field", () => {
      const result = acceptAnswers([choiceQ], answers({ c: { choice: "a", probabilities: { a: 1, b: 0 }, confidence: 0.9 } }))
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors[0]).toEqual({ ruleId: "accept.primitive-mismatch", path: "c" })
    })

    it("rejects an answer whose type is an unrecognized primitive", () => {
      const result = acceptAnswers([choiceQ], answers({ c: { type: "boolean", choice: "a", probabilities: { a: 1, b: 0 }, confidence: 0.9 } }))
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors[0]).toEqual({ ruleId: "accept.primitive-mismatch", path: "c" })
    })

    it("rejects an answer whose type does not match the primitive the question was asked as (Score body for a Choice question)", () => {
      const result = acceptAnswers(
        [choiceQ],
        answers({ c: { type: "score", score: 0, legend: { "0": "x" }, probabilities: { "0": 1 }, confidence: 0.9 } })
      )
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors[0]).toEqual({ ruleId: "accept.primitive-mismatch", path: "c" })
    })

    it("rejects a Noul answer mismatched as commandKind's Choice type", () => {
      const result = acceptAnswers([noulQ], answers({ n: { type: "choice", choice: "a", probabilities: { a: 1 }, confidence: 0.9 } }))
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors[0]).toEqual({ ruleId: "accept.primitive-mismatch", path: "n" })
    })

    it("rejects an answer with an extra unexpected field alongside a correct type as malformed, not primitive-mismatch", () => {
      const result = acceptAnswers([noulQ], answers({ n: { type: "noul", noul: 0.9, confidence: 0.9 } }))
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors[0]).toEqual({ ruleId: "accept.malformed-answer", path: "n" })
    })
  })

  it("rejects a Choice option that was not offered", () => {
    const result = acceptAnswers([choiceQ], answers({ c: { type: "choice", choice: "zzz", probabilities: { a: 1, b: 0 }, confidence: 0.9 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toEqual({ ruleId: "accept.choice-not-offered", path: "c" })
  })

  it("rejects a Choice whose selected option is not the probability max", () => {
    const result = acceptAnswers([choiceQ], answers({ c: { type: "choice", choice: "a", probabilities: { a: 0.2, b: 0.8 }, confidence: 0.9 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.choice-not-max")
  })

  it("rejects a Choice below the fixed 0.5 confidence floor", () => {
    const result = acceptAnswers([choiceQ], answers({ c: { type: "choice", choice: "a", probabilities: { a: 1, b: 0 }, confidence: 0.49 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.choice-confidence")
  })

  it("rejects Choice probabilities with an extra or missing option key", () => {
    const extra = acceptAnswers([choiceQ], answers({ c: { type: "choice", choice: "a", probabilities: { a: 0.5, b: 0.3, zzz: 0.2 }, confidence: 0.9 } }))
    const missing = acceptAnswers([choiceQ], answers({ c: { type: "choice", choice: "a", probabilities: { a: 1 }, confidence: 0.9 } }))
    expect(extra.ok).toBe(false)
    expect(missing.ok).toBe(false)
    if (!extra.ok) expect(extra.errors[0]!.ruleId).toBe("accept.choice-probability-keys")
    if (!missing.ok) expect(missing.errors[0]!.ruleId).toBe("accept.choice-probability-keys")
  })

  it("rejects Choice probabilities that do not sum to one within tolerance", () => {
    const result = acceptAnswers([choiceQ], answers({ c: { type: "choice", choice: "a", probabilities: { a: 0.5, b: 0.2 }, confidence: 0.9 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.choice-probability-sum")
  })

  it("accepts Choice probabilities within the small floating-point sum tolerance", () => {
    const result = acceptAnswers([choiceQ], answers({ c: { type: "choice", choice: "a", probabilities: { a: 0.6, b: 0.41 }, confidence: 0.9 } }))
    expect(result.ok).toBe(true)
  })

  it("a Choice at exactly the fixed floor is accepted by acceptAnswers but not `decided` under the product margin", () => {
    const result = acceptAnswers([choiceQ], answers({ c: { type: "choice", choice: "a", probabilities: { a: 1, b: 0 }, confidence: 0.5 } }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.answers.c).toMatchObject({ decided: false })
  })

  it("a Choice at or above the product margin is decided", () => {
    const result = acceptAnswers([choiceQ], answers({ c: { type: "choice", choice: "a", probabilities: { a: 1, b: 0 }, confidence: 0.6 } }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.answers.c).toMatchObject({ decided: true })
  })

  it("rejects a Score legend that does not exactly match the declared scale", () => {
    const result = acceptAnswers(
      [scoreQ],
      answers({ s: { type: "score", score: 0, legend: { "0": "Low", "1": "mid", "2": "high" }, probabilities: { "0": 1, "1": 0, "2": 0 }, confidence: 0.9 } })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.score-legend-mismatch")
  })

  it("rejects a Score legend keyed by the wrong index set", () => {
    const result = acceptAnswers(
      [scoreQ],
      answers({ s: { type: "score", score: 0, legend: { "1": "low", "2": "mid", "3": "high" }, probabilities: { "0": 1, "1": 0, "2": 0 }, confidence: 0.9 } })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.score-legend-mismatch")
  })

  it("rejects Score probabilities with an extra or missing index key", () => {
    const result = acceptAnswers(
      [scoreQ],
      answers({ s: { type: "score", score: 0, legend: { "0": "low", "1": "mid", "2": "high" }, probabilities: { "0": 1, "1": 0 }, confidence: 0.9 } })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.score-probability-keys")
  })

  it("rejects Score probabilities that do not sum to one", () => {
    const result = acceptAnswers(
      [scoreQ],
      answers({ s: { type: "score", score: 0, legend: { "0": "low", "1": "mid", "2": "high" }, probabilities: { "0": 0.5, "1": 0.1, "2": 0.1 }, confidence: 0.9 } })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.score-probability-sum")
  })

  it("rejects a Score level out of range", () => {
    const result = acceptAnswers(
      [scoreQ],
      answers({ s: { type: "score", score: 3, legend: { "0": "low", "1": "mid", "2": "high" }, probabilities: { "0": 1, "1": 0, "2": 0 }, confidence: 0.9 } })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.score-range")
  })

  it("rejects a Noul exactly at 0.5 (unresolved)", () => {
    const result = acceptAnswers([noulQ], answers({ n: { type: "noul", noul: 0.5 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.noul-unresolved")
  })

  it("a Noul inside the product margin (e.g. 0.51) is accepted but not decided", () => {
    const result = acceptAnswers([noulQ], answers({ n: { type: "noul", noul: 0.51 } }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.answers.n).toMatchObject({ decided: false })
  })

  it("a Noul outside the margin is decided, with sign carrying the boolean", () => {
    const yes = acceptAnswers([noulQ], answers({ n: { type: "noul", noul: 0.9 } }))
    const no = acceptAnswers([noulQ], answers({ n: { type: "noul", noul: 0.1 } }))
    expect(yes.ok && yes.answers.n).toMatchObject({ decided: true, decidedTrue: true })
    expect(no.ok && no.answers.n).toMatchObject({ decided: true, decidedTrue: false })
  })

  it("rejects a malformed response body", () => {
    const result = acceptAnswers([choiceQ], { answers: null } as unknown as ReturnType<typeof answers>)
    expect(result.ok).toBe(false)
  })
})
