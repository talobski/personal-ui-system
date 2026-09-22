import { describe, expect, it } from "vitest"
import { OPERATION_MAX_BYTES, serializeWithCeiling } from "./serialize"

describe("context size ceilings (ACR-06)", () => {
  it.each(["list", "get", "capabilities"] as const)("accepts a %s payload exactly at the ceiling and rejects one byte over", (operation) => {
    const ceiling = OPERATION_MAX_BYTES[operation]
    const overhead = JSON.stringify({ v: "" }).length
    const atCeiling = { v: "x".repeat(ceiling - overhead) }
    const overCeiling = { v: "x".repeat(ceiling - overhead + 1) }

    const atResult = serializeWithCeiling(operation, atCeiling)
    expect(atResult.ok).toBe(true)
    if (atResult.ok) expect(new TextEncoder().encode(atResult.json).length).toBe(ceiling)

    expect(serializeWithCeiling(operation, overCeiling)).toEqual({ ok: false })
  })

  it("fails closed rather than truncating: no json field is present on an oversize result", () => {
    const result = serializeWithCeiling("list", { v: "x".repeat(OPERATION_MAX_BYTES.list) })
    expect(result).toEqual({ ok: false })
    expect("json" in result).toBe(false)
  })
})
