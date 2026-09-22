import { describe, expect, it } from "vitest"
import { evaluateContextRequest, OPERATION_MAX_BYTES, principlesFor, toCanonicalJson, validateTheme } from "../index"

const get = async (resource: string) => {
  const result = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "get", theme: "quiet-editorial", resource })
  if (!result.ok) throw new Error("expected ok")
  if (result.operation !== "get") throw new Error("expected get")
  return result
}

describe("context get (ACR-03)", () => {
  it.each(["button", "field", "input", "native-select", "responsive-dialog"])("returns full targeted context for %s", async (resource) => {
    const result = await get(resource)

    expect(validateTheme(result.theme).ok).toBe(true)
    expect(result.theme.id).toBe("quiet-editorial")

    expect(result.resource.id).toBe(resource)
    for (const field of [
      "purpose", "use", "avoid", "variants", "responsiveBehavior", "accessibility",
      "composition", "examples", "mistakes", "mobileReplacement", "constraints",
    ] as const) {
      expect(Object.hasOwn(result.resource, field)).toBe(true)
    }

    expect(result.provenance.theme.sourceId).toContain("theme/fixtures/valid.json")
    expect(result.provenance.resource.sourceId).toContain(`data/${resource}.ts`)
    expect(result.provenance.theme.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(result.provenance.resource.sha256).toMatch(/^[0-9a-f]{64}$/)

    expect(result.capabilitiesSummary).toEqual({
      mutationSchemaVersion: "1.0",
      proposalSchemaVersion: "1.0",
      operationCount: 6,
      maxProposalOperations: 8,
    })
  })

  it("declares the mobile replacement for the responsive pattern", async () => {
    const result = await get("responsive-dialog")
    expect(result.resource.mobileReplacement).toMatch(/Drawer/)
  })

  it("includes principles only when a real, sourced one applies, never an empty array", async () => {
    const button = await get("button")
    expect(button.principles).toEqual([
      {
        id: "personal-system.button-hierarchy-form-density-restraint",
        text: "Button hierarchy, form behavior, information density principles, and restraint rules.",
        sourceId: "BRIEF.md#design-boundaries-personal-system-owns",
        sha256: "42ed4903ed878594b5926842951aaf3c5456b0c0c1c4c11c2b0ef8b5e928d5d0",
      },
    ])
    expect(button.principles!.length).toBeGreaterThan(0)
  })

  it("omits the principles field entirely (not an empty array) when no sourced principle applies", () => {
    expect(principlesFor("no-such-resource")).toBeUndefined()
  })

  it("does not require or invent principles for the admitted form resources", async () => {
    expect((await get("field")).principles).toBeUndefined()
    expect((await get("native-select")).principles).toBeUndefined()
  })

  it("stays within the 32 KiB get ceiling for every pilot", async () => {
    for (const resource of ["button", "field", "input", "native-select", "responsive-dialog"]) {
      const result = await get(resource)
      const bytes = new TextEncoder().encode(toCanonicalJson(result)).length
      expect(bytes).toBeLessThanOrEqual(OPERATION_MAX_BYTES.get)
    }
  })

  it("is byte-identical across repeated in-process evaluations", async () => {
    const first = toCanonicalJson(await get("button"))
    const second = toCanonicalJson(await get("button"))
    expect(first).toBe(second)
  })

  it("retrieving one resource does not embed another pilot's id in its payload", async () => {
    const result = await get("button")
    const serialized = toCanonicalJson(result)
    expect(serialized).not.toContain('"id":"input"')
    expect(serialized).not.toContain('"id":"responsive-dialog"')
    expect(serialized).not.toContain('"id":"field"')
    expect(serialized).not.toContain('"id":"native-select"')
  })
})
