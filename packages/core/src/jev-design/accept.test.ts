import { describe, expect, it } from "vitest"
import { acceptAnswers } from "./accept"
import type { ChoiceQuestion, NoulQuestion, ScoreQuestion, TypeSafeAnswer } from "./wire"

const choiceQ: ChoiceQuestion = { id: "c", type: "choice", instructions: "x", options: [{ id: "a", description: "a" }, { id: "b", description: "b" }] }
const scoreQ: ScoreQuestion = { id: "s", type: "score", instructions: "x", scale: ["low", "mid", "high"] }
const noulQ: NoulQuestion = { id: "n", type: "noul", instructions: "x", criteria: { true: "t", false: "f" } }

const answers = (map: Record<string, TypeSafeAnswer>) => ({ answers: map })

describe("acceptAnswers", () => {
  it("accepts a well-formed batch", () => {
    const result = acceptAnswers(
      [choiceQ, scoreQ, noulQ],
      answers({
        c: { type: "choice", selected: "a", probabilities: { a: 0.7, b: 0.3 }, confidence: 0.9 },
        s: { type: "score", level: 1, legend: ["low", "mid", "high"], confidence: 0.8 },
        n: { type: "noul", value: 0.9 },
      })
    )
    expect(result.ok).toBe(true)
  })

  it("rejects the whole batch if one answer is missing (no partial credit)", () => {
    const result = acceptAnswers([choiceQ, scoreQ], answers({ c: { type: "choice", selected: "a", probabilities: { a: 1, b: 0 }, confidence: 0.9 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.missing-answer")
  })

  it("rejects an answer for a question that was not asked", () => {
    const result = acceptAnswers([choiceQ], answers({ c: { type: "choice", selected: "a", probabilities: { a: 1, b: 0 }, confidence: 0.9 }, extra: { type: "noul", value: 1 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.ruleId === "accept.unknown-answer")).toBe(true)
  })

  it("rejects a Choice option that was not offered", () => {
    const result = acceptAnswers([choiceQ], answers({ c: { type: "choice", selected: "zzz", probabilities: { a: 1, b: 0 }, confidence: 0.9 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toEqual({ ruleId: "accept.choice-not-offered", path: "c" })
  })

  it("rejects a Choice whose selected option is not the probability max", () => {
    const result = acceptAnswers([choiceQ], answers({ c: { type: "choice", selected: "a", probabilities: { a: 0.2, b: 0.8 }, confidence: 0.9 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.choice-not-max")
  })

  it("rejects a Choice below the fixed 0.5 confidence floor", () => {
    const result = acceptAnswers([choiceQ], answers({ c: { type: "choice", selected: "a", probabilities: { a: 1, b: 0 }, confidence: 0.49 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.choice-confidence")
  })

  it("a Choice at exactly the fixed floor is accepted by acceptAnswers but not `decided` under the product margin", () => {
    const result = acceptAnswers([choiceQ], answers({ c: { type: "choice", selected: "a", probabilities: { a: 1, b: 0 }, confidence: 0.5 } }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.answers.c).toMatchObject({ decided: false })
  })

  it("a Choice at or above the product margin is decided", () => {
    const result = acceptAnswers([choiceQ], answers({ c: { type: "choice", selected: "a", probabilities: { a: 1, b: 0 }, confidence: 0.6 } }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.answers.c).toMatchObject({ decided: true })
  })

  it("rejects a Score legend that does not exactly match the declared scale", () => {
    const result = acceptAnswers([scoreQ], answers({ s: { type: "score", level: 0, legend: ["Low", "mid", "high"], confidence: 0.9 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.legend-mismatch")
  })

  it("rejects a Score level out of range", () => {
    const result = acceptAnswers([scoreQ], answers({ s: { type: "score", level: 3, legend: ["low", "mid", "high"], confidence: 0.9 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.score-range")
  })

  it("rejects a Noul exactly at 0.5 (unresolved)", () => {
    const result = acceptAnswers([noulQ], answers({ n: { type: "noul", value: 0.5 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.noul-unresolved")
  })

  it("a Noul inside the product margin (e.g. 0.51) is accepted but not decided", () => {
    const result = acceptAnswers([noulQ], answers({ n: { type: "noul", value: 0.51 } }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.answers.n).toMatchObject({ decided: false })
  })

  it("a Noul outside the margin is decided, with sign carrying the boolean", () => {
    const yes = acceptAnswers([noulQ], answers({ n: { type: "noul", value: 0.9 } }))
    const no = acceptAnswers([noulQ], answers({ n: { type: "noul", value: 0.1 } }))
    expect(yes.ok && yes.answers.n).toMatchObject({ decided: true, decidedTrue: true })
    expect(no.ok && no.answers.n).toMatchObject({ decided: true, decidedTrue: false })
  })

  it("rejects a primitive-mismatched answer", () => {
    const result = acceptAnswers([choiceQ], answers({ c: { type: "noul", value: 0.9 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]!.ruleId).toBe("accept.primitive-mismatch")
  })

  it("rejects a malformed response body", () => {
    // @ts-expect-error deliberately malformed
    const result = acceptAnswers([choiceQ], { answers: null })
    expect(result.ok).toBe(false)
  })
})
