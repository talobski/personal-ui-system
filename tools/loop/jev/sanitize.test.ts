import { describe, expect, it } from "vitest"
import { MAX_DEPTH, REDACTED, isSensitiveKey, redactString, sanitize } from "./sanitize.ts"

const clean = (input: unknown, options = {}) => {
  const result = sanitize(input, options)
  if (!result.ok) throw new Error(result.message)
  return result.value
}

describe("sanitize", () => {
  it("redacts credential-named keys recursively, including inside arrays", () => {
    const out = clean({
      apiKey: "a",
      nested: { Authorization: "Bearer abcdefghij", list: [{ password: "p", ok: 1 }, { "x-api-key": "k" }] },
      cookie: { session: "s" },
      client_secret: "c",
      privateKey: "pk",
      accessToken: "t",
      keep: "value",
    })
    expect(out).toEqual({
      apiKey: REDACTED,
      nested: { Authorization: REDACTED, list: [{ password: REDACTED, ok: 1 }, { "x-api-key": REDACTED }] },
      cookie: REDACTED,
      client_secret: REDACTED,
      privateKey: REDACTED,
      accessToken: REDACTED,
      keep: "value",
    })
  })

  it("does not treat lookalike words as credentials", () => {
    for (const key of ["author", "authority", "keyword", "monkey", "tokenizer", "secretary"]) expect(isSensitiveKey(key)).toBe(false)
    for (const key of ["token", "accessToken", "API_KEY", "x-api-key", "Set-Cookie", "passwords"]) expect(isSensitiveKey(key)).toBe(true)
  })

  it("keeps numeric token counters but redacts string tokens", () => {
    expect(clean({ tokenBudget: 5000, tokens: 12, token: "abc", secretCount: 3 })).toEqual({
      tokenBudget: 5000,
      tokens: 12,
      token: REDACTED,
      secretCount: REDACTED,
    })
  })

  it("redacts secret-shaped strings and known secret literals anywhere", () => {
    const out = clean(
      {
        note: "curl -H 'Authorization: Bearer abcdef123456' https://x",
        url: "https://user:hunter2@example.com/path",
        gh: "ghp_abcdefghijklmnopqrstuvwxyz0123",
        sk: "sk-abcdefghijklmnopqrstuvwx",
        jwt: "eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.abcdefghijk123",
        aws: "AKIAABCDEFGHIJKLMNOP",
        literal: "value tsk_live_XYZ leaked",
        [`key-tsk_live_XYZ`]: "v",
      },
      { secrets: ["tsk_live_XYZ"] },
    )
    const text = JSON.stringify(out)
    for (const leaked of ["abcdef123456", "hunter2", "ghp_abc", "sk-abc", "eyJhbGci", "AKIAABC", "tsk_live_XYZ"]) expect(text).not.toContain(leaked)
    expect(text).toContain(REDACTED)
  })

  it("fails instead of truncating when nesting is too deep", () => {
    let deep: Record<string, unknown> = { leaf: 1 }
    for (let i = 0; i < MAX_DEPTH + 1; i++) deep = { a: deep }
    expect(sanitize(deep).ok).toBe(false)
    let ok: Record<string, unknown> = { leaf: 1 }
    for (let i = 0; i < MAX_DEPTH - 1; i++) ok = { a: ok }
    expect(sanitize(ok).ok).toBe(true)
  })

  it("fails when serialized size exceeds the bound", () => {
    const result = sanitize({ blob: "x".repeat(200) }, { maxBytes: 100 })
    expect(result).toMatchObject({ ok: false })
    expect(sanitize({ blob: "x".repeat(50) }, { maxBytes: 100 }).ok).toBe(true)
  })

  it("rejects non-JSON values and cycles instead of passing them through", () => {
    expect(sanitize({ n: Number.NaN }).ok).toBe(false)
    expect(sanitize({ n: Number.POSITIVE_INFINITY }).ok).toBe(false)
    expect(sanitize({ f: () => 1 }).ok).toBe(false)
    expect(sanitize({ b: 1n }).ok).toBe(false)
    expect(sanitize({ d: new Date() }).ok).toBe(false)
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(sanitize(cyclic).ok).toBe(false)
  })

  it("keeps __proto__ as an inert own key", () => {
    const out = clean(JSON.parse('{"__proto__": {"polluted": true}, "a": 1}')) as Record<string, unknown>
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(Object.keys(out)).toContain("__proto__")
  })

  it("redactString is idempotent", () => {
    const once = redactString("password=hunter2 Bearer abcdefghij")
    expect(redactString(once)).toBe(once)
  })
})
