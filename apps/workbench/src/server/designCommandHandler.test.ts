import { describe, expect, it, vi } from "vitest"
import { DESIGN_COMMAND_ROUTE, PRODUCT_CREDENTIAL_ENV_VAR, handleDesignCommandEvaluate } from "./designCommandHandler"

const LOOP_ENV_VAR = "TYPESAFE_LOOP_ENGINEERING_API_KEY"
const GENERIC_ENV_VAR = "TYPESAFE_API_KEY"

const request = (body: unknown) =>
  new Request(`http://127.0.0.1:5173${DESIGN_COMMAND_ROUTE}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })

const fullAnswers = () => {
  // Minimal valid answer set is exercised by packages/core tests; this suite only needs the transport call to
  // actually happen (or not), so a 200 with an empty answers object is enough to prove/disprove "zero fetches".
  return new Response(JSON.stringify({ answers: {} }), { status: 200 })
}

describe("handleDesignCommandEvaluate — credential isolation (mandatory)", () => {
  it("1) product key absent, Loop and generic sentinels present -> fails closed with zero fetches", async () => {
    const fetchMock = vi.fn(async () => fullAnswers())
    const env = { [LOOP_ENV_VAR]: "loop-sentinel-value", [GENERIC_ENV_VAR]: "generic-sentinel-value" }
    const response = await handleDesignCommandEvaluate(request({ commandText: "make it denser", activeMode: "light" }), env, fetchMock as unknown as typeof fetch)
    expect(fetchMock).not.toHaveBeenCalled()
    const payload = await response.json()
    expect(payload.outcome).toEqual({ kind: "rejected", reason: { code: "transport.missing-credential" } })
  })

  it("2) product key plus Loop and generic sentinels present -> outbound Authorization uses only the product sentinel", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>
      expect(headers.authorization).toBe("Bearer product-sentinel-value")
      expect(headers.authorization).not.toContain("loop-sentinel-value")
      expect(headers.authorization).not.toContain("generic-sentinel-value")
      return fullAnswers()
    })
    const env = {
      TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY: "product-sentinel-value",
      [LOOP_ENV_VAR]: "loop-sentinel-value",
      [GENERIC_ENV_VAR]: "generic-sentinel-value",
    }
    await handleDesignCommandEvaluate(request({ commandText: "make it denser", activeMode: "light" }), env, fetchMock as unknown as typeof fetch)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("3) product key absent with no admissible product credential -> stable product-level failure, no proposal staged, no theme mutation", async () => {
    const fetchMock = vi.fn(async () => fullAnswers())
    const response = await handleDesignCommandEvaluate(request({ commandText: "make it denser", activeMode: "light" }), {}, fetchMock as unknown as typeof fetch)
    expect(fetchMock).not.toHaveBeenCalled()
    const payload = await response.json()
    expect(payload.outcome.kind).toBe("rejected")
    // "no proposal staged, no theme mutation" is structural: the response body contains no `operations`, `theme`,
    // `proposal`, or `revision` field at all when rejected.
    expect(Object.keys(payload.outcome)).toEqual(["kind", "reason"])
  })

  it(`never reads ${LOOP_ENV_VAR} or ${GENERIC_ENV_VAR}, even when the product key is present`, async () => {
    const seen: string[] = []
    const env = new Proxy(
      { TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY: "product-sentinel-value", [LOOP_ENV_VAR]: "loop-sentinel-value", [GENERIC_ENV_VAR]: "generic-sentinel-value" },
      { get(target, prop: string) { seen.push(prop); return (target as Record<string, string>)[prop] } }
    )
    const fetchMock = vi.fn(async () => fullAnswers())
    await handleDesignCommandEvaluate(request({ commandText: "make it denser", activeMode: "light" }), env, fetchMock as unknown as typeof fetch)
    expect(seen).not.toContain(LOOP_ENV_VAR)
    expect(seen).not.toContain(GENERIC_ENV_VAR)
    expect(seen).toContain(PRODUCT_CREDENTIAL_ENV_VAR)
  })

  it("no credential sentinel ever appears in the response body, on any outcome", async () => {
    const fetchMock = vi.fn(async () => new Response("not json", { status: 200 }))
    const env = { TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY: "product-sentinel-value", [LOOP_ENV_VAR]: "loop-sentinel-value", [GENERIC_ENV_VAR]: "generic-sentinel-value" }
    const response = await handleDesignCommandEvaluate(request({ commandText: "make it denser", activeMode: "light" }), env, fetchMock as unknown as typeof fetch)
    const text = await response.text()
    expect(text).not.toContain("product-sentinel-value")
    expect(text).not.toContain("loop-sentinel-value")
    expect(text).not.toContain("generic-sentinel-value")
  })
})

describe("handleDesignCommandEvaluate — request handling", () => {
  it("rejects non-POST methods", async () => {
    const response = await handleDesignCommandEvaluate(new Request("http://127.0.0.1:5173" + DESIGN_COMMAND_ROUTE, { method: "GET" }), {}, vi.fn() as unknown as typeof fetch)
    expect(response.status).toBe(405)
  })

  it("rejects malformed JSON bodies without ever checking the credential", async () => {
    const env = { TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY: "product-sentinel-value" }
    const response = await handleDesignCommandEvaluate(
      new Request("http://127.0.0.1:5173" + DESIGN_COMMAND_ROUTE, { method: "POST", body: "{not json" }),
      env,
      vi.fn() as unknown as typeof fetch
    )
    expect(response.status).toBe(400)
  })

  it("rejects an empty command with zero fetches", async () => {
    const fetchMock = vi.fn(async () => fullAnswers())
    const env = { TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY: "product-sentinel-value" }
    const response = await handleDesignCommandEvaluate(request({ commandText: "   ", activeMode: "light" }), env, fetchMock as unknown as typeof fetch)
    expect(fetchMock).not.toHaveBeenCalled()
    const payload = await response.json()
    expect(payload.outcome).toEqual({ kind: "rejected", reason: { code: "design-command.empty-text" } })
  })
})
