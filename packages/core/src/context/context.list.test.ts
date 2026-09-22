import { describe, expect, it } from "vitest"
import { compareCodeUnits, evaluateContextRequest, OPERATION_MAX_BYTES, toCanonicalJson } from "../index"

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
      { id: "button", kind: "component", purpose: "Trigger a single, clearly named action or navigation." },
      { id: "field", kind: "pattern", purpose: "Compose a label, control, description, and validation message as one accessible form field." },
      { id: "input", kind: "component", purpose: "Capture a single line of user-entered text or a native input type." },
      { id: "native-select", kind: "component", purpose: "Choose one value from a small, fixed set with the platform native select control." },
      {
        id: "responsive-dialog",
        kind: "pattern",
        purpose: "Present focused, blocking content as a centered Dialog on wide viewports and a bottom Drawer on narrow ones.",
      },
    ])
  })

  it("sorts themes and resources by id, using explicit code-unit order (ACR-05)", async () => {
    const result = await list()
    expect(result.themes.map((t) => t.id)).toEqual([...result.themes.map((t) => t.id)].sort(compareCodeUnits))
    expect(result.resources.map((r) => r.id)).toEqual([...result.resources.map((r) => r.id)].sort(compareCodeUnits))
  })

  it("sources every resource's purpose verbatim from its own validated contract", async () => {
    const result = await list()
    const button = result.resources.find((r) => r.id === "button")
    expect(button?.purpose).toBe("Trigger a single, clearly named action or navigation.")
  })

  it("identifies Field and NativeSelect with their admitted public kinds", async () => {
    const result = await list()
    expect(result.resources.find((resource) => resource.id === "field")?.kind).toBe("pattern")
    expect(result.resources.find((resource) => resource.id === "native-select")?.kind).toBe("component")
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
