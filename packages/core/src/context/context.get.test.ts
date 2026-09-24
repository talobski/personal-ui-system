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
      operationCount: 11,
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

describe("context get serves Theme v2 (TSV2-01)", () => {
  it.each(["default", "quiet-editorial"])("returns canonical v2 %s with v2 identity and fixture provenance", async (theme) => {
    const result = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "get", theme, resource: "responsive-dialog" })
    if (!result.ok || result.operation !== "get") throw new Error("expected get")
    expect(result.identity.themeSchemaVersion).toBe("2.0")
    expect(result.theme.schemaVersion).toBe("2.0")
    expect(result.theme.id).toBe(theme)
    expect(validateTheme(result.theme)).toEqual({ ok: true, theme: result.theme })
    expect(result.provenance.theme.sourceId).toBe(theme === "default" ? "packages/core/src/theme/fixtures/default.json" : "packages/core/src/theme/fixtures/valid.json")
    expect(new TextEncoder().encode(toCanonicalJson(result)).length).toBeLessThanOrEqual(OPERATION_MAX_BYTES.get)
  })
})

describe("Slider and Collapsible retrieval (TSV2-08, TSV2-09, TSV2-14)", () => {
  it.each(["slider", "collapsible"])("retrieves %s alone, deterministically, with its kind and provenance", async (resource) => {
    const request = { version: "personal-ui-context/1", operation: "get", theme: "default", resource }
    const [first, second] = [await evaluateContextRequest(request), await evaluateContextRequest(request)]
    expect(toCanonicalJson(first)).toBe(toCanonicalJson(second))
    if (!first.ok || first.operation !== "get") throw new Error("expected get")
    expect(first.resource.id).toBe(resource)
    expect(first.provenance.resource.sourceId).toBe(`packages/core/src/contracts/data/${resource}.ts`)
    expect(first.resource.constraints.map((c) => c.id.split(".")[0])).toContain(resource)
    const other = resource === "slider" ? "collapsible" : "slider"
    expect(toCanonicalJson(first.resource)).not.toContain(`"id":"${other}"`)
    const list = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "list" })
    if (!list.ok || list.operation !== "list") throw new Error("expected list")
    expect(list.resources).toHaveLength(16)
    expect(list.resources.find((r) => r.id === resource)?.kind).toBe("component")
  })
})

describe("Select, Combobox, and Chart retrieval (WCPR-04, WCPR-05, WCPR-11, WCPR-15)", () => {
  it.each(["select", "combobox", "chart"])("retrieves %s alone, deterministically, with its kind, constraints, and provenance", async (resource) => {
    const request = { version: "personal-ui-context/1", operation: "get", theme: "default", resource }
    const [first, second] = [await evaluateContextRequest(request), await evaluateContextRequest(request)]
    expect(toCanonicalJson(first)).toBe(toCanonicalJson(second))
    if (!first.ok || first.operation !== "get") throw new Error("expected get")
    expect(first.resource.id).toBe(resource)
    expect(first.provenance.resource.sourceId).toBe(`packages/core/src/contracts/data/${resource}.ts`)
    expect(first.resource.constraints.map((c) => c.id.split(".")[0])).toEqual(first.resource.constraints.map(() => resource))
    for (const other of ["select", "combobox", "chart"].filter((id) => id !== resource)) expect(toCanonicalJson(first.resource)).not.toContain(`"id":"${other}"`)
    const list = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "list" })
    if (!list.ok || list.operation !== "list") throw new Error("expected list")
    expect(list.resources).toHaveLength(16)
    expect(list.resources.find((r) => r.id === resource)?.kind).toBe("component")
  })
})
