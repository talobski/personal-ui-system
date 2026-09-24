import { describe, expect, it } from "vitest"
import { applyMutation, describeOperations, diffThemeTokens, validateTheme } from "../index"
import type { Theme } from "../index"
import defaultFixture from "../theme/fixtures/default.json"

const theme = (() => {
  const result = validateTheme(defaultFixture)
  if (!result.ok) throw new Error("fixture invalid")
  return result.theme
})()

const request = (operations: unknown[], base: Theme = theme) => ({
  schemaVersion: "1.0",
  requestId: "req-v2",
  base: { themeId: base.id, revision: base.revision },
  operations,
})

const apply = (operation: unknown, base: Theme = theme) => {
  const result = applyMutation(base, request([operation], base))
  if (!result.ok) throw new Error(JSON.stringify(result.errors))
  return result
}

const profile = { color: "#000000", opacity: 0.2, blur: "6px", spread: "1px", offsetX: "2px", offsetY: "3px" }

describe("closed operation union (TSV2 additions only)", () => {
  it("adds exactly setFontFamily, setTracking, setRadiusBase, setSpacingBase, setShadowProfile", () => {
    expect(describeOperations()).toEqual([
      { name: "setColor", fields: ["op", "mode", "token", "value"] },
      { name: "setRadius", fields: ["op", "value"] },
      { name: "setDensity", fields: ["op", "value"] },
      { name: "setSansFamily", fields: ["op", "value"] },
      { name: "setShadowBlur", fields: ["op", "value"] },
      { name: "setMotionDuration", fields: ["op", "value"] },
      { name: "setFontFamily", fields: ["op", "family", "value"] },
      { name: "setTracking", fields: ["op", "value"] },
      { name: "setRadiusBase", fields: ["op", "value"] },
      { name: "setSpacingBase", fields: ["op", "value"] },
      { name: "setShadowProfile", fields: ["op", "value"] },
    ])
  })
})

describe("setColor accepts four input families and stores canonical OKLCH", () => {
  it.each([
    ["#ff0000", "oklch(0.627955 0.257683 29.23388)"],
    ["rgb(255 0 0)", "oklch(0.627955 0.257683 29.23388)"],
    ["hsl(0 100% 50%)", "oklch(0.627955 0.257683 29.23388)"],
    ["oklch(0.627955 0.257683 29.23388)", "oklch(0.627955 0.257683 29.23388)"],
    ["rgba(0, 0, 0, 0.5)", "oklch(0 0 0 / 0.5)"],
  ])("%s", (value, expected) => {
    const result = apply({ op: "setColor", mode: "dark", token: "ring", value })
    expect(result.theme.colors.dark.ring.$value).toBe(expected)
    expect(result.css).toContain(`  --ring: ${expected};`)
  })

  it.each(["red", "oklch(0.7 0.4 150)", "rgb(300 0 0)", "oklch(1e999 0 0)", "#12345"])("rejects %s without a candidate", (value) => {
    expect(applyMutation(theme, request([{ op: "setColor", mode: "light", token: "primary", value }]))).toEqual({
      ok: false,
      errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    })
  })
})

describe("setFontFamily", () => {
  it.each(["sans", "serif", "mono"] as const)("replaces the whole %s stack and renders it", (family) => {
    const result = apply({ op: "setFontFamily", family, value: ["Source Serif 4", "Georgia", "serif"] })
    expect(result.theme.typography[family].$value).toEqual(["Source Serif 4", "Georgia", "serif"])
    expect(result.css).toContain(`  --font-family-${family}: "Source Serif 4", "Georgia", serif;`)
    expect(diffThemeTokens(theme, result.theme).map((d) => d.path)).toEqual([`typography.${family}`])
  })

  it.each([
    [{ family: "display", value: ["Inter"] }, "mutation.invalid-family", "operations[0].family"],
    [{ family: "sans", value: [] }, "mutation.invalid-value", "operations[0].value"],
    [{ family: "sans", value: "Inter" }, "mutation.invalid-value", "operations[0].value"],
    [{ family: "sans", value: ['Inter"; } body {'] }, "mutation.invalid-value", "operations[0].value"],
    [{ family: "sans", value: Array(17).fill("Inter") }, "mutation.invalid-value", "operations[0].value"],
    [{ family: "sans", value: ["Inter"], css: "x" }, "mutation.unknown-field", "operations[0].css"],
  ])("rejects %j", (fields, ruleId, path) => {
    const result = applyMutation(theme, request([{ op: "setFontFamily", ...fields }]))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors).toContainEqual({ ruleId, path })
  })
})

describe("setTracking", () => {
  it("stores a canonical em value and renders --tracking-base", () => {
    const result = apply({ op: "setTracking", value: "0.0250em" })
    expect(result.theme.typography.tracking.$value).toBe("0.025em")
    expect(result.css).toContain("  --tracking-base: 0.025em;")
  })

  it.each(["0.3em", "-0.3em", "1px", "0.02rem", "normal", 0.02, "0.02em; color: red"])("rejects %j", (value) => {
    expect(applyMutation(theme, request([{ op: "setTracking", value }]))).toEqual({
      ok: false,
      errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    })
  })
})

describe("setRadiusBase derives the full radius scale", () => {
  it("rem", () => {
    const result = apply({ op: "setRadiusBase", value: "0.5rem" })
    expect(Object.fromEntries(Object.entries(result.theme.radius).map(([k, v]) => [k, v.$value]))).toEqual({
      base: "0.5rem", sm: "0.25rem", md: "0.375rem", lg: "0.5rem", xl: "0.75rem",
    })
    expect(result.css).toContain("  --radius: 0.5rem;")
    expect(result.css).toContain("  --radius-scale-xl: 0.75rem;")
  })

  it("px, clamping the scale at zero", () => {
    const result = apply({ op: "setRadiusBase", value: "2px" })
    expect(Object.fromEntries(Object.entries(result.theme.radius).map(([k, v]) => [k, v.$value]))).toEqual({
      base: "2px", sm: "0px", md: "0px", lg: "2px", xl: "6px",
    })
  })

  it.each(["-1px", "3rem", "1em", "50%", "1rem; x", 1])("rejects %j", (value) => {
    expect(applyMutation(theme, request([{ op: "setRadiusBase", value }])).ok).toBe(false)
  })
})

describe("setSpacingBase", () => {
  it("stores space.base and renders --space-base", () => {
    const result = apply({ op: "setSpacingBase", value: "0.25rem" })
    expect(result.theme.space.base.$value).toBe("0.25rem")
    expect(result.theme.space.density.$value).toBe(1)
    expect(result.css).toContain("  --space-base: 0.25rem;")
  })

  it.each(["0rem", "0.6rem", "-0.2rem", "1em", "0.25"])("rejects %j", (value) => {
    expect(applyMutation(theme, request([{ op: "setSpacingBase", value }])).ok).toBe(false)
  })
})

describe("setShadowProfile derives every tier from one profile", () => {
  it("replaces all eight tiers deterministically and renders them", () => {
    const result = apply({ op: "setShadowProfile", value: profile })
    expect(result.theme.shadow["2xs"].$value).toEqual([{ inset: false, offsetX: "2px", offsetY: "3px", blur: "6px", spread: "1px", color: "oklch(0 0 0 / 0.1)" }])
    expect(result.theme.shadow.md.$value).toEqual([
      { inset: false, offsetX: "2px", offsetY: "3px", blur: "6px", spread: "1px", color: "oklch(0 0 0 / 0.2)" },
      { inset: false, offsetX: "2px", offsetY: "2px", blur: "4px", spread: "0px", color: "oklch(0 0 0 / 0.2)" },
    ])
    expect(result.theme.shadow["2xl"].$value[0]!.color).toBe("oklch(0 0 0 / 0.5)")
    expect(result.css).toContain("  --shadow-layers-md: 2px 3px 6px 1px oklch(0 0 0 / 0.2), 2px 2px 4px 0px oklch(0 0 0 / 0.2);")
    expect(JSON.stringify(apply({ op: "setShadowProfile", value: profile }).theme)).toBe(JSON.stringify(result.theme))
    const changed = diffThemeTokens(theme, result.theme).map((d) => d.path)
    expect(changed.every((path) => path.startsWith("shadow."))).toBe(true)
  })

  it("stores no profile beside the tiers", () => {
    const result = apply({ op: "setShadowProfile", value: profile })
    expect(Object.keys(result.theme.shadow)).toEqual(["2xs", "xs", "sm", "default", "md", "lg", "xl", "2xl"])
    expect(JSON.stringify(result.theme)).not.toMatch(/opacity|profile/)
  })

  it("clamps the 2.5x 2xl alpha at 1", () => {
    const result = apply({ op: "setShadowProfile", value: { ...profile, opacity: 0.8 } })
    expect(result.theme.shadow["2xl"].$value[0]!.color).toBe("oklch(0 0 0)")
  })

  it.each([
    [{ ...profile, color: "rgba(0,0,0,0.5)" }, "operations[0].value.color"],
    [{ ...profile, color: "oklch(0.7 0.4 150)" }, "operations[0].value.color"],
    [{ ...profile, opacity: 1.5 }, "operations[0].value.opacity"],
    [{ ...profile, opacity: "0.2" }, "operations[0].value.opacity"],
    [{ ...profile, blur: "-1px" }, "operations[0].value.blur"],
    [{ ...profile, blur: "1rem" }, "operations[0].value.blur"],
    [{ ...profile, spread: "40px" }, "operations[0].value.spread"],
    [{ ...profile, offsetX: "x" }, "operations[0].value.offsetX"],
    [{ ...profile, offsetY: "-33px" }, "operations[0].value.offsetY"],
  ])("rejects %j at %s", (value, path) => {
    const result = applyMutation(theme, request([{ op: "setShadowProfile", value }]))
    expect(result).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path }] })
  })

  it("rejects unknown profile fields and non-object values", () => {
    expect(applyMutation(theme, request([{ op: "setShadowProfile", value: { ...profile, inset: true } }]))).toEqual({
      ok: false,
      errors: [{ ruleId: "mutation.unknown-field", path: "operations[0].value.inset" }],
    })
    expect(applyMutation(theme, request([{ op: "setShadowProfile", value: "0 1px 3px black" }]))).toEqual({
      ok: false,
      errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    })
  })
})

describe("new operations stay atomic in one request", () => {
  it("applies several in one revision and rejects the whole request if one is invalid", () => {
    const ops = [
      { op: "setTracking", value: "0.01em" },
      { op: "setRadiusBase", value: "0.75rem" },
      { op: "setSpacingBase", value: "0.28rem" },
    ]
    const ok = applyMutation(theme, request(ops))
    expect(ok.ok && ok.theme.revision).toBe(2)
    const bad = applyMutation(theme, request([...ops, { op: "setShadowProfile", value: { ...profile, opacity: 2 } }]))
    expect(bad).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[3].value.opacity" }] })
  })
})
