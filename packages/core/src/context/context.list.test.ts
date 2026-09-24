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

    expect(result.themes).toEqual([
      { id: "default", name: "Default", revision: 1 },
      { id: "quiet-editorial", name: "Quiet Editorial", revision: 1 },
    ])

    expect(result.resources).toEqual([
      { id: "button", kind: "component", purpose: "Trigger a single, clearly named action or navigation." },
      { id: "card", kind: "component", purpose: "Group related panel content — a title, description, body, and actions — inside one bordered surface." },
      {
        id: "chart",
        kind: "component",
        purpose: "Show a small quantitative series as a themed Recharts chart with an equivalent text summary and keyboard-reachable values.",
      },
      {
        id: "collapsible",
        kind: "component",
        purpose: "Show or hide one secondary region of related controls or content behind a single named disclosure trigger, keeping a dense panel scannable.",
      },
      {
        id: "combobox",
        kind: "component",
        purpose: "Choose one value from a longer fixed list by typing to filter it, with full keyboard and pointer selection.",
      },
      { id: "field", kind: "pattern", purpose: "Compose a label, control, description, and validation message as one accessible form field." },
      { id: "input", kind: "component", purpose: "Capture a single line of user-entered text or a native input type." },
      { id: "native-select", kind: "component", purpose: "Choose one value from a small, fixed set with the platform native select control." },
      { id: "resizable-panel", kind: "pattern", purpose: "Divide a desktop workspace into bounded panels with an accessible pointer and keyboard separator." },
      {
        id: "responsive-dialog",
        kind: "pattern",
        purpose: "Present focused, blocking content as a centered Dialog on wide viewports and a bottom Drawer on narrow ones.",
      },
      {
        id: "select",
        kind: "component",
        purpose: "Choose one value from a short, fixed set when options need richer presentation or grouping than a native select allows.",
      },
      { id: "single-toggle-group", kind: "pattern", purpose: "Choose exactly one option from a small, bounded, always-visible set." },
      {
        id: "slider",
        kind: "component",
        purpose: "Adjust one bounded numeric value by dragging or with the keyboard, when the relative position within a known range matters more than typing an exact figure.",
      },
      {
        id: "switch",
        kind: "component",
        purpose:
          "Toggle a single boolean setting on or off. The visible on/off state always updates immediately; whether that change is persisted immediately or held for an explicit Save is one commit model declared for the whole surface.",
      },
      { id: "tabs", kind: "component", purpose: "Switch the visible content of one region between a small set of related panels." },
      { id: "textarea", kind: "component", purpose: "Capture multiple lines of free-form user-entered text." },
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
