import { describe, expect, it } from "vitest"
import { applyMutation, evaluateContextRequest, getValidatedTheme, toCanonicalJson } from "../index"
import { describeOperations } from "../mutations/mutation"

const LIST = { version: "personal-ui-context/1", operation: "list" } as const
const GET = { version: "personal-ui-context/1", operation: "get", theme: "quiet-editorial", resource: "button" } as const
const CAPABILITIES = { version: "personal-ui-context/1", operation: "capabilities" } as const

describe("adversarial caller mutation cannot alter later output or core validation (ACR-04/05)", () => {
  it("every list/get/capabilities result is deep-frozen: mutation attempts throw, in strict mode", async () => {
    const list = await evaluateContextRequest(LIST)
    const get = await evaluateContextRequest(GET)
    const capabilities = await evaluateContextRequest(CAPABILITIES)
    if (!list.ok || !get.ok || !capabilities.ok) throw new Error("expected ok")
    if (list.operation !== "list" || get.operation !== "get" || capabilities.operation !== "capabilities") throw new Error("wrong shape")

    expect(() => (list.resources as unknown[]).push({ id: "evil", kind: "component", purpose: "x" })).toThrow()
    expect(() => ((list.themes[0] as { name: string }).name = "tampered")).toThrow()

    expect(() => ((get.resource.avoid as unknown[]).length = 0)).toThrow()
    expect(() => ((get.provenance.theme as { sha256: string }).sha256 = "0".repeat(64))).toThrow()
    if (get.principles) expect(() => ((get.principles![0] as { text: string }).text = "tampered")).toThrow()

    expect(() => (capabilities.mutation.operations as unknown[]).push({ name: "setCss", fields: [], valueConstraint: "anything" })).toThrow()
    expect(() => ((capabilities.proposal.lifecycle as { staged: string[] }).staged.push("evil"))).toThrow()
    expect(() => ((capabilities.unsupported as unknown[])[0] = "tampered")).toThrow()
  })

  it("a mutation attempt on one result never changes what a later, identical request returns", async () => {
    const firstList = await evaluateContextRequest(LIST)
    const firstGet = await evaluateContextRequest(GET)
    const firstCapabilities = await evaluateContextRequest(CAPABILITIES)
    if (!firstList.ok || !firstGet.ok || !firstCapabilities.ok) throw new Error("expected ok")
    if (firstList.operation !== "list" || firstGet.operation !== "get" || firstCapabilities.operation !== "capabilities") throw new Error("wrong shape")

    const beforeList = toCanonicalJson(firstList)
    const beforeGet = toCanonicalJson(firstGet)
    const beforeCapabilities = toCanonicalJson(firstCapabilities)

    // Every mutation attempt below either throws (frozen) or is a no-op against a fresh, independent copy; either
    // way it must be unable to change a later call's bytes.
    try {
      (firstList.resources as unknown[]).push({ id: "evil" })
    } catch {
      /* frozen: expected */
    }
    try {
      (firstCapabilities.proposal.provenanceSources as unknown[]).push("evil")
    } catch {
      /* frozen: expected */
    }
    try {
      (firstGet.theme.colors.light.primary as { $value: string }).$value = "oklch(0 0 0)"
    } catch {
      /* frozen: expected */
    }

    expect(toCanonicalJson(await evaluateContextRequest(LIST))).toBe(beforeList)
    expect(toCanonicalJson(await evaluateContextRequest(GET))).toBe(beforeGet)
    expect(toCanonicalJson(await evaluateContextRequest(CAPABILITIES))).toBe(beforeCapabilities)
  })

  it("mutating describeOperations()'s returned copy cannot alter core mutation validation semantics", () => {
    const described = describeOperations()
    described.push({ name: "setCss", fields: ["op", "path", "value"] })
    ;(described[0]!.fields as string[]).push("css")

    const theme = getValidatedTheme("quiet-editorial")!
    const result = applyMutation(theme, {
      schemaVersion: "1.0",
      requestId: "adversarial-describe-operations",
      base: { themeId: theme.id, revision: theme.revision },
      operations: [{ op: "setCss", path: "/etc/passwd", value: "body{color:red}" }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.ruleId === "mutation.unknown-operation")).toBe(true)

    // A fresh describeOperations() call is unaffected by the earlier call's mutated copy.
    expect(describeOperations().some((op) => op.name === "setCss")).toBe(false)
  })
})
