import { describe, expect, it } from "vitest"
import { applyMutation, evaluateContextRequest, getValidatedTheme, stageProposal, createProposalSession, validateComponentState } from "../index"

/**
 * ACR-11: proves a fresh agent can do everything the retrieval surface claims to support, using only the public
 * context API plus core's already-existing mutation/proposal API — no test-only backdoor or hidden scaffolding.
 */
describe("fresh-agent-verifiable path (ACR-11)", () => {
  it("selects a component from list, then retrieves its full targeted context from get", async () => {
    const list = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "list" })
    if (!list.ok) throw new Error("expected ok")
    if (list.operation !== "list") throw new Error("expected list")
    const chosen = list.resources.find((resource) => resource.id === "responsive-dialog")
    expect(chosen?.id).toBe("responsive-dialog")

    const context = await evaluateContextRequest({
      version: "personal-ui-context/1",
      operation: "get",
      theme: list.themes[0]!.id,
      resource: chosen!.id,
    })
    if (!context.ok) throw new Error("expected ok")
    if (context.operation !== "get") throw new Error("expected get")

    // Responsive and accessibility obligations are directly readable, not inferred.
    expect(context.resource.responsiveBehavior.length).toBeGreaterThan(0)
    expect(context.resource.accessibility.length).toBeGreaterThan(0)
    expect(context.resource.mobileReplacement).toMatch(/Drawer/)
  })

  it("identifies an unsupported composition from the contract's own avoid/mistakes fields", async () => {
    const context = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "get", theme: "quiet-editorial", resource: "button" })
    if (!context.ok) throw new Error("expected ok")
    if (context.operation !== "get") throw new Error("expected get")
    const unsupported = [...context.resource.avoid, ...context.resource.mistakes]
    expect(unsupported.some((line) => /nesting an interactive element/i.test(line))).toBe(true)
  })

  it("selects Field plus NativeSelect, reads their duties, and validates the admitted structured state", async () => {
    const list = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "list" })
    if (!list.ok || list.operation !== "list") throw new Error("expected list")
    expect(list.resources.map((resource) => resource.id)).toEqual([
      "button",
      "card",
      "field",
      "input",
      "native-select",
      "resizable-panel",
      "responsive-dialog",
      "single-toggle-group",
      "switch",
      "tabs",
      "textarea",
    ])
    const [field, nativeSelect] = await Promise.all(["field", "native-select"].map((resource) => evaluateContextRequest({ version: "personal-ui-context/1", operation: "get", theme: "quiet-editorial", resource })))
    if (!field.ok || field.operation !== "get" || !nativeSelect.ok || nativeSelect.operation !== "get") throw new Error("expected get")
    expect(field.resource.composition.join(" ")).toMatch(/NativeSelect/)
    expect(nativeSelect.resource.accessibility.join(" ")).toMatch(/keyboard|focus/i)
    expect(nativeSelect.resource.avoid.join(" ")).toMatch(/custom combobox|listbox/i)
    const state = {
      kind: "field-composition", orientation: "responsive", label: { kind: "visible", text: "Country", htmlFor: "country" }, descriptionId: null,
      control: { kind: "native-select", id: "country", disabled: false, invalid: true, error: { id: "country-error", message: "Choose a country." }, ariaDescribedBy: ["country-error"], mobileTextPx: 16, options: [{ label: "Philippines", value: "ph" }], value: "ph" },
    }
    expect(validateComponentState(state)).toEqual({ ok: true, state })
    const invalid = validateComponentState({ ...state, control: { ...state.control, ariaDescribedBy: [] } })
    expect(invalid).toEqual(expect.objectContaining({ ok: false }))
    if (!invalid.ok) expect(invalid.issues).toContainEqual({ ruleId: "native-select.error-association", path: "control.ariaDescribedBy" })
  })

  it("stages one valid existing proposal, built only from capabilities-described operations, and core accepts it", async () => {
    const capabilities = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "capabilities" })
    if (!capabilities.ok) throw new Error("expected ok")
    if (capabilities.operation !== "capabilities") throw new Error("expected capabilities")
    const setColor = capabilities.mutation.operations.find((op) => op.name === "setColor")
    expect(setColor).toBeDefined()

    const theme = getValidatedTheme("quiet-editorial")!
    const session = createProposalSession()
    const result = stageProposal(
      session,
      theme,
      {
        schemaVersion: "1.0",
        proposalId: "acr11-fresh-agent-proposal",
        base: { themeId: theme.id, revision: theme.revision },
        provenance: { source: "fixture", sourceId: "acr11-test", createdAt: "2026-01-01T00:00:00Z" },
        operations: [{ op: "setColor", mode: "light", token: "primary", value: "oklch(0.4 0.05 260)" }],
      },
      "2026-01-01T00:00:00Z"
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.staged.candidate.modes.light.color.primary.$value).toBe("oklch(0.4 0.05 260)")
  })

  it("rejects an arbitrary CSS/path operation, exactly as capabilities documents as unsupported", async () => {
    const capabilities = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "capabilities" })
    if (!capabilities.ok) throw new Error("expected ok")
    if (capabilities.operation !== "capabilities") throw new Error("expected capabilities")
    expect(capabilities.unsupported.some((line) => /CSS/.test(line))).toBe(true)
    expect(capabilities.mutation.operations.some((op) => op.name === "setCss")).toBe(false)

    const theme = getValidatedTheme("quiet-editorial")!
    const result = applyMutation(theme, {
      schemaVersion: "1.0",
      requestId: "acr11-css-escape",
      base: { themeId: theme.id, revision: theme.revision },
      operations: [{ op: "setCss", path: "/etc/passwd", value: "body { color: red }" }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.ruleId === "mutation.unknown-operation")).toBe(true)
  })
})
