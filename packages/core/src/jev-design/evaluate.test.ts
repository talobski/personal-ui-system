import { afterEach, describe, expect, it, vi } from "vitest"
import { evaluateDesignCommand } from "./evaluate"
import {
  CATEGORY_DIRECTIONS,
  COMMAND_KIND_OUT_OF_SCOPE,
  COMMAND_KIND_QUESTION_ID,
  COMMAND_KIND_THEME_ADJUSTMENT,
  NEEDS_CLARIFICATION_QUESTION_ID,
  NOT_TARGETED,
  STRENGTH_QUESTION_ID,
  categoryQuestionId,
} from "./questions"
import { buildDesignCommandState } from "./state"
import { TYPESAFE_API_URL, TYPESAFE_MODEL } from "./wire"

type RawAnswer =
  | { type: "choice"; choice: string; probabilities: Record<string, number>; confidence: number }
  | { type: "score"; score: number; legend: Record<string, string>; probabilities: Record<string, number>; confidence: number }
  | { type: "noul"; noul: number }

const SCORE_LEGEND = { "0": "subtle", "1": "moderate", "2": "strong" }

function fullAnswers(overrides: Record<string, RawAnswer> = {}): Record<string, RawAnswer> {
  const answers: Record<string, RawAnswer> = {
    [COMMAND_KIND_QUESTION_ID]: { type: "choice", choice: COMMAND_KIND_THEME_ADJUSTMENT, probabilities: { [COMMAND_KIND_THEME_ADJUSTMENT]: 0.9, [COMMAND_KIND_OUT_OF_SCOPE]: 0.1 }, confidence: 0.9 },
    [STRENGTH_QUESTION_ID]: { type: "score", score: 1, legend: SCORE_LEGEND, probabilities: { "0": 0.1, "1": 0.8, "2": 0.1 }, confidence: 0.9 },
    [NEEDS_CLARIFICATION_QUESTION_ID]: { type: "noul", noul: 0.1 },
  }
  for (const category of Object.keys(categoryQuestionId) as (keyof typeof categoryQuestionId)[]) {
    const { positive, negative } = CATEGORY_DIRECTIONS[category]
    answers[categoryQuestionId[category]] = { type: "choice", choice: NOT_TARGETED, probabilities: { [positive]: 0, [negative]: 0, [NOT_TARGETED]: 1 }, confidence: 0.9 }
  }
  return { ...answers, ...overrides }
}

const okResponse = (answers: Record<string, unknown>) => new Response(JSON.stringify({ answers }), { status: 200, headers: { "content-type": "application/json" } })

const targetedChoice = (selected: string, other1: string, other2: string): RawAnswer => ({
  type: "choice",
  choice: selected,
  probabilities: { [selected]: 0.9, [other1]: 0.05, [other2]: 0.05 },
  confidence: 0.9,
})

afterEach(() => vi.restoreAllMocks())

describe("evaluateDesignCommand", () => {
  it("makes exactly one fetch call to the fixed endpoint, with the product apiKey, fixed model, and questions keyed by id", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => okResponse(fullAnswers()))
    const state = buildDesignCommandState("nothing in particular", "light")
    await evaluateDesignCommand(state, { apiKey: "sentinel-product-key", fetch: fetchMock as unknown as typeof fetch })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(TYPESAFE_API_URL)
    expect(init?.headers).toMatchObject({ authorization: "Bearer sentinel-product-key" })
    const body = JSON.parse(init?.body as string)
    expect(body.model).toBe(TYPESAFE_MODEL)
    expect(Array.isArray(body.questions)).toBe(false)
    expect(body.questions[COMMAND_KIND_QUESTION_ID]).toBeDefined()
    expect(body.questions[COMMAND_KIND_QUESTION_ID].type).toBe("choice")
  })

  it("makes zero fetches and fails closed when apiKey is missing or empty", async () => {
    const fetchMock = vi.fn()
    const state = buildDesignCommandState("make it rounder", "light")
    const missing = await evaluateDesignCommand(state, { apiKey: "", fetch: fetchMock as unknown as typeof fetch })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(missing).toEqual({ kind: "rejected", reason: { code: "transport.missing-credential" } })
  })

  it("makes zero fetches for empty/whitespace command text", async () => {
    const fetchMock = vi.fn()
    const state = buildDesignCommandState("   ", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(outcome).toEqual({ kind: "rejected", reason: { code: "design-command.empty-text" } })
  })

  it("does not retry: a network error fails closed on the first attempt", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed")
    })
    const state = buildDesignCommandState("make it denser", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(outcome).toEqual({ kind: "rejected", reason: { code: "transport.network" } })
  })

  it("fails closed on a timeout while waiting for the response", async () => {
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))
        })
    )
    const state = buildDesignCommandState("make it denser", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch, timeoutMs: 5 })
    expect(outcome).toEqual({ kind: "rejected", reason: { code: "transport.timeout" } })
  })

  it("fails closed on a timeout while reading a slow response body (the timeout covers body reading, not just headers)", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const signal = init?.signal
      return new Response(
        new ReadableStream({
          start(controller) {
            const abort = () => {
              controller.error(Object.assign(new Error("aborted"), { name: "AbortError" }))
            }
            if (signal?.aborted) return abort()
            signal?.addEventListener("abort", abort)
            // Never enqueues or closes: simulates a response whose headers arrived but whose body stalls forever.
          },
        }),
        { status: 200 }
      )
    })
    const state = buildDesignCommandState("make it denser", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch, timeoutMs: 20 })
    expect(outcome).toEqual({ kind: "rejected", reason: { code: "transport.timeout" } })
  })

  it.each([
    [401, "transport.unauthorized"],
    [429, "transport.rate-limited"],
    [529, "transport.overloaded"],
    [500, "transport.http-error"],
  ])("maps HTTP %d to %s", async (status, code) => {
    const fetchMock = vi.fn(async () => new Response("", { status }))
    const state = buildDesignCommandState("make it denser", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome).toMatchObject({ kind: "rejected", reason: { code } })
  })

  it("fails closed on malformed (non-JSON) response bodies", async () => {
    const fetchMock = vi.fn(async () => new Response("not json", { status: 200 }))
    const state = buildDesignCommandState("make it denser", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome).toEqual({ kind: "rejected", reason: { code: "transport.malformed-response" } })
  })

  it("fails closed on an oversized response", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ answers: {}, padding: "x".repeat(64 * 1024) }), { status: 200 }))
    const state = buildDesignCommandState("make it denser", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome).toEqual({ kind: "rejected", reason: { code: "transport.oversized-response" } })
  })

  it("fails closed on an incomplete answer set", async () => {
    const answers = fullAnswers()
    delete answers[STRENGTH_QUESTION_ID]
    const fetchMock = vi.fn(async () => okResponse(answers))
    const state = buildDesignCommandState("make it denser", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome).toMatchObject({ kind: "rejected", reason: { code: "accept.missing-answer" } })
  })

  it("fails closed when an answer's required type field is missing", async () => {
    const fetchMock = vi.fn(async () => okResponse(fullAnswers({ [STRENGTH_QUESTION_ID]: { score: 1, legend: SCORE_LEGEND, probabilities: { "0": 0.1, "1": 0.8, "2": 0.1 }, confidence: 0.9 } as unknown as RawAnswer })))
    const state = buildDesignCommandState("make the radius exactly 12px", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome).toMatchObject({ kind: "rejected", reason: { code: "accept.primitive-mismatch" } })
  })

  it("fails closed when an answer's type field does not match the primitive its question was asked as (Noul type for the Score question)", async () => {
    const fetchMock = vi.fn(async () => okResponse(fullAnswers({ [STRENGTH_QUESTION_ID]: { type: "noul", noul: 0.9 } })))
    const state = buildDesignCommandState("make it denser", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome).toMatchObject({ kind: "rejected", reason: { code: "accept.primitive-mismatch" } })
  })

  it("resolves unsupported for off-topic commands with no confidently targeted category", async () => {
    const fetchMock = vi.fn(async () => okResponse(fullAnswers()))
    const state = buildDesignCommandState("what's the weather like today", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome).toMatchObject({ kind: "unsupported", cause: "no-category-targeted" })
  })

  it("resolves staged with a proper operation for a clean single-category command", async () => {
    const fetchMock = vi.fn(async () => okResponse(fullAnswers({ [categoryQuestionId.motion]: targetedChoice("faster", "slower", "notTargeted") })))
    const state = buildDesignCommandState("make transitions feel snappier", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome).toMatchObject({ kind: "staged", operations: [{ op: "setMotionDuration", value: "100ms" }] })
  })

  it("resolves staged with two operations for a legitimate multi-category command ('make it denser and warmer')", async () => {
    const fetchMock = vi.fn(async () =>
      okResponse(
        fullAnswers({
          [categoryQuestionId.density]: targetedChoice("denser", "looser", "notTargeted"),
          [categoryQuestionId.color]: targetedChoice("warmer", "cooler", "notTargeted"),
        })
      )
    )
    const state = buildDesignCommandState("make it denser and warmer", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome.kind).toBe("staged")
    if (outcome.kind === "staged") expect(outcome.operations.map((op) => op.op).sort()).toEqual(["setColor", "setDensity"])
  })

  it("resolves clarification-required (ambiguous) for a genuinely contradictory command, never a silent best-guess", async () => {
    const fetchMock = vi.fn(async () =>
      okResponse(
        fullAnswers({
          [categoryQuestionId.radius]: targetedChoice("rounder", "sharper", "notTargeted"),
          [NEEDS_CLARIFICATION_QUESTION_ID]: { type: "noul", noul: 0.9 },
        })
      )
    )
    const state = buildDesignCommandState("make the corners rounder but also sharper", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome).toMatchObject({ kind: "clarification-required", cause: "ambiguous" })
  })

  it("resolves clarification-required when commandKind is accepted but undecided, never staging", async () => {
    const fetchMock = vi.fn(async () =>
      okResponse(
        fullAnswers({
          [COMMAND_KIND_QUESTION_ID]: {
            type: "choice",
            choice: COMMAND_KIND_THEME_ADJUSTMENT,
            probabilities: { [COMMAND_KIND_THEME_ADJUSTMENT]: 0.55, [COMMAND_KIND_OUT_OF_SCOPE]: 0.45 },
            confidence: 0.55,
          },
          [categoryQuestionId.radius]: targetedChoice("rounder", "sharper", "notTargeted"),
        })
      )
    )
    const state = buildDesignCommandState("make it rounder maybe", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome).toMatchObject({ kind: "clarification-required", cause: "command-kind-undecided" })
  })

  it("resolves clarification-required when needsClarification is accepted but undecided, never staging", async () => {
    const fetchMock = vi.fn(async () =>
      okResponse(
        fullAnswers({
          [categoryQuestionId.radius]: targetedChoice("rounder", "sharper", "notTargeted"),
          [NEEDS_CLARIFICATION_QUESTION_ID]: { type: "noul", noul: 0.55 },
        })
      )
    )
    const state = buildDesignCommandState("make it rounder, unsure how much", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome).toMatchObject({ kind: "clarification-required", cause: "needs-clarification-undecided" })
  })
})
