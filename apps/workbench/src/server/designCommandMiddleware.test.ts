import { createServer, request as httpRequest } from "node:http"
import type { IncomingMessage, Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { MAX_REQUEST_BODY_BYTES as HANDLER_MAX_REQUEST_BODY_BYTES, handleDesignCommandEvaluate } from "./designCommandHandler"
import { MAX_REQUEST_BODY_BYTES, createDesignCommandMiddleware, toFetchRequest, workbenchOrigins } from "./designCommandMiddleware"

/**
 * The middleware path end to end over real HTTP: Node request -> `createDesignCommandMiddleware` -> the real handler,
 * with a recording upstream `fetch`. Proves the original headers survive the middleware, so the handler's
 * provenance rules hold for actual requests, and that every rejection makes zero upstream calls.
 */
const upstream = vi.fn(async () => new Response(JSON.stringify({ answers: {} }), { status: 200 }))
const COMMAND = JSON.stringify({ commandText: "make it denser", activeMode: "light" })

let server: Server
let workbenchOrigin: string

beforeAll(async () => {
  const middleware = createDesignCommandMiddleware({
    // As in vite.config.ts: derived from the listening address, so this test's ephemeral port is the trusted one.
    trustedOrigins: () => workbenchOrigins([`http://127.0.0.1:${(server.address() as AddressInfo).port}/`]),
    handle: (request, trustedOrigins) =>
      handleDesignCommandEvaluate(request, { TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY: "product-sentinel-value" }, upstream as unknown as typeof fetch, trustedOrigins),
  })
  server = createServer((req, res) => void middleware(req, res))
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  workbenchOrigin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

beforeEach(() => upstream.mockClear())

/** A raw HTTP request, so headers (including duplicates) arrive exactly as a browser or attacker would send them. A
 * raw header list gets no defaults from Node, so `Host` and `Content-Length` are added here. */
function post(headers: [string, string][], body = COMMAND, method = "POST"): Promise<{ status: number; text: string }> {
  const raw = [["Host", new URL(workbenchOrigin).host], ["Content-Length", String(Buffer.byteLength(body))], ...headers].flat()
  return new Promise((resolve, reject) => {
    const req = httpRequest(`${workbenchOrigin}/api/design-command/evaluate`, { method, headers: raw as unknown as Record<string, string>, agent: false }, (res) => {
      let text = ""
      res.on("error", reject)
      res.setEncoding("utf8")
      res.on("data", (chunk: string) => (text += chunk))
      res.on("end", () => resolve({ status: res.statusCode!, text }))
    })
    req.on("error", reject)
    req.end(body)
  })
}

const workbenchHeaders = (): [string, string][] => [
  ["Origin", workbenchOrigin],
  ["Sec-Fetch-Site", "same-origin"],
  ["Content-Type", "application/json"],
]

async function expectRejected(headers: [string, string][], status: number, code: string, body?: string) {
  const response = await post(headers, body)
  expect(upstream).not.toHaveBeenCalled()
  expect(response.status).toBe(status)
  expect(JSON.parse(response.text).outcome).toEqual({ kind: "rejected", reason: { code } })
}

describe("Design Command middleware over HTTP", () => {
  it("passes the Workbench's headers through, so its request reaches the one upstream call", async () => {
    const response = await post(workbenchHeaders())
    expect(response.status).toBe(200)
    expect(upstream).toHaveBeenCalledTimes(1)
  })

  it("rejects a hostile cross-site text/plain post with zero upstream calls", async () => {
    await expectRejected(
      [
        ["Origin", "https://attacker.example"],
        ["Sec-Fetch-Site", "cross-site"],
        ["Sec-Fetch-Mode", "no-cors"],
        ["Content-Type", "text/plain;charset=UTF-8"],
      ],
      403,
      "design-command.untrusted-origin"
    )
  })

  it("rejects a foreign-origin JSON request with zero upstream calls", async () => {
    await expectRejected([["Origin", "http://localhost:5173"], ["Sec-Fetch-Site", "cross-site"], ["Content-Type", "application/json"]], 403, "design-command.untrusted-origin")
  })

  it("rejects conflicting origin and fetch metadata with zero upstream calls", async () => {
    await expectRejected([["Origin", workbenchOrigin], ["Sec-Fetch-Site", "cross-site"], ["Content-Type", "application/json"]], 403, "design-command.cross-site-request")
    // A second Origin header is combined into one value, which is never a trusted origin.
    await expectRejected([...workbenchHeaders(), ["Origin", "https://attacker.example"]], 403, "design-command.untrusted-origin")
  })

  it("fails closed with zero upstream calls when Origin or the JSON media type is missing", async () => {
    await expectRejected([["Content-Type", "application/json"]], 403, "design-command.missing-origin")
    await expectRejected([["Origin", workbenchOrigin], ["Sec-Fetch-Site", "same-origin"]], 415, "design-command.unsupported-media-type")
  })

  it("keeps the body limit and the method check ahead of the handler", async () => {
    // The middleware answers 413 and then destroys the request, so the client may read the 413 or see the reset first.
    const oversized = await post(workbenchHeaders(), "x".repeat(MAX_REQUEST_BODY_BYTES + 1)).catch((error: NodeJS.ErrnoException) => error.code ?? String(error))
    expect(upstream).not.toHaveBeenCalled()
    if (typeof oversized === "string") expect(oversized).toBe("ECONNRESET")
    else expect([oversized.status, JSON.parse(oversized.text).outcome.reason.code]).toEqual([413, "design-command.request-too-large"])
    const get = await post(workbenchHeaders(), "", "GET")
    expect(get.status).toBe(405)
    expect(upstream).not.toHaveBeenCalled()
    expect(MAX_REQUEST_BODY_BYTES).toBe(HANDLER_MAX_REQUEST_BODY_BYTES)
  })
})

describe("toFetchRequest", () => {
  it("keeps every request header except connection and framing headers", () => {
    const req = {
      headers: { host: "127.0.0.1:5173" },
      rawHeaders: ["Host", "127.0.0.1:5173", "Origin", "http://127.0.0.1:5173", "Sec-Fetch-Site", "same-origin", "Content-Type", "application/json", "Content-Length", "52", "Connection", "keep-alive", "Transfer-Encoding", "chunked", "X-Probe", "a", "X-Probe", "b"],
    } as unknown as IncomingMessage
    const request = toFetchRequest(req, Buffer.from(COMMAND))
    expect(Object.fromEntries(request.headers)).toEqual({
      host: "127.0.0.1:5173",
      origin: "http://127.0.0.1:5173",
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
      "x-probe": "a, b",
    })
  })
})

describe("workbenchOrigins", () => {
  it("follows the dev server's resolved loopback URLs, whatever host and port it is configured with", () => {
    expect(workbenchOrigins(["http://127.0.0.1:5174/"])).toEqual(["http://127.0.0.1:5174"])
    expect(workbenchOrigins(["http://localhost:3000/base/", "http://localhost:3000/"])).toEqual(["http://localhost:3000"])
    expect(workbenchOrigins(["https://[::1]:5173/"])).toEqual(["https://[::1]:5173"])
    expect(workbenchOrigins([])).toEqual([])
  })
})
