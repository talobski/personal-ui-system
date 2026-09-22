import { describe, expect, it } from "vitest"
import { evaluateContextRequest } from "../index"

describe("context request validation (ACR-07)", () => {
  it("rejects a non-object request", async () => {
    expect(await evaluateContextRequest(null)).toEqual({ ok: false, errors: [{ ruleId: "context.invalid-request", path: "" }] })
    expect(await evaluateContextRequest("list")).toEqual({ ok: false, errors: [{ ruleId: "context.invalid-request", path: "" }] })
  })

  it("rejects an unsupported version", async () => {
    const result = await evaluateContextRequest({ version: "personal-ui-context/2", operation: "list" })
    expect(result).toEqual({ ok: false, errors: [{ ruleId: "context.unsupported-version", path: "version" }] })
  })

  it("rejects an unsupported operation", async () => {
    const result = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "delete" })
    expect(result).toEqual({ ok: false, errors: [{ ruleId: "context.unsupported-operation", path: "operation" }] })
  })

  it("rejects an unknown field on every operation", async () => {
    const list = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "list", extra: true })
    expect(list).toEqual({ ok: false, errors: [{ ruleId: "context.unknown-field", path: "extra" }] })

    const capabilities = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "capabilities", theme: "quiet-editorial" })
    expect(capabilities).toEqual({ ok: false, errors: [{ ruleId: "context.unknown-field", path: "theme" }] })

    const get = await evaluateContextRequest({
      version: "personal-ui-context/1",
      operation: "get",
      theme: "quiet-editorial",
      resource: "button",
      css: "body { color: red }",
    })
    expect(get).toEqual({ ok: false, errors: [{ ruleId: "context.unknown-field", path: "css" }] })
  })

  it("rejects get with a missing theme or resource", async () => {
    const missingBoth = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "get" })
    expect(missingBoth).toEqual({
      ok: false,
      errors: [
        { ruleId: "context.invalid-request", path: "theme" },
        { ruleId: "context.invalid-request", path: "resource" },
      ],
    })
  })

  it("rejects an unknown theme id, prototype-chain names included", async () => {
    for (const theme of ["nope", "__proto__", "constructor", "toString"]) {
      const result = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "get", theme, resource: "button" })
      expect(result).toEqual({ ok: false, errors: [{ ruleId: "context.unknown-theme", path: "theme" }] })
    }
  })

  it("rejects an unknown resource id, prototype-chain names included", async () => {
    for (const resource of ["nope", "__proto__", "constructor", "toString"]) {
      const result = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "get", theme: "quiet-editorial", resource })
      expect(result).toEqual({ ok: false, errors: [{ ruleId: "context.unknown-resource", path: "resource" }] })
    }
  })

  it("rejects an empty theme or resource as a malformed request, not an unknown lookup", async () => {
    const emptyTheme = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "get", theme: "", resource: "button" })
    expect(emptyTheme).toEqual({ ok: false, errors: [{ ruleId: "context.invalid-request", path: "theme" }] })
    const emptyResource = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "get", theme: "quiet-editorial", resource: "" })
    expect(emptyResource).toEqual({ ok: false, errors: [{ ruleId: "context.invalid-request", path: "resource" }] })
  })

  it("never returns a partial context: a theme error preempts a resource error", async () => {
    const result = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "get", theme: "nope", resource: "nope" })
    expect(result).toEqual({ ok: false, errors: [{ ruleId: "context.unknown-theme", path: "theme" }] })
    expect(Object.keys(result)).toEqual(["ok", "errors"])
  })
})
