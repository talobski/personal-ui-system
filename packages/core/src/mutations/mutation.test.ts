import { describe, expect, it } from "vitest"
import { applyMutation, renderShadcnTailwindCss, validateMutation, validateTheme } from "../index"
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
    expect(result.theme.colors.light.primary.$value).toBe("oklch(0.5 0.1 200)")
    expect(result.theme.colors.dark.primary.$value).toBe(theme.colors.dark.primary.$value)
    expect(result.css).toContain("--primary: oklch(0.5 0.1 200);")
    expect(JSON.stringify(theme)).toBe(before)
  })
})

/** One operation per non-color category, with the rendered declaration and diff-visible path it must produce. */
const categoryOperations = [
  { category: "radius", operation: { op: "setRadius", value: "1rem" }, css: "--radius-scale-md: 1rem;", path: ["radius", "md"], expected: "1rem" },
  { category: "spacing/density", operation: { op: "setDensity", value: 1.25 }, css: "--density: 1.25;", path: ["space", "density"], expected: 1.25 },
  {
    category: "typography",
    operation: { op: "setFontWeight", target: "heading", value: 700 },
    css: "--font-weight-heading: 700;",
    path: ["typography", "heading", "weight"],
    expected: 700,
  },
  {
    category: "shadow",
    operation: { op: "setShadowBlur", value: "12px" },
    css: "--shadow-layers-md: 0px 4px 12px -2px oklch(0 0 0 / 0.1);",
    path: ["shadow", "md"],
    expected: [{ inset: false, offsetX: "0px", offsetY: "4px", blur: "12px", spread: "-2px", color: "oklch(0 0 0 / 0.1)" }],
  },
  { category: "motion", operation: { op: "setMotionDuration", value: "320ms" }, css: "--motion-duration-base: 320ms;", path: ["motion", "durationBase"], expected: "320ms" },
] as const

const valueAt = (source: unknown, path: readonly string[]) =>
  path.reduce<any>((node, key) => node[key], source)

describe.each(categoryOperations)("$category mutation", ({ operation, css, path, expected }) => {
  it("applies, revalidates, bumps the revision, renders, and does not mutate the input", () => {
    const before = JSON.stringify(theme)
    const result = applyMutation(theme, request([operation]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.theme.revision).toBe(theme.revision + 1)
    expect(valueAt(result.theme, path).$value).toEqual(expected)
    expect(validateTheme(JSON.parse(JSON.stringify(result.theme)))).toEqual({ ok: true, theme: result.theme })
    expect(result.css).toContain(css)
    expect(result.css).not.toBe(renderShadcnTailwindCss(theme))
    expect(JSON.stringify(theme)).toBe(before)
  })

  it("changes only its own target: every other token value is untouched", () => {
    const result = applyMutation(theme, request([operation]))
    if (!result.ok) throw new Error("mutation failed")
    const expectedTheme = structuredClone(theme)
    valueAt(expectedTheme, path).$value = expected
    expectedTheme.revision += 1
    expect(result.theme).toEqual(expectedTheme)
  })
})

describe("deterministic rendering across all categories", () => {
  const all = categoryOperations.map((entry) => entry.operation)

  it("renders byte-identical CSS for identical input", () => {
    expect(renderShadcnTailwindCss(theme)).toBe(renderShadcnTailwindCss(structuredClone(theme)))
    const first = applyMutation(theme, request([setColor, ...all]))
    const second = applyMutation(structuredClone(theme), request([setColor, ...all]))
    expect(first.ok && second.ok).toBe(true)
    if (first.ok && second.ok) {
      expect(first.css).toBe(second.css)
      expect(JSON.stringify(first.theme)).toBe(JSON.stringify(second.theme))
      for (const { css } of categoryOperations) expect(first.css).toContain(css)
      expect(first.theme.revision).toBe(theme.revision + 1)
    }
  })

  it("does not depend on operation order for distinct targets", () => {
    const forward = applyMutation(theme, request([setColor, ...all]))
    const reverse = applyMutation(theme, request([...all].reverse().concat(setColor as never)))
    if (!forward.ok || !reverse.ok) throw new Error("mutation failed")
    expect(reverse.css).toBe(forward.css)
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
    ["unknown token on radius", request([{ op: "setRadius", token: "--evil", value: "1rem" }]), { ruleId: "mutation.unknown-field", path: "operations[0].token" }],
    ["mode on density", request([{ op: "setDensity", mode: "sepia", value: 1 }]), { ruleId: "mutation.unknown-field", path: "operations[0].mode" }],
    ["raw CSS field on shadow", request([{ op: "setShadowBlur", value: "4px", css: "x{}" }]), { ruleId: "mutation.unknown-field", path: "operations[0].css" }],
    ["filesystem path field on typography", request([{ op: "setFontWeight", target: "body", value: 400, path: "/etc/passwd" }]), { ruleId: "mutation.unknown-field", path: "operations[0].path" }],
    ["arbitrary pointer operation", request([{ op: "setPath", pointer: "/radius/md/$value", value: "1rem" }]), { ruleId: "mutation.unknown-operation", path: "operations[0].op" }],
    ["bulk operation", request([{ op: "setMany", values: [] }]), { ruleId: "mutation.unknown-operation", path: "operations[0].op" }],
    ["inherited operation name", request([{ op: "constructor", value: "1rem" }]), { ruleId: "mutation.unknown-operation", path: "operations[0].op" }],
    ["non-string operation name", request([{ op: 1, value: "1rem" }]), { ruleId: "mutation.unknown-operation", path: "operations[0].op" }],
    ["radius raw CSS", request([{ op: "setRadius", value: "1rem; } body { display: none" }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["radius wrong unit", request([{ op: "setRadius", value: "50%" }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["radius negative", request([{ op: "setRadius", value: "-1px" }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["radius non-string", request([{ op: "setRadius", value: 4 }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["radius missing value", request([{ op: "setRadius" }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["density above range", request([{ op: "setDensity", value: 2.5 }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["density below range", request([{ op: "setDensity", value: 0.1 }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["density as string", request([{ op: "setDensity", value: "1.2" }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["density NaN", request([{ op: "setDensity", value: Number.NaN }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["font with CSS injection", request([{ op: "setFontFamily", target: "body", value: ['Inter"; } body { display: none; } a{"'] }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["font as string", request([{ op: "setFontFamily", target: "heading", value: "Inter" }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["font empty", request([{ op: "setFontFamily", target: "heading", value: [] }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["weight CSS injection", request([{ op: "setFontWeight", target: "heading", value: "600; color: red" }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["weight off-step", request([{ op: "setFontWeight", target: "body", value: 450 }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["weight out of range", request([{ op: "setFontWeight", target: "body", value: 1000 }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["weight on mono", request([{ op: "setFontWeight", target: "mono", value: 400 }]), { ruleId: "mutation.invalid-target", path: "operations[0].target" }],
    ["retired v2 setSansFamily", request([{ op: "setSansFamily", value: "Inter" }]), { ruleId: "mutation.unknown-operation", path: "operations[0].op" }],
    ["shadow blur raw CSS", request([{ op: "setShadowBlur", value: "4px, 0 0 red" }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["shadow blur negative", request([{ op: "setShadowBlur", value: "-2px" }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["motion raw CSS", request([{ op: "setMotionDuration", value: "1s; color: red" }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["motion negative", request([{ op: "setMotionDuration", value: "-5ms" }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["motion unitless", request([{ op: "setMotionDuration", value: "200" }]), { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    ["second operation invalid reports its index", request([setColor, { op: "setRadius", value: "big" }]), { ruleId: "mutation.invalid-value", path: "operations[1].value" }],
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

  it("rejects every new operation against a stale base without applying any", () => {
    for (const { operation } of categoryOperations) {
      const result = applyMutation(theme, request([operation], { base: { themeId: theme.id, revision: 99 } }))
      expect(result).toEqual({ ok: false, errors: [{ ruleId: "mutation.stale-revision", path: "base.revision" }] })
    }
  })

  it("has no shadow without a layer to edit: v2 tiers are non-empty, so missing-target cannot arise from a valid theme", () => {
    const noLayers = structuredClone(theme)
    noLayers.shadow.md.$value = []
    expect(validateTheme(noLayers).ok).toBe(false)
  })
})
