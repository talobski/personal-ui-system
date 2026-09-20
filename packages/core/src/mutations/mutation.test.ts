import { describe, expect, it } from "vitest"
import { applyMutation, validateMutation, validateTheme } from "../index"
import validFixture from "../theme/fixtures/valid.json"

const parsed = validateTheme(validFixture)
if (!parsed.ok) throw new Error("fixture invalid")
const theme = parsed.theme

const request = (operations: unknown[], overrides: Record<string, unknown> = {}) => ({
  schemaVersion: "1.0",
  requestId: "req-1",
  base: { themeId: theme.id, revision: theme.revision },
  operations,
  ...overrides,
})
const setColor = { op: "setColor", mode: "light", token: "primary", value: "oklch(0.5 0.1 200)" }

describe("setColor mutation", () => {
  it("applies a valid operation, bumps the revision, and does not mutate the input", () => {
    const before = JSON.stringify(theme)
    const result = applyMutation(theme, request([setColor]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.theme.revision).toBe(theme.revision + 1)
    expect(result.theme.modes.light.color.primary.$value).toBe("oklch(0.5 0.1 200)")
    expect(result.theme.modes.dark.color.primary.$value).toBe(theme.modes.dark.color.primary.$value)
    expect(result.css).toContain("--primary: oklch(0.5 0.1 200);")
    expect(JSON.stringify(theme)).toBe(before)
  })
})

describe("mutation rejection", () => {
  const cases: [string, unknown, { ruleId: string; path: string }][] = [
    ["unknown operation", request([{ op: "setCss", css: "body{}" }]), { ruleId: "mutation.unknown-operation", path: "operations[0].op" }],
    ["raw CSS operation", request([{ op: "rawCss", value: "a{b:c}" }]), { ruleId: "mutation.unknown-operation", path: "operations[0].op" }],
    ["raw CSS field on setColor", request([{ ...setColor, css: "body{}" }]), { ruleId: "mutation.unknown-field", path: "operations[0].css" }],
    ["filesystem path field", request([{ ...setColor, path: "/etc/passwd" }]), { ruleId: "mutation.unknown-field", path: "operations[0].path" }],
    ["raw CSS as value", request([{ ...setColor, value: "red; } body { display: none" }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["unknown token", request([{ ...setColor, token: "--evil" }]), { ruleId: "mutation.unknown-token", path: "operations[0].token" }],
    ["invalid mode", request([{ ...setColor, mode: "sepia" }]), { ruleId: "mutation.invalid-mode", path: "operations[0].mode" }],
    ["empty operations", request([]), { ruleId: "mutation.invalid-operations", path: "operations" }],
    ["non-object operation", request(["setColor"]), { ruleId: "mutation.invalid-operation", path: "operations[0]" }],
    ["stale revision", request([setColor], { base: { themeId: theme.id, revision: 99 } }), { ruleId: "mutation.stale-revision", path: "base.revision" }],
    ["other theme", request([setColor], { base: { themeId: "other", revision: 1 } }), { ruleId: "mutation.base-mismatch", path: "base.themeId" }],
    ["unsupported version", request([setColor], { schemaVersion: "2.0" }), { ruleId: "mutation.unsupported-version", path: "schemaVersion" }],
    ["unknown top-level field", request([setColor], { file: "x" }), { ruleId: "mutation.unknown-field", path: "file" }],
    ["non-object request", "not a request", { ruleId: "mutation.invalid-request", path: "" }],
  ]

  it.each(cases)("rejects %s with a stable rule ID and path", (_name, input, expected) => {
    for (const run of [() => validateMutation(input, theme), () => applyMutation(theme, input)]) {
      const result = run()
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors).toContainEqual(expected)
    }
  })

  it("rejected mutations leave no candidate theme", () => {
    const result = applyMutation(theme, request([{ ...setColor, value: "red" }]))
    expect(result).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value" }] })
  })
})
