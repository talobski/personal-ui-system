import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  applyMutation,
  BASE_COLOR_TOKENS,
  deriveRadiusScale,
  deriveShadowTiers,
  evaluateContextRequest,
  MUTATION_SCHEMA_VERSION,
  normalizeColor,
  parseCanonicalOklch,
  readShadowProfile,
  renderShadcnTailwindCss,
  renderUiEffectsCss,
  resolveUiEffects,
  SIDEBAR_COLOR_TOKENS,
  SIDEBAR_TOKEN_ALIASES,
  validateTheme,
} from "../index"
import type { Theme, ThemeOperation } from "../index"
import report from "./fixtures/amber-dusk.conversion.json"
import amberDuskFixture from "./fixtures/amber-dusk.json"
import defaultFixture from "./fixtures/default.json"

/**
 * ADSR-02 (PUI-123). Every source value below is transcribed independently from the owner-supplied stylesheet in the
 * frozen PUI-123 snapshot (docs/evidence/amber-dusk-shell-refinement-v1/linear/PUI-123.json), not read from the fixture.
 */
const LIGHT: Record<string, string> = {
  background: "oklch(0.9818 0.0054 95.0986)",
  foreground: "oklch(0.3438 0.0269 95.7226)",
  card: "oklch(0.9818 0.0054 95.0986)",
  "card-foreground": "oklch(0.1908 0.0020 106.5859)",
  popover: "oklch(1.0000 0 0)",
  "popover-foreground": "oklch(0.2671 0.0196 98.9390)",
  primary: "oklch(0.6171 0.1375 39.0427)",
  "primary-foreground": "oklch(1.0000 0 0)",
  secondary: "oklch(0.9245 0.0138 92.9892)",
  "secondary-foreground": "oklch(0.4334 0.0177 98.6048)",
  muted: "oklch(0.9341 0.0153 90.2390)",
  "muted-foreground": "oklch(0.6059 0.0075 97.4233)",
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
  foreground: "oklch(0.8074 0.0142 93.0137)",
  card: "oklch(0.2679 0.0036 106.6427)",
  "card-foreground": "oklch(0.9818 0.0054 95.0986)",
  popover: "oklch(0.3085 0.0035 106.6039)",
  "popover-foreground": "oklch(0.9211 0.0040 106.4781)",
  primary: "oklch(0.6724 0.1308 38.7559)",
  "primary-foreground": "oklch(1.0000 0 0)",
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
const SANS = ["ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "sans-serif", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"]
const MONO = ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"]
/** The source `--shadow-*` tiers, with `hsl(0 0% 0% / a)` written as its exact OKLCH equivalent `oklch(0 0 0 / a)`. */
const layer = (y: string, blur: string, spread: string, alpha: number) => ({ inset: false, offsetX: "0px", offsetY: y, blur, spread, color: `oklch(0 0 0 / ${alpha})` })
const SOURCE_SHADOWS = {
  "2xs": [layer("1px", "3px", "0px", 0.05)],
  xs: [layer("1px", "3px", "0px", 0.05)],
  sm: [layer("1px", "3px", "0px", 0.1), layer("1px", "2px", "-1px", 0.1)],
  default: [layer("1px", "3px", "0px", 0.1), layer("1px", "2px", "-1px", 0.1)],
  md: [layer("1px", "3px", "0px", 0.1), layer("2px", "4px", "-1px", 0.1)],
  lg: [layer("1px", "3px", "0px", 0.1), layer("4px", "6px", "-1px", 0.1)],
  xl: [layer("1px", "3px", "0px", 0.1), layer("8px", "10px", "-1px", 0.1)],
  "2xl": [layer("1px", "3px", "0px", 0.25)],
}

/**
 * The owner-authorized contrast overrides (docs/evidence/amber-dusk-shell-refinement-v1/owner-contrast-resolution.json),
 * transcribed independently: every other colour is still exactly its normalized source value.
 */
const OVERRIDES: Record<string, string> = {
  "light.muted-foreground": "oklch(0.5176 0.0075 97.4233)",
  "light.primary": "oklch(0.5773 0.1375 39.0427)",
  "dark.primary-foreground": "oklch(0.2679 0.0036 106.6427)",
}

/** WCAG 2.x contrast of two canonical OKLCH colours as rendered: sRGB channels rounded to 8 bits, as HEX. */
function contrast(a: string, b: string): number {
  const channels = (value: string) => {
    const p = parseCanonicalOklch(value)!
    const L = p.l + 0.3963377774 * p.c * Math.cos((p.h * Math.PI) / 180) + 0.2158037573 * p.c * Math.sin((p.h * Math.PI) / 180)
    const M = p.l - 0.1055613458 * p.c * Math.cos((p.h * Math.PI) / 180) - 0.0638541728 * p.c * Math.sin((p.h * Math.PI) / 180)
    const S = p.l - 0.0894841775 * p.c * Math.cos((p.h * Math.PI) / 180) - 1.291485548 * p.c * Math.sin((p.h * Math.PI) / 180)
    const [l, m, s] = [L ** 3, M ** 3, S ** 3]
    const linear = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
    return linear.map((c) => {
      const encoded = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(c, 0) ** (1 / 2.4) - 0.055
      const byte = Math.round(Math.min(1, Math.max(0, encoded)) * 255) / 255
      return byte <= 0.04045 ? byte / 12.92 : ((byte + 0.055) / 1.055) ** 2.4
    })
  }
  const luminance = (value: string) => channels(value).reduce((sum, c, i) => sum + [0.2126, 0.7152, 0.0722][i]! * c, 0)
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

const valid = (input: unknown): Theme => {
  const result = validateTheme(input)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.theme
}
const theme = valid(amberDuskFixture)
const edit = (input: Theme, ...operations: ThemeOperation[]) => {
  const result = applyMutation(input, { schemaVersion: MUTATION_SCHEMA_VERSION, requestId: "adsr", base: { themeId: input.id, revision: input.revision }, operations })
  if (!result.ok) throw new Error(JSON.stringify(result.errors))
  return result.theme
}
const block = (css: string, selector: ":root {" | ".dark {") => css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)))
const declared = (css: string, selector: ":root {" | ".dark {", name: string) => new RegExp(`^  --${name}: (.*);$`, "m").exec(block(css, selector))?.[1]

describe("ADSR-02 Amber Dusk canonical fixture", () => {
  it("is an immutable-shaped canonical Theme v3 fixture: validation is a fixed point", () => {
    expect(theme).toMatchObject({ id: "amber-dusk", name: "Amber Dusk", revision: 1, schemaVersion: "3.0", kind: "personal-ui-theme" })
    expect(theme.$extensions).toEqual({ "personal-ui-system": { displayName: "Amber Dusk" } })
    expect(`${JSON.stringify(theme, null, 2)}\n`).toBe(readFileSync(new URL("./fixtures/amber-dusk.json", import.meta.url), "utf8"))
  })

  it("maps all 32 source colours per mode, including five chart and eight dedicated Sidebar tokens, through normalizeColor", () => {
    for (const [mode, table] of [["light", LIGHT], ["dark", DARK]] as const) {
      expect(Object.keys(table)).toHaveLength(32)
      expect(Object.keys(theme.colors[mode]).sort()).toEqual(Object.keys(table).sort())
      for (const [name, source] of Object.entries(table)) {
        const override = OVERRIDES[`${mode}.${name}`]
        if (override !== undefined) {
          expect(theme.colors[mode][name as keyof Theme["colors"]["light"]].$value, `${mode}.${name}`).toBe(override)
          continue
        }
        const normalized = normalizeColor(source)
        expect(normalized.ok, `${mode}.${name}`).toBe(true)
        expect(theme.colors[mode][name as keyof Theme["colors"]["light"]].$value, `${mode}.${name}`).toBe(normalized.ok && normalized.value)
        // OKLCH input is only rounded, never converted: the canonical value is numerically the source.
        const nums = (text: string) => text.match(/[\d.]+/g)!.map(Number)
        expect(nums(theme.colors[mode][name as keyof Theme["colors"]["light"]].$value)).toEqual(nums(source))
      }
    }
  })

  it("dedicated Sidebar tokens are initialized and on, so the supplied Sidebar colours render in both modes", () => {
    expect(theme.sidebar).toEqual({ useDedicatedTokens: { $type: "boolean", $value: true }, dedicatedValuesInitialized: true })
    const css = renderShadcnTailwindCss(theme)
    for (const [selector, mode] of [[":root {", "light"], [".dark {", "dark"]] as const) {
      for (const name of SIDEBAR_COLOR_TOKENS) expect(declared(css, selector, name), `${mode}.${name}`).toBe(theme.colors[mode][name].$value)
      for (const name of BASE_COLOR_TOKENS) expect(declared(css, selector, name), `${mode}.${name}`).toBe(theme.colors[mode][name].$value)
    }
  })

  it("turning dedicated Sidebar off renders the base aliases and preserves the stored dedicated values; on restores them", () => {
    const off = edit(theme, { op: "setSidebarTokensEnabled", value: false })
    const css = renderShadcnTailwindCss(off)
    for (const selector of [":root {", ".dark {"] as const) {
      for (const name of SIDEBAR_COLOR_TOKENS) expect(declared(css, selector, name)).toBe(`var(--${SIDEBAR_TOKEN_ALIASES[name]})`)
    }
    expect(off.colors).toEqual(theme.colors)
    expect(off.sidebar.dedicatedValuesInitialized).toBe(true)
    const on = edit(off, { op: "setSidebarTokensEnabled", value: true })
    expect(renderShadcnTailwindCss(on).replace(/revision \d+/, "")).toBe(renderShadcnTailwindCss(theme).replace(/revision \d+/, ""))
  })

  it("maps typography to the supported Heading/Body/Mono fields only; no serif role", () => {
    expect(theme.typography.heading.font.$value).toEqual(SANS)
    expect(theme.typography.body.font.$value).toEqual(SANS)
    expect(theme.typography.mono.$value).toEqual(MONO)
    expect(theme.typography.heading.tracking.$value).toBe("0em")
    expect(theme.typography.body.tracking.$value).toBe("0em")
    expect([theme.typography.heading.weight.$value, theme.typography.body.weight.$value]).toEqual([600, 400])
    expect(Object.keys(theme.typography).sort()).toEqual(["body", "heading", "mono"])
    expect(JSON.stringify(theme)).not.toMatch(/ui-serif|Georgia|Cambria/)
  })

  it("maps 0.5rem radius to the derived scale and 0.25rem spacing to the accepted space fields", () => {
    expect(Object.fromEntries(Object.entries(theme.radius).map(([k, v]) => [k, v.$value]))).toEqual({ base: "0.5rem", sm: "0.25rem", md: "0.375rem", lg: "0.5rem", xl: "0.75rem" })
    expect(deriveRadiusScale("0.5rem")).toEqual(Object.fromEntries(Object.entries(theme.radius).map(([k, v]) => [k, v.$value])))
    expect(theme.space.base.$value).toBe("0.25rem")
    expect(theme.space.density.$value).toBe(1)
  })

  it("stores the eight source shadow tiers as typed layers, reconciled with the source profile (no duplicate variables)", () => {
    expect(Object.fromEntries(Object.entries(theme.shadow).map(([k, v]) => [k, v.$value]))).toEqual(SOURCE_SHADOWS)
    const profile = readShadowProfile(theme)
    expect(profile).toEqual({ color: "oklch(0 0 0)", opacity: 0.1, blur: "3px", spread: "0px", offsetX: "0px", offsetY: "1px" })
    expect(deriveShadowTiers(profile)).toEqual(SOURCE_SHADOWS)
    const css = renderShadcnTailwindCss(theme)
    expect(css).not.toMatch(/--shadow-(?:x|y|blur|spread|opacity|color):/)
    expect(css).not.toMatch(/--font-serif|--tracking-normal/)
    const names = [...block(css, ":root {").matchAll(/^ {2}(--[a-z0-9-]+):/gm)].map((m) => m[1])
    expect(new Set(names).size).toBe(names.length)
  })

  it("starts with UI Effects Off; the generic Tactile renderer applies once selected", () => {
    expect(theme.uiEffects).toBeUndefined()
    expect(resolveUiEffects(theme)).toEqual({ effect: "off", strength: 50 })
    expect(renderUiEffectsCss(theme)).toBe("")
    const tactile = edit(theme, { op: "setUiEffects", value: { effect: "tactile", strength: 50 } })
    const reference = edit(valid(defaultFixture), { op: "setUiEffects", value: { effect: "tactile", strength: 50 } })
    expect(renderUiEffectsCss(tactile)).toBe(renderUiEffectsCss(reference))
  })

  it("owner contrast overrides: exactly three tokens change, and the observed normal-text pairs clear 4.5:1", () => {
    const changed = (["light", "dark"] as const).flatMap((mode) =>
      Object.entries(mode === "light" ? LIGHT : DARK).filter(([name, source]) => {
        const n = normalizeColor(source)
        return n.ok && theme.colors[mode][name as keyof Theme["colors"]["light"]].$value !== n.value
      }).map(([name]) => `${mode}.${name}`))
    expect(changed.sort()).toEqual(Object.keys(OVERRIDES).sort())
    // Only lightness moved for the two light overrides; the dark foreground reuses the existing dark background colour.
    const lch = (value: string) => parseCanonicalOklch(value)!
    for (const key of ["light.muted-foreground", "light.primary"]) {
      const [mode, name] = key.split(".") as ["light", string]
      const source = lch(normalizeColor(LIGHT[name]!).ok ? (normalizeColor(LIGHT[name]!) as { value: string }).value : "")
      const now = lch(theme.colors[mode][name as keyof Theme["colors"]["light"]].$value)
      expect([now.c, now.h]).toEqual([source.c, source.h])
      expect(now.l).toBeLessThan(source.l)
    }
    expect(theme.colors.dark["primary-foreground"].$value).toBe(theme.colors.dark.background.$value)
    const light = theme.colors.light, dark = theme.colors.dark
    // Before: the resolution's observed failures, measured on the original source values.
    expect(contrast("oklch(0.6059 0.0075 97.4233)", light.sidebar.$value)).toBeCloseTo(3.49, 2)
    expect(contrast("oklch(0.6059 0.0075 97.4233)", light.background.$value)).toBeCloseTo(3.65, 2)
    expect(contrast("oklch(1 0 0)", "oklch(0.6171 0.1375 39.0427)")).toBeCloseTo(3.9, 1)
    expect(contrast("oklch(1 0 0)", dark.primary.$value)).toBeCloseTo(3.12, 2)
    // After: every observed pair, plus the muted surface itself, is at least 4.5:1.
    const pairs: [string, string, string][] = [
      ["light muted-foreground on sidebar", light["muted-foreground"].$value, light.sidebar.$value],
      ["light muted-foreground on background", light["muted-foreground"].$value, light.background.$value],
      ["light muted-foreground on muted", light["muted-foreground"].$value, light.muted.$value],
      ["light muted-foreground on card", light["muted-foreground"].$value, light.card.$value],
      ["light primary-foreground on primary", light["primary-foreground"].$value, light.primary.$value],
      ["dark primary-foreground on primary", dark["primary-foreground"].$value, dark.primary.$value],
    ]
    for (const [label, fg, bg] of pairs) expect(contrast(fg, bg), label).toBeGreaterThanOrEqual(4.5)
    // Primary as text is not made worse in either mode.
    expect(contrast(light.primary.$value, light.background.$value)).toBeGreaterThan(contrast("oklch(0.6171 0.1375 39.0427)", light.background.$value))
    expect(contrast(dark.primary.$value, dark.background.$value)).toBeGreaterThanOrEqual(4.5)
    // The report records the authority, the original source and each override.
    expect(report.ownerContrastOverrides.document).toBe("docs/evidence/amber-dusk-shell-refinement-v1/owner-contrast-resolution.json")
    for (const [key, value] of Object.entries(OVERRIDES)) {
      const entry = report.ownerContrastOverrides.values[`colors.${key}` as keyof typeof report.ownerContrastOverrides.values]
      expect(entry.override).toBe(value)
      expect(entry.source).toBe((key.startsWith("light") ? LIGHT : DARK)[key.split(".")[1]!])
    }
  })

  it("the conversion report records every original source colour and its canonical normalization", () => {
    for (const [mode, table] of [["light", LIGHT], ["dark", DARK]] as const) {
      for (const [name, source] of Object.entries(table)) {
        const normalized = normalizeColor(source)
        expect(report.values[`colors.${mode}.${name}` as keyof typeof report.values]).toEqual({ source, normalized: normalized.ok && normalized.value })
        if (OVERRIDES[`${mode}.${name}`] === undefined) expect(theme.colors[mode][name as keyof Theme["colors"]["light"]].$value).toBe(normalized.ok && normalized.value)
      }
    }
    expect(Object.keys(report.values)).toHaveLength(64)
    expect(report.source.document).toBe("docs/evidence/amber-dusk-shell-refinement-v1/linear/PUI-123.json")
  })
})

describe("ADSR-02 core retrieval serves Amber Dusk", () => {
  it("returns canonical v3 amber-dusk with fixture provenance and dedicated Sidebar on", async () => {
    const result = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "get", theme: "amber-dusk", resource: "button" })
    if (!result.ok || result.operation !== "get") throw new Error("expected get")
    expect(result.theme).toEqual(theme)
    expect(result.theme.sidebar.useDedicatedTokens.$value).toBe(true)
    expect(result.provenance.theme.sourceId).toBe("packages/core/src/theme/fixtures/amber-dusk.json")
  })
})

describe("ADSR-02 existing built-in fixtures are byte-identical to the accepted base", () => {
  const BASE = "a30f4d3c6a2fad98852fc51ad5e7520d919c7850"
  const committed = (() => {
    try {
      execFileSync("git", ["cat-file", "-e", `${BASE}^{commit}`], { stdio: "ignore" })
      return true
    } catch {
      return false
    }
  })()
  it.skipIf(!committed).each(["default.json", "valid.json", "default.css", "quiet-editorial.css", "default.conversion.json"])("%s", (name) => {
    const path = `packages/core/src/theme/fixtures/${name}`
    const base = execFileSync("git", ["show", `${BASE}:${path}`])
    expect(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)).equals(base)).toBe(true)
  })
})
