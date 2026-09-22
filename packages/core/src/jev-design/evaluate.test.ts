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
import type { TypeSafeAnswer } from "./wire"

function fullAnswers(overrides: Record<string, TypeSafeAnswer> = {}): Record<string, TypeSafeAnswer> {
  const answers: Record<string, TypeSafeAnswer> = {
    [COMMAND_KIND_QUESTION_ID]: { type: "choice", selected: COMMAND_KIND_THEME_ADJUSTMENT, probabilities: { [COMMAND_KIND_THEME_ADJUSTMENT]: 0.9, [COMMAND_KIND_OUT_OF_SCOPE]: 0.1 }, confidence: 0.9 },
    [STRENGTH_QUESTION_ID]: { type: "score", level: 1, legend: ["subtle", "moderate", "strong"], confidence: 0.9 },
    [NEEDS_CLARIFICATION_QUESTION_ID]: { type: "noul", value: 0.1 },
  }
  for (const category of Object.keys(categoryQuestionId) as (keyof typeof categoryQuestionId)[]) {
    const { positive, negative } = CATEGORY_DIRECTIONS[category]
    answers[categoryQuestionId[category]] = {
      type: "choice",
      selected: NOT_TARGETED,
      probabilities: { [positive]: 0, [negative]: 0, [NOT_TARGETED]: 1 },
      confidence: 0.9,
    }
  }
  return { ...answers, ...overrides }
}

const okResponse = (answers: Record<string, TypeSafeAnswer>) => new Response(JSON.stringify({ answers }), { status: 200, headers: { "content-type": "application/json" } })

afterEach(() => vi.restoreAllMocks())

describe("evaluateDesignCommand", () => {
  it("makes exactly one fetch call to the fixed endpoint, with the product apiKey and fixed model", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => okResponse(fullAnswers()))
    const state = buildDesignCommandState("nothing in particular", "light")
    await evaluateDesignCommand(state, { apiKey: "sentinel-product-key", fetch: fetchMock as unknown as typeof fetch })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(TYPESAFE_API_URL)
    expect(init?.headers).toMatchObject({ authorization: "Bearer sentinel-product-key" })
    const body = JSON.parse(init?.body as string)
    expect(body.model).toBe(TYPESAFE_MODEL)
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
    const fetchMock = vi.fn(async () => { throw new TypeError("fetch failed") })
    const state = buildDesignCommandState("make it denser", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(outcome).toEqual({ kind: "rejected", reason: { code: "transport.network" } })
  })

  it("fails closed on a timeout/abort", async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))
    }))
    const state = buildDesignCommandState("make it denser", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch, timeoutMs: 5 })
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

  it("fails closed on primitive mismatch (numeric arithmetic jaggedness never bypasses typed answers)", async () => {
    const fetchMock = vi.fn(async () => okResponse(fullAnswers({ [STRENGTH_QUESTION_ID]: { type: "noul", value: 0.9 } })))
    const state = buildDesignCommandState("make the radius exactly 12px", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome).toMatchObject({ kind: "rejected", reason: { code: "accept.primitive-mismatch" } })
  })

  it("resolves unsupported for off-topic commands with no confidently targeted category", async () => {
    const fetchMock = vi.fn(async () => okResponse(fullAnswers()))
    const state = buildDesignCommandState("what's the weather like today", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome.kind).toBe("unsupported")
  })

  it("resolves staged with a proper operation for a clean single-category command", async () => {
    const fetchMock = vi.fn(async () => okResponse(fullAnswers({ [categoryQuestionId.motion]: { type: "choice", selected: "faster", probabilities: { faster: 0.9, slower: 0.05, notTargeted: 0.05 }, confidence: 0.9 } })))
    const state = buildDesignCommandState("make transitions feel snappier", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome).toMatchObject({ kind: "staged", operations: [{ op: "setMotionDuration", value: "100ms" }] })
  })

  it("resolves clarification-required for a compound command rather than a silent best-guess", async () => {
    const fetchMock = vi.fn(async () =>
      okResponse(
        fullAnswers({
          [categoryQuestionId.density]: { type: "choice", selected: "denser", probabilities: { denser: 0.9, looser: 0.05, notTargeted: 0.05 }, confidence: 0.9 },
          [categoryQuestionId.color]: { type: "choice", selected: "warmer", probabilities: { warmer: 0.9, cooler: 0.05, notTargeted: 0.05 }, confidence: 0.9 },
          [NEEDS_CLARIFICATION_QUESTION_ID]: { type: "noul", value: 0.9 },
        })
      )
    )
    const state = buildDesignCommandState("make it denser and warmer", "light")
    const outcome = await evaluateDesignCommand(state, { apiKey: "k", fetch: fetchMock as unknown as typeof fetch })
    expect(outcome.kind).toBe("clarification-required")
  })
})
