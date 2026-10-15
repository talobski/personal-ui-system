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
  renderUiEffectsCss,
  SIDEBAR_COLOR_TOKENS,
  validateTheme,
} from "../index"
import type { Theme } from "../index"
import report from "./fixtures/pocketmarket.conversion.json"
import pocketmarketFixture from "./fixtures/pocketmarket.json"

/** Every source value below is transcribed independently from the owner-supplied Pocketmarket stylesheet, not read from the fixture. */
const LIGHT: Record<string, string> = {
  background: "oklch(0.9818 0.0054 95.0986)",
  foreground: "oklch(0.3438 0.0269 95.7226)",
  card: "oklch(0.9665 0.0067 97.3521)",
  "card-foreground": "oklch(0.1908 0.0020 106.5859)",
  popover: "oklch(1.0000 0 0)",
  "popover-foreground": "oklch(0.2671 0.0196 98.9390)",
  primary: "oklch(0.6171 0.1375 39.0427)",
  "primary-foreground": "oklch(1.0000 0 0)",
  secondary: "oklch(0.9245 0.0138 92.9892)",
  "secondary-foreground": "oklch(0.4334 0.0177 98.6048)",
  muted: "oklch(0.9341 0.0153 90.2390)",
  "muted-foreground": "oklch(0.5341 0.0078 97.4503)",
  accent: "oklch(0.9245 0.0138 92.9892)",
  "accent-foreground": "oklch(0.2671 0.0196 98.9390)",
  destructive: "oklch(0.1908 0.0020 106.5859)",
  "destructive-foreground": "oklch(1.0000 0 0)",
  border: "oklch(0.8847 0.0069 97.3627)",
  input: "oklch(0.7621 0.0156 98.3528)",
  ring: "oklch(0.6171 0.1375 39.0427)",
  "chart-1": "oklch(0.5583 0.1276 42.9956)",
  "chart-2": "oklch(0.6898 0.1581 290.4107)",
  "chart-3": "oklch(0.8816 0.0276 93.1280)",
  "chart-4": "oklch(0.8822 0.0403 298.1792)",
  "chart-5": "oklch(0.5608 0.1348 42.0584)",
  sidebar: "oklch(0.9663 0.0080 98.8792)",
  "sidebar-foreground": "oklch(0.3590 0.0051 106.6524)",
  "sidebar-primary": "oklch(0.6171 0.1375 39.0427)",
  "sidebar-primary-foreground": "oklch(0.9881 0 0)",
  "sidebar-accent": "oklch(0.9245 0.0138 92.9892)",
  "sidebar-accent-foreground": "oklch(0.3250 0 0)",
  "sidebar-border": "oklch(0.9401 0 0)",
  "sidebar-ring": "oklch(0.7731 0 0)",
}
const DARK: Record<string, string> = {
  background: "oklch(0.2679 0.0036 106.6427)",
  foreground: "oklch(0.9576 0.0027 106.4494)",
  card: "oklch(0.2928 0.0018 106.5092)",
  "card-foreground": "oklch(0.9818 0.0054 95.0986)",
  popover: "oklch(0.3085 0.0035 106.6039)",
  "popover-foreground": "oklch(0.9211 0.0040 106.4781)",
  primary: "oklch(0.6724 0.1308 38.7559)",
  "primary-foreground": "oklch(0.1908 0.0020 106.5859)",
  secondary: "oklch(0.9818 0.0054 95.0986)",
  "secondary-foreground": "oklch(0.3085 0.0035 106.6039)",
  muted: "oklch(0.2213 0.0038 106.7070)",
  "muted-foreground": "oklch(0.7713 0.0169 99.0657)",
  accent: "oklch(0.2130 0.0078 95.4245)",
  "accent-foreground": "oklch(0.9663 0.0080 98.8792)",
  destructive: "oklch(0.6368 0.2078 25.3313)",
  "destructive-foreground": "oklch(1.0000 0 0)",
  border: "oklch(0.3618 0.0101 106.8928)",
  input: "oklch(0.4336 0.0113 100.2195)",
  ring: "oklch(0.6724 0.1308 38.7559)",
  "chart-1": "oklch(0.5583 0.1276 42.9956)",
  "chart-2": "oklch(0.6898 0.1581 290.4107)",
  "chart-3": "oklch(0.2130 0.0078 95.4245)",
  "chart-4": "oklch(0.3074 0.0516 289.3230)",
  "chart-5": "oklch(0.5608 0.1348 42.0584)",
  sidebar: "oklch(0.2357 0.0024 67.7077)",
  "sidebar-foreground": "oklch(0.8074 0.0142 93.0137)",
  "sidebar-primary": "oklch(0.3250 0 0)",
  "sidebar-primary-foreground": "oklch(0.9881 0 0)",
  "sidebar-accent": "oklch(0.1680 0.0020 106.6177)",
  "sidebar-accent-foreground": "oklch(0.8074 0.0142 93.0137)",
  "sidebar-border": "oklch(0.9401 0 0)",
  "sidebar-ring": "oklch(0.7731 0 0)",
}
/** Outfit and Geist Mono as the self-hosted font catalog writes them (packages/ui/src/lib/fonts.ts). */
const SANS = ["Outfit Variable", "Outfit", "ui-sans-serif", "system-ui", "sans-serif"]
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

  it("uses the catalog Outfit and Geist Mono stacks, a 1rem radius scale, and the source shadow profile", () => {
    expect(theme.typography.heading.font.$value).toEqual(SANS)
    expect(theme.typography.body.font.$value).toEqual(SANS)
    expect(theme.typography.mono.$value).toEqual(MONO)
    expect([theme.typography.heading.tracking.$value, theme.typography.body.tracking.$value]).toEqual(["0em", "0em"])
    expect(Object.fromEntries(Object.entries(theme.radius).map(([k, v]) => [k, v.$value]))).toEqual(deriveRadiusScale("1rem"))
    expect(theme.space.base.$value).toBe("0.25rem")
    const profile = readShadowProfile(theme)
    expect(profile).toEqual({ color: "oklch(0 0 0)", opacity: 0.1, blur: "3px", spread: "0px", offsetX: "0px", offsetY: "1px" })
    expect(Object.fromEntries(Object.entries(theme.shadow).map(([k, v]) => [k, v.$value]))).toEqual(deriveShadowTiers(profile))
    expect(theme.uiEffects).toBeUndefined()
    expect(renderUiEffectsCss(theme)).toBe("")
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
