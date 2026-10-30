import { describe, expect, it, vi } from "vitest"
import { DESIGN_COMMAND_ROUTE, PRODUCT_CREDENTIAL_ENV_VAR, handleDesignCommandEvaluate } from "./designCommandHandler"

const GENERIC_ENV_VAR = "TYPESAFE_API_KEY"
const WORKBENCH_ORIGIN = "http://127.0.0.1:5173"
const TRUSTED = [WORKBENCH_ORIGIN]
const WORKBENCH_HEADERS = { origin: WORKBENCH_ORIGIN, "sec-fetch-site": "same-origin", "content-type": "application/json" }
const COMMAND = JSON.stringify({ commandText: "make it denser", activeMode: "light" })

const rawRequest = (headers: Record<string, string>, body = COMMAND) =>
  new Request(`${WORKBENCH_ORIGIN}${DESIGN_COMMAND_ROUTE}`, { method: "POST", headers, body })
const request = (body: unknown) => rawRequest(WORKBENCH_HEADERS, JSON.stringify(body))

const fullAnswers = () => {
  // Minimal valid answer set is exercised by packages/core tests; this suite only needs the transport call to
  // actually happen (or not), so a 200 with an empty answers object is enough to prove/disprove "zero fetches".
  return new Response(JSON.stringify({ answers: {} }), { status: 200 })
}

describe("handleDesignCommandEvaluate — credential isolation (mandatory)", () => {
  it("1) product key absent, generic sentinel present -> fails closed with zero fetches", async () => {
    const fetchMock = vi.fn(async () => fullAnswers())
    const env = { [GENERIC_ENV_VAR]: "generic-sentinel-value" }
    const response = await handleDesignCommandEvaluate(request({ commandText: "make it denser", activeMode: "light" }), env, fetchMock as unknown as typeof fetch, TRUSTED)
    expect(fetchMock).not.toHaveBeenCalled()
    const payload = await response.json()
    expect(payload.outcome).toEqual({ kind: "rejected", reason: { code: "transport.missing-credential" } })
  })

  it("2) product key plus generic sentinel present -> outbound Authorization uses only the product sentinel", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>
      expect(headers.authorization).toBe("Bearer product-sentinel-value")
      expect(headers.authorization).not.toContain("generic-sentinel-value")
      return fullAnswers()
    })
    const env = {
      TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY: "product-sentinel-value",
      [GENERIC_ENV_VAR]: "generic-sentinel-value",
    }
    await handleDesignCommandEvaluate(request({ commandText: "make it denser", activeMode: "light" }), env, fetchMock as unknown as typeof fetch, TRUSTED)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("3) product key absent with no admissible product credential -> stable product-level failure, no proposal staged, no theme mutation", async () => {
    const fetchMock = vi.fn(async () => fullAnswers())
    const response = await handleDesignCommandEvaluate(request({ commandText: "make it denser", activeMode: "light" }), {}, fetchMock as unknown as typeof fetch, TRUSTED)
    expect(fetchMock).not.toHaveBeenCalled()
    const payload = await response.json()
    expect(payload.outcome.kind).toBe("rejected")
    // "no proposal staged, no theme mutation" is structural: the response body contains no `operations`, `theme`,
    // `proposal`, or `revision` field at all when rejected.
    expect(Object.keys(payload.outcome)).toEqual(["kind", "reason"])
  })

  it(`never reads ${GENERIC_ENV_VAR}, even when the product key is present`, async () => {
    const seen: string[] = []
    const env = new Proxy(
      { TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY: "product-sentinel-value", [GENERIC_ENV_VAR]: "generic-sentinel-value" },
      { get(target, prop: string) { seen.push(prop); return (target as Record<string, string>)[prop] } }
    )
    const fetchMock = vi.fn(async () => fullAnswers())
    await handleDesignCommandEvaluate(request({ commandText: "make it denser", activeMode: "light" }), env, fetchMock as unknown as typeof fetch, TRUSTED)
    expect(seen).not.toContain(GENERIC_ENV_VAR)
    expect(seen).toContain(PRODUCT_CREDENTIAL_ENV_VAR)
  })

  it("no credential sentinel ever appears in the response body, on any outcome", async () => {
    const fetchMock = vi.fn(async () => new Response("not json", { status: 200 }))
    const env = { TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY: "product-sentinel-value", [GENERIC_ENV_VAR]: "generic-sentinel-value" }
    const response = await handleDesignCommandEvaluate(request({ commandText: "make it denser", activeMode: "light" }), env, fetchMock as unknown as typeof fetch, TRUSTED)
    const text = await response.text()
    expect(text).not.toContain("product-sentinel-value")
    expect(text).not.toContain("generic-sentinel-value")
  })
})

describe("handleDesignCommandEvaluate — request handling", () => {
  it("rejects non-POST methods", async () => {
    const response = await handleDesignCommandEvaluate(new Request("http://127.0.0.1:5173" + DESIGN_COMMAND_ROUTE, { method: "GET" }), {}, vi.fn() as unknown as typeof fetch, TRUSTED)
    expect(response.status).toBe(405)
  })

  it("rejects malformed JSON bodies without ever checking the credential", async () => {
    const env = { TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY: "product-sentinel-value" }
    const response = await handleDesignCommandEvaluate(
      rawRequest(WORKBENCH_HEADERS, "{not json"),
      env,
      vi.fn() as unknown as typeof fetch,
      TRUSTED
    )
    expect(response.status).toBe(400)
  })

  it("rejects an empty command with zero fetches", async () => {
    const fetchMock = vi.fn(async () => fullAnswers())
    const env = { TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY: "product-sentinel-value" }
    const response = await handleDesignCommandEvaluate(request({ commandText: "   ", activeMode: "light" }), env, fetchMock as unknown as typeof fetch, TRUSTED)
    expect(fetchMock).not.toHaveBeenCalled()
    const payload = await response.json()
    expect(payload.outcome).toEqual({ kind: "rejected", reason: { code: "design-command.empty-text" } })
  })

  it("rejects an oversized request body with zero fetches", async () => {
    const fetchMock = vi.fn(async () => fullAnswers())
    const env = { TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY: "product-sentinel-value" }
    const response = await handleDesignCommandEvaluate(
      request({ commandText: "make it denser", activeMode: "light", padding: "x".repeat(16 * 1024) }),
      env,
      fetchMock as unknown as typeof fetch,
      TRUSTED
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(response.status).toBe(413)
    const payload = await response.json()
    expect(payload.outcome).toEqual({ kind: "rejected", reason: { code: "design-command.request-too-large" } })
  })
})

describe("handleDesignCommandEvaluate — request provenance", () => {
  const env = { TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY: "product-sentinel-value" }

  async function evaluate(req: Request, trustedOrigins: readonly string[] = TRUSTED, evaluateEnv: Record<string, string> = env) {
    const fetchMock = vi.fn(async () => fullAnswers())
    const response = await handleDesignCommandEvaluate(req, evaluateEnv, fetchMock as unknown as typeof fetch, trustedOrigins)
    return { response, fetchMock }
  }

  async function expectRejected(req: Request, status: number, code: string, trustedOrigins: readonly string[] = TRUSTED) {
    const { response, fetchMock } = await evaluate(req, trustedOrigins)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(response.status).toBe(status)
    expect((await response.json()).outcome).toEqual({ kind: "rejected", reason: { code } })
  }

  it("accepts the Workbench's own JSON request and makes the one upstream call", async () => {
    const { fetchMock } = await evaluate(rawRequest(WORKBENCH_HEADERS))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("accepts a trusted request without fetch metadata, and a JSON media type with parameters", async () => {
    const { fetchMock } = await evaluate(rawRequest({ origin: WORKBENCH_ORIGIN, "content-type": "Application/JSON; charset=utf-8" }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("rejects a hostile cross-site text/plain post (no preflight needed) with zero fetches", async () => {
    await expectRejected(rawRequest({ origin: "https://attacker.example", "sec-fetch-site": "cross-site", "content-type": "text/plain;charset=UTF-8" }), 403, "design-command.untrusted-origin")
  })

  it("rejects a foreign-origin JSON request, including another loopback origin Vite's CORS allows", async () => {
    for (const origin of ["https://attacker.example", "http://localhost:5173", "http://127.0.0.1:5174", "null"]) {
      await expectRejected(rawRequest({ ...WORKBENCH_HEADERS, origin, "sec-fetch-site": "cross-site" }), 403, "design-command.untrusted-origin")
    }
  })

  it("rejects conflicting origin and fetch metadata with zero fetches", async () => {
    for (const site of ["cross-site", "same-site", "none"]) {
      await expectRejected(rawRequest({ ...WORKBENCH_HEADERS, "sec-fetch-site": site }), 403, "design-command.cross-site-request")
    }
    // Fetch metadata claiming same-origin never vouches for a foreign Origin.
    await expectRejected(rawRequest({ ...WORKBENCH_HEADERS, origin: "https://attacker.example" }), 403, "design-command.untrusted-origin")
  })

  it("rejects a non-JSON body from the trusted origin with zero fetches", async () => {
    for (const contentType of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data; boundary=x", "application/jsonp"]) {
      await expectRejected(rawRequest({ ...WORKBENCH_HEADERS, "content-type": contentType }), 415, "design-command.unsupported-media-type")
    }
  })

  it("fails closed when headers are missing", async () => {
    const { origin: _origin, ...withoutOrigin } = WORKBENCH_HEADERS
    await expectRejected(rawRequest(withoutOrigin), 403, "design-command.missing-origin")
    await expectRejected(rawRequest({}), 403, "design-command.missing-origin")
    const { "content-type": _contentType, ...withoutContentType } = WORKBENCH_HEADERS
    // A string body defaults to text/plain, so remove it explicitly to test a request with no media type at all.
    const noMediaType = rawRequest(withoutContentType)
    noMediaType.headers.delete("content-type")
    await expectRejected(noMediaType, 415, "design-command.unsupported-media-type")
  })

  it("trusts nothing when no Workbench origin is known, and never a combined Origin value", async () => {
    await expectRejected(rawRequest(WORKBENCH_HEADERS), 403, "design-command.untrusted-origin", [])
    const doubled = new Headers(WORKBENCH_HEADERS)
    doubled.append("origin", "https://attacker.example")
    await expectRejected(new Request(`${WORKBENCH_ORIGIN}${DESIGN_COMMAND_ROUTE}`, { method: "POST", headers: doubled, body: COMMAND }), 403, "design-command.untrusted-origin")
  })

  it("answers an untrusted request identically whether or not a credential is configured", async () => {
    const hostile = () => rawRequest({ origin: "https://attacker.example", "content-type": "text/plain" })
    const configured = await evaluate(hostile(), TRUSTED, env)
    const unconfigured = await evaluate(hostile(), TRUSTED, {})
    expect(configured.response.status).toBe(unconfigured.response.status)
    expect(await configured.response.text()).toBe(await unconfigured.response.text())
  })
})
