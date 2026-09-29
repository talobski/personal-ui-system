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

describe("closed operation union (STHG-08: Theme v3 typography replaces setSansFamily with setFontWeight)", () => {
  // PUI-113 supersedes the count in place: the twelve accepted operations keep their exact order and fields, and the one
  // approved `setUiEffects` addition makes thirteen.
  it("has exactly twelve pre-existing operations with targeted typography fields plus setUiEffects", () => {
    expect(describeOperations().slice(0, 12)).toEqual([
      { name: "setColor", fields: ["op", "mode", "token", "value"] },
      { name: "setRadius", fields: ["op", "value"] },
      { name: "setDensity", fields: ["op", "value"] },
      { name: "setFontWeight", fields: ["op", "target", "value"] },
      { name: "setShadowBlur", fields: ["op", "value"] },
      { name: "setMotionDuration", fields: ["op", "value"] },
      { name: "setFontFamily", fields: ["op", "target", "value"] },
      { name: "setTracking", fields: ["op", "target", "value"] },
      { name: "setRadiusBase", fields: ["op", "value"] },
      { name: "setSpacingBase", fields: ["op", "value"] },
      { name: "setShadowProfile", fields: ["op", "value"] },
      { name: "setSidebarTokensEnabled", fields: ["op", "value"] },
    ])
    expect(describeOperations()).toHaveLength(13)
    expect(describeOperations().at(-1)).toEqual({ name: "setUiEffects", fields: ["op", "value"] })
    expect(describeOperations().map((d) => d.name)).not.toContain("setSansFamily")
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

const stackPath = (target: "heading" | "body" | "mono") => (target === "mono" ? "typography.mono" : `typography.${target}.font`)
const stackOf = (t: Theme, target: "heading" | "body" | "mono") => (target === "mono" ? t.typography.mono : t.typography[target].font).$value

describe("setFontFamily", () => {
  it.each(["heading", "body", "mono"] as const)("replaces the whole %s stack and renders it", (target) => {
    const result = apply({ op: "setFontFamily", target, value: ["Source Serif 4", "Georgia", "serif"] })
    expect(stackOf(result.theme, target)).toEqual(["Source Serif 4", "Georgia", "serif"])
    expect(result.css).toContain(`  --font-${target}: "Source Serif 4", "Georgia", serif;`)
    expect(diffThemeTokens(theme, result.theme).map((d) => d.path)).toEqual([stackPath(target)])
  })

  it("lets Heading and Body each choose any stack, including a monospace one", () => {
    const mono = ["JetBrains Mono Variable", "JetBrains Mono", "ui-monospace", "monospace"]
    const result = apply({ op: "setFontFamily", target: "heading", value: mono })
    expect(result.theme.typography.heading.font.$value).toEqual(mono)
    expect(apply({ op: "setFontFamily", target: "body", value: mono }).theme.typography.body.font.$value).toEqual(mono)
  })

  it.each([
    [{ target: "display", value: ["Inter"] }, "mutation.invalid-target", "operations[0].target"],
    [{ target: "sans", value: ["Inter"] }, "mutation.invalid-target", "operations[0].target"],
    [{ family: "body", value: ["Inter"] }, "mutation.unknown-field", "operations[0].family"],
    [{ target: "body", value: [] }, "mutation.invalid-value", "operations[0].value"],
    [{ target: "body", value: "Inter" }, "mutation.invalid-value", "operations[0].value"],
    [{ target: "body", value: ['Inter"; } body {'] }, "mutation.invalid-value", "operations[0].value"],
    [{ target: "body", value: Array(17).fill("Inter") }, "mutation.invalid-value", "operations[0].value"],
    [{ target: "body", value: ["Inter"], css: "x" }, "mutation.unknown-field", "operations[0].css"],
  ])("rejects %j", (fields, ruleId, path) => {
    const result = applyMutation(theme, request([{ op: "setFontFamily", ...fields }]))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors).toContainEqual({ ruleId, path })
  })
})

describe("setFontWeight", () => {
  it.each(["heading", "body"] as const)("sets only the %s weight and renders it", (target) => {
    const result = apply({ op: "setFontWeight", target, value: 300 })
    expect(result.theme.typography[target].weight.$value).toBe(300)
    expect(result.css).toContain(`  --font-weight-${target}: 300;`)
    expect(diffThemeTokens(theme, result.theme).map((d) => d.path)).toEqual([`typography.${target}.weight`])
  })

  it.each([100, 900])("admits the bound %d", (value) => expect(apply({ op: "setFontWeight", target: "body", value }).theme.typography.body.weight.$value).toBe(value))

  it.each([0, 50, 450, 1000, 400.5, "400", "bold", null])("rejects %j", (value) => {
    expect(applyMutation(theme, request([{ op: "setFontWeight", target: "heading", value }]))).toEqual({
      ok: false,
      errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    })
  })

  it.each([["mono"], ["sans"], [undefined]])("rejects target %j", (target) => {
    const result = applyMutation(theme, request([{ op: "setFontWeight", target, value: 400 }]))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors).toContainEqual({ ruleId: "mutation.invalid-target", path: "operations[0].target" })
  })
})

describe("setTracking", () => {
  it.each(["heading", "body"] as const)("stores a canonical em value for %s only and renders it", (target) => {
    const result = apply({ op: "setTracking", target, value: "0.0250em" })
    expect(result.theme.typography[target].tracking.$value).toBe("0.025em")
    expect(result.css).toContain(`  --tracking-${target}: 0.025em;`)
    expect(diffThemeTokens(theme, result.theme).map((d) => d.path)).toEqual([`typography.${target}.tracking`])
  })

  it.each(["0.3em", "-0.3em", "1px", "0.02rem", "normal", 0.02, "0.02em; color: red"])("rejects %j", (value) => {
    expect(applyMutation(theme, request([{ op: "setTracking", target: "body", value }]))).toEqual({
      ok: false,
      errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value" }],
    })
  })

  it("rejects the retired untargeted v2 shape and a mono target", () => {
    for (const operation of [{ op: "setTracking", value: "0.01em" }, { op: "setTracking", target: "mono", value: "0.01em" }]) {
      const result = applyMutation(theme, request([operation]))
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors).toContainEqual({ ruleId: "mutation.invalid-target", path: "operations[0].target" })
    }
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
      { op: "setTracking", target: "heading", value: "0.01em" },
      { op: "setRadiusBase", value: "0.75rem" },
      { op: "setSpacingBase", value: "0.28rem" },
    ]
    const ok = applyMutation(theme, request(ops))
    expect(ok.ok && ok.theme.revision).toBe(2)
    const bad = applyMutation(theme, request([...ops, { op: "setShadowProfile", value: { ...profile, opacity: 2 } }]))
    expect(bad).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[3].value.opacity" }] })
  })
})
