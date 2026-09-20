import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { COLOR_TOKENS, renderShadcnTailwindCss, validateTheme } from "../index"
import invalidFixture from "./fixtures/invalid.json"
import validFixture from "./fixtures/valid.json"

const goldenPath = new URL("./fixtures/quiet-editorial.css", import.meta.url)

describe("theme schema", () => {
  it("accepts the valid fixture and round-trips it without semantic loss", () => {
    const result = validateTheme(validFixture)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.theme).toEqual(validFixture)
    expect(validateTheme(JSON.parse(JSON.stringify(result.theme)))).toEqual(result)
  })

  it("has both modes with every semantic color and all six categories", () => {
    const result = validateTheme(validFixture)
    if (!result.ok) throw new Error("fixture invalid")
    for (const mode of ["light", "dark"] as const) {
      expect(Object.keys(result.theme.modes[mode].color).sort()).toEqual([...COLOR_TOKENS].sort())
    }
    for (const category of ["typography", "radius", "space", "shadow", "motion"] as const) {
      expect(Object.keys(result.theme[category]).length).toBeGreaterThan(0)
    }
  })

  it("rejects the invalid fixture with a stable rule ID at each offending path", () => {
    const result = validateTheme(invalidFixture)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.every((issue) => issue.ruleId === "theme.invalid")).toBe(true)
    const paths = result.issues.map((issue) => issue.path)
    expect(paths).toContain("modes.light.color.primary.$value")
    expect(paths).toContain("modes.dark.color.ring")
    expect(paths).toContain("")
  })

  it("rejects aliases, arbitrary custom properties, and unknown extension data", () => {
    const clone = () => structuredClone(validFixture) as Record<string, any>
    const alias = clone()
    alias.modes.light.color.primary.$value = "{modes.light.color.secondary}"
    const custom = clone()
    custom.modes.light.color["--evil"] = { $type: "color", $value: "oklch(0 0 0)" }
    const ext = clone()
    ext.$extensions.other = { x: 1 }
    for (const candidate of [alias, custom, ext]) expect(validateTheme(candidate).ok).toBe(false)
  })
})

describe("renderShadcnTailwindCss", () => {
  const theme = (() => {
    const result = validateTheme(validFixture)
    if (!result.ok) throw new Error("fixture invalid")
    return result.theme
  })()

  it("is byte-identical across runs and independent of input key order", () => {
    const a = renderShadcnTailwindCss(theme)
    const b = renderShadcnTailwindCss(structuredClone(theme))
    const reordered = Object.fromEntries(Object.entries(theme).reverse()) as typeof theme
    const c = renderShadcnTailwindCss(reordered)
    const sha = (s: string) => createHash("sha256").update(s).digest("hex")
    expect(sha(a)).toBe(sha(b))
    expect(sha(a)).toBe(sha(c))
  })

  it("matches the committed golden CSS", () => {
    expect(renderShadcnTailwindCss(theme)).toBe(readFileSync(goldenPath, "utf8"))
  })

  it("keeps radius, typography, and shadow live: @theme inline only references :root custom properties", () => {
    const css = renderShadcnTailwindCss(theme)
    const [rootAndDark, inline] = css.split("@theme inline")
    for (const [utility, source] of [
      ["--font-sans", "--font-family-sans"],
      ["--font-mono", "--font-family-mono"],
      ["--radius-sm", "--radius-scale-sm"],
      ["--radius-md", "--radius-scale-md"],
      ["--radius-lg", "--radius-scale-lg"],
      ["--shadow-sm", "--shadow-layers-sm"],
      ["--shadow-md", "--shadow-layers-md"],
      ["--shadow-lg", "--shadow-layers-lg"],
    ] as const) {
      expect(inline).toContain(`  ${utility}: var(${source});`)
      expect(rootAndDark).toMatch(new RegExp(`^  ${source}: [^v].*;$`, "m"))
    }
    // No literal font, radius, or shadow value remains inside the compiled-in block.
    expect(inline).not.toMatch(/--(?:font|radius|shadow)-(?:sans|mono|sm|md|lg): (?!var\()/)
  })

  it("emits shadcn variables, Tailwind v4 aliases, dark mode, and the reduced-motion override", () => {
    const css = renderShadcnTailwindCss(theme)
    expect(css).toContain(":root {")
    expect(css).toContain(".dark {")
    expect(css).toContain("@theme inline {")
    expect(css).toContain("--color-primary: var(--primary);")
    expect(css).toContain("@media (prefers-reduced-motion: reduce)")
    for (const token of COLOR_TOKENS) expect(css).toContain(`--${token}:`)
  })

  it("refuses to render a schema-invalid theme", () => {
    expect(() => renderShadcnTailwindCss(invalidFixture as never)).toThrow()
  })
})
