import { describe, expect, it } from "vitest"
import { evaluateContextRequest, OPERATION_MAX_BYTES, toCanonicalJson } from "../index"

const LIST = { version: "personal-ui-context/1", operation: "list" } as const

const list = async () => {
  const result = await evaluateContextRequest(LIST)
  if (!result.ok) throw new Error("expected ok")
  if (result.operation !== "list") throw new Error("expected list")
  return result
}

describe("context list (ACR-02)", () => {
  it("returns design-system identity and stable sorted summaries", async () => {
    const result = await list()
    expect(result.identity.system).toBe("personal-ui-system")
    expect(result.identity.contextSchemaVersion).toBe("personal-ui-context/1")

    expect(result.themes).toEqual([{ id: "quiet-editorial", name: "Quiet Editorial", revision: 1 }])

    expect(result.resources).toEqual([
      { id: "button", kind: "component" },
      { id: "input", kind: "component" },
      { id: "responsive-dialog", kind: "pattern" },
    ])
  })

  it("sorts themes and resources by id", async () => {
    const result = await list()
    expect(result.themes.map((t) => t.id)).toEqual([...result.themes.map((t) => t.id)].sort())
    expect(result.resources.map((r) => r.id)).toEqual([...result.resources.map((r) => r.id)].sort())
  })

  it("stays within the 8 KiB list ceiling", async () => {
    const result = await list()
    const bytes = new TextEncoder().encode(toCanonicalJson(result)).length
    expect(bytes).toBeLessThanOrEqual(OPERATION_MAX_BYTES.list)
  })

  it("is byte-identical across repeated in-process evaluations", async () => {
    const first = toCanonicalJson(await evaluateContextRequest(LIST))
    const second = toCanonicalJson(await evaluateContextRequest(LIST))
    expect(first).toBe(second)
  })
})
