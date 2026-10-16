import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  BASE_COLOR_TOKENS,
  deriveRadiusScale,
  deriveShadowTiers,
  evaluateContextRequest,
  normalizeColor,
  readShadowProfile,
  renderShadcnTailwindCss,
  renderPortableThemeCss,
  renderUiEffectsCss,
  resolveUiEffects,
  SIDEBAR_COLOR_TOKENS,
  toPortableTheme,
  validateTheme,
} from "../index"
import type { Theme } from "../index"
import report from "./fixtures/pocketmarket.conversion.json"
import pocketmarketFixture from "./fixtures/pocketmarket.json"

/**
 * Every value below is transcribed from its source, not read from the fixture: LIGHT from the owner's saved Pocketmarket
 * Custom theme (portable Theme JSON, promoted 2026-10-17), DARK from the dark refinement recorded in
 * pocketmarket.conversion.json `darkRefinement`.
 */
const LIGHT: Record<string, string> = {
  background: "oklch(0.9818 0.0054 95.0986)",
  foreground: "oklch(0.1908 0.002 106.5859)",
  card: "oklch(0.9665 0.0067 97.3521)",
  "card-foreground": "oklch(0.1908 0.002 106.5859)",
  popover: "oklch(1 0 0)",
  "popover-foreground": "oklch(0.2671 0.0196 98.939)",
  primary: "oklch(0.673253 0.152964 24.390598)",
  "primary-foreground": "oklch(1 0 0)",
  secondary: "oklch(0.915438 0.009645 93.575552)",
  "secondary-foreground": "oklch(0.4334 0.0177 98.6048)",
  muted: "oklch(0.936929 0.008302 91.485738)",
  "muted-foreground": "oklch(0.5341 0.0078 97.4503)",
  accent: "oklch(0.915438 0.009645 93.575552)",
  "accent-foreground": "oklch(0.1908 0.002 106.5859)",
  destructive: "oklch(0.449604 0.118256 25.011082)",
  "destructive-foreground": "oklch(1 0 0)",
  border: "oklch(0.914092 0.016201 99.009796)",
  input: "oklch(0.84993 0.01515 98.319134)",
  ring: "oklch(0.719147 0.105938 22.181626)",
  "chart-1": "oklch(0.673253 0.152964 24.390598)",
  "chart-2": "oklch(0.73006 0.129272 23.024648)",
  "chart-3": "oklch(0.812281 0.106014 21.762654)",
  "chart-4": "oklch(0.857419 0.06763 34.42869)",
  "chart-5": "oklch(0.899475 0.053175 34.021118)",
  sidebar: "oklch(0.9663 0.008 98.8792)",
  "sidebar-foreground": "oklch(0.1908 0.002 106.5859)",
  "sidebar-primary": "oklch(0.673253 0.152964 24.390598)",
  "sidebar-primary-foreground": "oklch(0.9881 0 0)",
  "sidebar-accent": "oklch(0.9245 0.0138 92.9892)",
  "sidebar-accent-foreground": "oklch(0.1908 0.002 106.5859)",
  "sidebar-border": "oklch(0.914092 0.016201 99.009796)",
  "sidebar-ring": "oklch(0.84993 0.01515 98.319134)",
}
const DARK: Record<string, string> = {
  background: "oklch(0.2679 0.0036 106.6427)",
  foreground: "oklch(0.9576 0.0027 106.4494)",
  card: "oklch(0.2928 0.0018 106.5092)",
  "card-foreground": "oklch(0.9576 0.0027 106.4494)",
  popover: "oklch(0.3085 0.0035 106.6039)",
  "popover-foreground": "oklch(0.9211 0.004 106.4781)",
  primary: "oklch(0.7 0.145 24.390598)",
  "primary-foreground": "oklch(0.1908 0.002 106.5859)",
  secondary: "oklch(0.355 0.0096 93.575552)",
  "secondary-foreground": "oklch(0.86 0.0177 98.6048)",
  muted: "oklch(0.322 0.0083 91.485738)",
  "muted-foreground": "oklch(0.7713 0.0169 99.0657)",
  accent: "oklch(0.355 0.0096 93.575552)",
  "accent-foreground": "oklch(0.9576 0.0027 106.4494)",
  destructive: "oklch(0.6368 0.2078 25.3313)",
  "destructive-foreground": "oklch(1 0 0)",
  border: "oklch(0.3618 0.0101 106.8928)",
  input: "oklch(0.4336 0.0113 100.2195)",
  ring: "oklch(0.64 0.1 22.181626)",
  "chart-1": "oklch(0.7 0.145 24.390598)",
  "chart-2": "oklch(0.63 0.125 23.024648)",
  "chart-3": "oklch(0.56 0.105 21.762654)",
  "chart-4": "oklch(0.5 0.075 34.42869)",
  "chart-5": "oklch(0.44 0.055 34.021118)",
  sidebar: "oklch(0.2357 0.0024 98.8792)",
  "sidebar-foreground": "oklch(0.9576 0.0027 106.4494)",
  "sidebar-primary": "oklch(0.7 0.145 24.390598)",
  "sidebar-primary-foreground": "oklch(0.1908 0.002 106.5859)",
  "sidebar-accent": "oklch(0.31 0.0138 92.9892)",
  "sidebar-accent-foreground": "oklch(0.9576 0.0027 106.4494)",
  "sidebar-border": "oklch(0.3618 0.0101 106.8928)",
  "sidebar-ring": "oklch(0.4336 0.0113 100.2195)",
}
/** Inter and Geist Mono as the self-hosted font catalog writes them (packages/ui/src/lib/fonts.ts). */
const SANS = ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
const MONO = ["Geist Mono Variable", "Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]

const result = validateTheme(pocketmarketFixture)
if (!result.ok) throw new Error(JSON.stringify(result.issues))
const theme = result.theme
const block = (css: string, selector: ":root {" | ".dark {") => css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)))
const declared = (css: string, selector: ":root {" | ".dark {", name: string) => new RegExp(`^  --${name}: (.*);$`, "m").exec(block(css, selector))?.[1]

describe("Pocketmarket canonical fixture", () => {
  it("is a canonical Theme v3 fixture: validation is a fixed point", () => {
    expect(theme).toMatchObject({ id: "pocketmarket", name: "Pocketmarket", revision: 1, schemaVersion: "3.0", kind: "personal-ui-theme" })
    expect(theme.$extensions).toEqual({ "personal-ui-system": { displayName: "Pocketmarket" } })
    expect(`${JSON.stringify(theme, null, 2)}\n`).toBe(readFileSync(new URL("./fixtures/pocketmarket.json", import.meta.url), "utf8"))
  })

  it("maps all 32 source colours per mode through normalizeColor, numerically unchanged", () => {
    for (const [mode, table] of [["light", LIGHT], ["dark", DARK]] as const) {
      expect(Object.keys(theme.colors[mode]).sort()).toEqual(Object.keys(table).sort())
      for (const [name, source] of Object.entries(table)) {
        const normalized = normalizeColor(source)
        const value = theme.colors[mode][name as keyof Theme["colors"]["light"]].$value
        expect(value, `${mode}.${name}`).toBe(normalized.ok && normalized.value)
        const nums = (text: string) => text.match(/[\d.]+/g)!.map(Number)
        expect(nums(value), `${mode}.${name}`).toEqual(nums(source))
        expect(report.values[`colors.${mode}.${name}` as keyof typeof report.values]).toEqual({ source, normalized: value })
      }
    }
  })

  it("renders every base and dedicated Sidebar colour in both modes", () => {
    expect(theme.sidebar).toEqual({ useDedicatedTokens: { $type: "boolean", $value: true }, dedicatedValuesInitialized: true })
    const css = renderShadcnTailwindCss(theme)
    for (const [selector, mode] of [[":root {", "light"], [".dark {", "dark"]] as const) {
      for (const name of [...BASE_COLOR_TOKENS, ...SIDEBAR_COLOR_TOKENS]) expect(declared(css, selector, name), `${mode}.${name}`).toBe(theme.colors[mode][name].$value)
    }
  })

  it("uses the catalog Inter and Geist Mono stacks, a 1rem radius scale, the source shadow profile and Tactile at 50", () => {
    expect(theme.typography.heading.font.$value).toEqual(SANS)
    expect(theme.typography.body.font.$value).toEqual(SANS)
    expect(theme.typography.mono.$value).toEqual(MONO)
    expect([theme.typography.heading.tracking.$value, theme.typography.body.tracking.$value]).toEqual(["0em", "0em"])
    expect(Object.fromEntries(Object.entries(theme.radius).map(([k, v]) => [k, v.$value]))).toEqual(deriveRadiusScale("1rem"))
    expect(theme.space.base.$value).toBe("0.25rem")
    const profile = readShadowProfile(theme)
    expect(profile).toEqual({ color: "oklch(0 0 0)", opacity: 0.1, blur: "3px", spread: "0px", offsetX: "0px", offsetY: "1px" })
    expect(Object.fromEntries(Object.entries(theme.shadow).map(([k, v]) => [k, v.$value]))).toEqual(deriveShadowTiers(profile))
    expect(resolveUiEffects(theme)).toEqual({ effect: "tactile", strength: 50 })
  })
})

describe("promoted Pocketmarket design", () => {
  const hue = (value: string) => Number(value.match(/[\d.]+/g)![2])
  const chroma = (value: string) => Number(value.match(/[\d.]+/g)![1])

  it("keeps the built-in identity and carries no saved-copy identity, revision or bookkeeping beyond its own", () => {
    expect([theme.id, theme.name, theme.revision]).toEqual(["pocketmarket", "Pocketmarket", 1])
    const text = JSON.stringify(pocketmarketFixture)
    expect(text).not.toMatch(/custom/i)
    expect(Object.keys(pocketmarketFixture)).toEqual(["$schema", "schemaVersion", "kind", "id", "name", "revision", "colors", "typography", "radius", "space", "shadow", "motion", "sidebar", "uiEffects", "$extensions"])
  })

  it("dark mode follows the light coral-pink family: no orange or violet remains in any chromatic role", () => {
    const lightHue = hue(theme.colors.light.primary.$value)
    const chromatic = ["primary", "ring", "sidebar-primary", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] as const
    for (const mode of ["light", "dark"] as const) {
      for (const name of chromatic) {
        const value = theme.colors[mode][name].$value
        expect(chroma(value), `${mode}.${name}`).toBeGreaterThan(0.05)
        // The coral ramp spans hue 21-35; the stale orange sat at 38-43 and the violet at 289-298.
        expect(hue(value), `${mode}.${name}`).toBeGreaterThanOrEqual(20)
        expect(hue(value), `${mode}.${name}`).toBeLessThan(36)
      }
    }
    expect(hue(theme.colors.dark.primary.$value)).toBe(lightHue)
    expect(theme.colors.dark["sidebar-primary"].$value).toBe(theme.colors.dark.primary.$value)
    expect(theme.colors.dark["chart-1"].$value).toBe(theme.colors.dark.primary.$value)
    // The same relationships hold in both modes.
    for (const mode of ["light", "dark"] as const) {
      const c = theme.colors[mode]
      expect(c.accent.$value).toBe(c.secondary.$value)
      expect(c["accent-foreground"].$value).toBe(c.foreground.$value)
      expect(c["card-foreground"].$value).toBe(c.foreground.$value)
      expect(c["sidebar-foreground"].$value).toBe(c.foreground.$value)
      expect(c["sidebar-accent-foreground"].$value).toBe(c.foreground.$value)
      expect(c["sidebar-border"].$value).toBe(c.border.$value)
      expect(c["sidebar-ring"].$value).toBe(c.input.$value)
    }
  })

  it("dark surfaces step up from background to card, muted and secondary, as light steps down", () => {
    const l = (value: string) => Number(value.match(/[\d.]+/g)![0])
    const step = (mode: "light" | "dark") => (["background", "card", "muted", "secondary"] as const).map((name) => l(theme.colors[mode][name].$value))
    const light = step("light")
    const dark = step("dark")
    for (let i = 1; i < 4; i++) {
      expect(light[i]!).toBeLessThan(light[i - 1]!)
      expect(dark[i]!).toBeGreaterThan(dark[i - 1]!)
    }
  })

  it("exports only portable design data, and Tactile derives from the palette with no Pocketmarket special case", () => {
    const portable = toPortableTheme(theme)
    expect(Object.keys(portable)).toEqual(["colors", "typography", "radius", "space", "shadow", "motion", "sidebar", "uiEffects"])
    expect(JSON.stringify(portable)).not.toMatch(/pocketmarket|personal-ui|revision/i)
    const css = renderPortableThemeCss(theme)
    expect(css).not.toMatch(/pocketmarket|personal-ui/i)
    const effects = renderUiEffectsCss(theme)
    expect(css.endsWith(`\n${effects}`)).toBe(true)
    // At the default strength the tactile block is the same text for every palette.
    const other = validateTheme({ ...structuredClone(pocketmarketFixture), colors: { ...pocketmarketFixture.colors, light: { ...pocketmarketFixture.colors.light, primary: { $type: "color", $value: "oklch(0.5 0.1 250)" } } } })
    if (!other.ok) throw new Error("invalid")
    expect(renderUiEffectsCss(other.theme)).toBe(effects)
    expect(effects.replaceAll("0 0 #0000", "")).not.toMatch(/oklch\(|#[0-9a-f]{3,8}\b/i)
  })
})

describe("core retrieval serves Pocketmarket", () => {
  it("returns canonical v3 pocketmarket with fixture provenance", async () => {
    const got = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "get", theme: "pocketmarket", resource: "button" })
    if (!got.ok || got.operation !== "get") throw new Error("expected get")
    expect(got.theme).toEqual(theme)
    expect(got.provenance.theme.sourceId).toBe("packages/core/src/theme/fixtures/pocketmarket.json")
  })
})
