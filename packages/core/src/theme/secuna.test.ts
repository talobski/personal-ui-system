import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  BASE_COLOR_TOKENS,
  deriveRadiusScale,
  deriveShadowTiers,
  evaluateContextRequest,
  normalizeColor,
  readShadowProfile,
  renderPortableThemeCss,
  renderShadcnTailwindCss,
  resolveUiEffects,
  SIDEBAR_COLOR_TOKENS,
  SIDEBAR_TOKEN_ALIASES,
  TONE_DEFAULTS,
  TONE_NAMES,
  TONE_TOKENS,
  toPortableTheme,
  validateTheme,
} from "../index"
import report from "./fixtures/secuna.conversion.json"
import secunaFixture from "./fixtures/secuna.json"

/**
 * Every value below is transcribed from the owner's Secuna CSS export (2026-10-24), not read from the fixture: the 24
 * base colours per mode, and the Light tones. Sidebar colours are base aliases in the export. DARK_TONES are the
 * re-derived Dark pairs recorded in secuna.conversion.json `tones.darkAdaptation`; STALE_DARK_TONES are the export's
 * own Dark tones (the shared defaults in the old colour order), which are replaced.
 */
const LIGHT: Record<string, string> = {
  background: "oklch(1 0 0)",
  foreground: "oklch(0.144788 0 0)",
  card: "oklch(1 0 0)",
  "card-foreground": "oklch(0.144788 0 0)",
  popover: "oklch(1 0 0)",
  "popover-foreground": "oklch(0.144788 0 0)",
  primary: "oklch(0.384591 0.084795 237.639959)",
  "primary-foreground": "oklch(0.985104 0 0)",
  secondary: "oklch(0.955677 0.005063 228.81956)",
  "secondary-foreground": "oklch(0.204627 0 0)",
  muted: "oklch(0.955677 0.005063 228.81956)",
  "muted-foreground": "oklch(0.589841 0.007551 233.726491)",
  accent: "oklch(0.955677 0.005063 228.81956)",
  "accent-foreground": "oklch(0.204627 0 0)",
  destructive: "oklch(0.583043 0.238666 28.47648)",
  "destructive-foreground": "oklch(1 0 0)",
  border: "oklch(0.91685 0.003523 219.535144)",
  input: "oklch(0.91685 0.003523 219.535144)",
  ring: "oklch(0.840962 0.021609 227.577555)",
  "chart-1": "oklch(0.76819 0.105043 230.427158)",
  "chart-2": "oklch(0.680171 0.11316 232.087899)",
  "chart-3": "oklch(0.595904 0.114913 234.529634)",
  "chart-4": "oklch(0.512267 0.101138 234.85164)",
  "chart-5": "oklch(0.422429 0.087625 236.386895)",
}
const DARK: Record<string, string> = {
  background: "oklch(0.17227 0.010216 220.179599)",
  foreground: "oklch(0.985104 0 0)",
  card: "oklch(0.194068 0.014448 230.039647)",
  "card-foreground": "oklch(0.985104 0 0)",
  popover: "oklch(0.25236 0.021351 234.32041)",
  "popover-foreground": "oklch(0.985104 0 0)",
  primary: "oklch(0.921906 0 0)",
  "primary-foreground": "oklch(0.17227 0.010216 220.179599)",
  secondary: "oklch(0.306038 0.029634 233.357117)",
  "secondary-foreground": "oklch(0.985104 0 0)",
  muted: "oklch(0.228542 0.016247 232.709263)",
  "muted-foreground": "oklch(0.562268 0.042451 231.737285)",
  accent: "oklch(0.306038 0.029634 233.357117)",
  "accent-foreground": "oklch(0.985104 0 0)",
  destructive: "oklch(0.702184 0.189226 22.227873)",
  "destructive-foreground": "oklch(0.985104 0 0)",
  border: "oklch(0.25236 0.021351 234.32041)",
  input: "oklch(0.306038 0.029634 233.357117)",
  ring: "oklch(0.391341 0.050073 233.162645)",
  "chart-1": "oklch(0.655402 0.116384 235.895985)",
  "chart-2": "oklch(0.577337 0.11829 238.36944)",
  "chart-3": "oklch(0.425669 0.094942 240.342809)",
  "chart-4": "oklch(0.361759 0.082015 240.276901)",
  "chart-5": "oklch(0.286751 0.064961 239.339402)",
}
const LIGHT_TONES: Record<string, string> = {
  "tone-1": "oklch(0.932654 0.026597 246.350513)",
  "tone-1-foreground": "oklch(0.434752 0.06068 247.78674)",
  "tone-2": "oklch(0.920863 0.034545 350.016329)",
  "tone-2-foreground": "oklch(0.450031 0.100009 355.025246)",
  "tone-3": "oklch(0.919284 0.04008 114.874629)",
  "tone-3-foreground": "oklch(0.429919 0.069868 118.409497)",
  "tone-4": "oklch(0.920502 0.034643 300.295208)",
  "tone-4-foreground": "oklch(0.439526 0.099892 299.691131)",
  "tone-5": "oklch(0.920509 0.039358 71.017279)",
  "tone-5-foreground": "oklch(0.43974 0.080099 70.873576)",
  "tone-6": "oklch(0.919386 0.034445 196.567802)",
  "tone-6-foreground": "oklch(0.429716 0.070065 200.290858)",
}
const DARK_TONES: Record<string, string> = {
  "tone-1": "oklch(0.28 0.026597 246.350513)",
  "tone-1-foreground": "oklch(0.84 0.06068 247.78674)",
  "tone-2": "oklch(0.28 0.034545 350.016329)",
  "tone-2-foreground": "oklch(0.84 0.08 355.025246)",
  "tone-3": "oklch(0.28 0.04008 114.874629)",
  "tone-3-foreground": "oklch(0.84 0.069868 118.409497)",
  "tone-4": "oklch(0.28 0.034643 300.295208)",
  "tone-4-foreground": "oklch(0.84 0.08 299.691131)",
  "tone-5": "oklch(0.28 0.039358 71.017279)",
  "tone-5-foreground": "oklch(0.84 0.08 70.873576)",
  "tone-6": "oklch(0.28 0.034445 196.567802)",
  "tone-6-foreground": "oklch(0.84 0.070065 200.290858)",
}
const STALE_DARK_TONES: Record<string, string> = {
  "tone-1": "oklch(0.320862 0.049065 248.554392)",
  "tone-1-foreground": "oklch(0.819769 0.090567 249.952038)",
  "tone-2": "oklch(0.320198 0.04913 56.089672)",
  "tone-2-foreground": "oklch(0.819821 0.089667 55.006628)",
  "tone-3": "oklch(0.318188 0.050165 317.87645)",
  "tone-3-foreground": "oklch(0.819902 0.089787 318.258574)",
  "tone-4": "oklch(0.320342 0.051431 342.552036)",
  "tone-4-foreground": "oklch(0.739886 0.079665 343.070017)",
  "tone-5": "oklch(0.318937 0.0499 201.104966)",
  "tone-5-foreground": "oklch(0.820021 0.089715 200.032658)",
  "tone-6": "oklch(0.319589 0.049439 284.86901)",
  "tone-6-foreground": "oklch(0.81897 0.090969 284.911132)",
}
const HEADING = ["Space Grotesk Variable", "Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"]
const BODY = ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
const MONO = ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"]

const result = validateTheme(secunaFixture)
if (!result.ok) throw new Error(JSON.stringify(result.issues))
const theme = result.theme
const block = (css: string, selector: ":root {" | ".dark {") => css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)))
const declared = (css: string, selector: ":root {" | ".dark {", name: string) => new RegExp(`^  --${name}: (.*);$`, "m").exec(block(css, selector))?.[1]
const nums = (value: string) => value.match(/[\d.]+/g)!.map(Number) as [number, number, number]

/** WCAG 2.x contrast of two canonical OKLCH colours, through linear sRGB (every Secuna tone is inside sRGB). */
function contrast(a: string, b: string): number {
  const luminance = (value: string) => {
    const [l, c, h] = nums(value)
    const [x, y] = [c * Math.cos((h * Math.PI) / 180), c * Math.sin((h * Math.PI) / 180)]
    const [lc, mc, sc] = [l + 0.3963377774 * x + 0.2158037573 * y, l - 0.1055613458 * x - 0.0638541728 * y, l - 0.0894841775 * x - 1.291485548 * y].map((v) => v ** 3) as [number, number, number]
    const linear = [4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc, -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc, -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc]
    for (const channel of linear) expect(channel).toBeGreaterThanOrEqual(-1e-6)
    return linear.reduce((sum, v, i) => sum + [0.2126, 0.7152, 0.0722][i]! * Math.min(1, Math.max(0, v)), 0)
  }
  const [p, q] = [luminance(a), luminance(b)]
  return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05)
}

describe("Secuna canonical fixture", () => {
  it("is a canonical Theme v3 fixture: validation is a fixed point", () => {
    expect(theme).toMatchObject({ id: "secuna", name: "Secuna", revision: 1, schemaVersion: "3.0", kind: "personal-ui-theme" })
    expect(theme.$extensions).toEqual({ "personal-ui-system": { displayName: "Secuna" } })
    expect(`${JSON.stringify(theme, null, 2)}\n`).toBe(readFileSync(new URL("./fixtures/secuna.json", import.meta.url), "utf8"))
    expect(Object.keys(secunaFixture)).toEqual(["$schema", "schemaVersion", "kind", "id", "name", "revision", "colors", "tones", "typography", "radius", "space", "shadow", "motion", "sidebar", "$extensions"])
  })

  it("keeps all 24 source colours per mode numerically unchanged, and the Sidebar as base aliases", () => {
    for (const [mode, table] of [["light", LIGHT], ["dark", DARK]] as const) {
      for (const name of BASE_COLOR_TOKENS) {
        const source = table[name]!
        const value = theme.colors[mode][name].$value
        expect(value, `${mode}.${name}`).toBe(normalizeColor(source).ok && (normalizeColor(source) as { value: string }).value)
        expect(value, `${mode}.${name}`).toBe(source)
        expect(report.values[`colors.${mode}.${name}` as keyof typeof report.values]).toEqual({ source, normalized: value })
      }
      for (const name of SIDEBAR_COLOR_TOKENS) expect(theme.colors[mode][name].$value, `${mode}.${name}`).toBe(theme.colors[mode][SIDEBAR_TOKEN_ALIASES[name]].$value)
    }
    expect(theme.sidebar).toEqual({ useDedicatedTokens: { $type: "boolean", $value: false }, dedicatedValuesInitialized: false })
    const css = renderShadcnTailwindCss(theme)
    for (const [selector, mode] of [[":root {", "light"], [".dark {", "dark"]] as const) {
      for (const name of BASE_COLOR_TOKENS) expect(declared(css, selector, name), `${mode}.${name}`).toBe(theme.colors[mode][name].$value)
      for (const name of SIDEBAR_COLOR_TOKENS) expect(declared(css, selector, name), `${mode}.${name}`).toBe(`var(--${SIDEBAR_TOKEN_ALIASES[name]})`)
    }
  })

  it("uses Space Grotesk headings over Inter, the system mono stack, a 0.9rem radius scale, the source shadows, and no UI effects", () => {
    expect(theme.typography.heading.font.$value).toEqual(HEADING)
    expect(theme.typography.body.font.$value).toEqual(BODY)
    expect(theme.typography.mono.$value).toEqual(MONO)
    expect([theme.typography.heading.weight.$value, theme.typography.body.weight.$value]).toEqual([600, 400])
    expect([theme.typography.heading.tracking.$value, theme.typography.body.tracking.$value]).toEqual(["0em", "0em"])
    expect(Object.fromEntries(Object.entries(theme.radius).map(([k, v]) => [k, v.$value]))).toEqual({ base: "0.9rem", sm: "0.65rem", md: "0.775rem", lg: "0.9rem", xl: "1.15rem" })
    expect(Object.fromEntries(Object.entries(theme.radius).map(([k, v]) => [k, v.$value]))).toEqual(deriveRadiusScale("0.9rem"))
    expect([theme.space.base.$value, theme.space.density.$value]).toEqual(["0.25rem", 1])
    expect([theme.motion.durationFast.$value, theme.motion.durationBase.$value, theme.motion.reducedMotion.$value]).toEqual(["150ms", "200ms", "reduce"])
    const profile = readShadowProfile(theme)
    expect(profile).toEqual(report.shadow.profile)
    expect(Object.fromEntries(Object.entries(theme.shadow).map(([k, v]) => [k, v.$value]))).toEqual(deriveShadowTiers(profile))
    expect(theme.uiEffects).toBeUndefined()
    expect(resolveUiEffects(theme)).toEqual({ effect: "off", strength: 50 })
  })
})

describe("Secuna tones", () => {
  it("keeps the owner's Light tones verbatim and replaces the stale Dark tones in both renders and exports", () => {
    const css = renderShadcnTailwindCss(theme)
    for (const [selector, mode, table] of [[":root {", "light", LIGHT_TONES], [".dark {", "dark", DARK_TONES]] as const) {
      expect(Object.keys(theme.tones![mode])).toEqual([...TONE_TOKENS])
      for (const token of TONE_TOKENS) {
        const value = theme.tones![mode][token].$value
        expect(value, `${mode}.${token}`).toBe(table[token])
        expect(normalizeColor(value)).toEqual({ ok: true, value })
        expect(declared(css, selector, token), `${mode}.${token}`).toBe(value)
        expect(report.values[`tones.${mode}.${token}` as keyof typeof report.values].normalized).toBe(value)
      }
    }
    // The export's Dark tones were the shared defaults in the old colour order; none survives.
    expect(STALE_DARK_TONES).toEqual(TONE_DEFAULTS.dark)
    expect(report.tones.staleDark).toEqual(STALE_DARK_TONES)
    for (const token of TONE_TOKENS) expect(theme.tones!.dark[token].$value, token).not.toBe(STALE_DARK_TONES[token])
    expect(toPortableTheme(theme).tones).toEqual(theme.tones)
    expect(renderPortableThemeCss(theme)).toContain(`  --tone-1: ${DARK_TONES["tone-1"]};`)
  })

  it("gives each Dark pair its Light hues and background chroma: subdued fills between border and secondary, soft readable text", () => {
    const border = nums(theme.colors.dark.border.$value)[0]
    const secondary = nums(theme.colors.dark.secondary.$value)[0]
    for (const name of TONE_NAMES) {
      const [lightBg, lightFg] = [nums(theme.tones!.light[`tone-${name}`].$value), nums(theme.tones!.light[`tone-${name}-foreground`].$value)]
      const [darkBg, darkFg] = [nums(theme.tones!.dark[`tone-${name}`].$value), nums(theme.tones!.dark[`tone-${name}-foreground`].$value)]
      expect([darkBg[2], darkFg[2]], name).toEqual([lightBg[2], lightFg[2]])
      expect(darkBg[1], name).toBe(lightBg[1])
      expect(darkBg[0], name).toBeGreaterThan(border)
      expect(darkBg[0], name).toBeLessThan(secondary)
      expect(darkFg[1], name).toBe(Math.min(lightFg[1], 0.08))
    }
    expect(new Set(TONE_NAMES.map((name) => nums(theme.tones!.light[`tone-${name}`].$value)[2])).size).toBe(6)
  })

  it("measures every tone pair at 4.5:1 or more in both modes, as the report records", () => {
    for (const mode of ["light", "dark"] as const) {
      for (const name of TONE_NAMES) {
        const ratio = contrast(theme.tones![mode][`tone-${name}-foreground`].$value, theme.tones![mode][`tone-${name}`].$value)
        expect(ratio, `${mode}.${name}`).toBeGreaterThanOrEqual(4.5)
        const entry = report.tones.contrast.pairs.find((pair) => pair.mode === mode && pair.pair === `tone-${name}-foreground on tone-${name}`)
        expect(entry?.ratio, `${mode}.${name}`).toBe(Number(ratio.toFixed(2)))
      }
    }
  })
})

describe("Secuna contrast debt", () => {
  it("records the owner-kept text pairs below 4.5:1 rather than adjusting them", () => {
    expect(report.contrastDebt.pairs.map((pair) => `${pair.mode}: ${pair.pair}`)).toEqual([
      "light: muted-foreground on muted",
      "light: muted-foreground on background",
      "light: muted-foreground on card",
      "dark: muted-foreground on muted",
      "dark: muted-foreground on background",
      "dark: muted-foreground on card",
      "dark: destructive-foreground on destructive",
    ])
    for (const pair of report.contrastDebt.pairs) expect(pair.ratio).toBeLessThan(4.5)
  })
})

describe("core retrieval serves Secuna", () => {
  it("returns canonical v3 secuna with fixture provenance", async () => {
    const got = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "get", theme: "secuna", resource: "button" })
    if (!got.ok || got.operation !== "get") throw new Error("expected get")
    expect(got.theme).toEqual(theme)
    expect(got.provenance.theme.sourceId).toBe("packages/core/src/theme/fixtures/secuna.json")
  })
})
