import { describe, expect, it } from "vitest"
import { deriveRadiusScale, deriveShadowTiers, normalizeColor, normalizeLength, readShadowProfile, validateTheme } from "../index"
import type { Theme } from "../index"
import report from "./fixtures/default.conversion.json"
import defaultFixture from "./fixtures/default.json"

/**
 * TSV2-02. Every expected value below is transcribed independently from the contract tables in
 * docs/THEME_SYSTEM_V2_IMPLEMENTATION_CONTRACT.md ("Exact built-in Default values"), not read from the fixture.
 */
const LIGHT: Record<string, string> = {
  background: "oklch(1 0 0)", card: "oklch(1 0 0)", popover: "oklch(1 0 0)",
  foreground: "oklch(0.144788 0 0)", "card-foreground": "oklch(0.144788 0 0)", "popover-foreground": "oklch(0.144788 0 0)",
  primary: "oklch(0.204627 0 0)",
  "primary-foreground": "oklch(0.985104 0 0)",
  secondary: "oklch(0.970151 0 0)", muted: "oklch(0.970151 0 0)", accent: "oklch(0.970151 0 0)",
  "secondary-foreground": "oklch(0.204627 0 0)", "accent-foreground": "oklch(0.204627 0 0)",
  "muted-foreground": "oklch(0.555527 0 0)",
  destructive: "oklch(0.583043 0.238666 28.47648)",
  "destructive-foreground": "oklch(1 0 0)",
  border: "oklch(0.921906 0 0)", input: "oklch(0.921906 0 0)",
  ring: "oklch(0.709 0 0)",
  "chart-1": "oklch(0.808777 0.09905 251.753276)",
  "chart-2": "oklch(0.620689 0.189427 259.935809)",
  "chart-3": "oklch(0.549483 0.220236 263.091662)",
  "chart-4": "oklch(0.48933 0.220186 264.040459)",
  "chart-5": "oklch(0.421042 0.179192 266.009449)",
}
const DARK: Record<string, string> = {
  background: "oklch(0.144788 0 0)",
  foreground: "oklch(0.985104 0 0)",
  card: "oklch(0.204627 0 0)",
  "card-foreground": "oklch(0.985104 0 0)",
  popover: "oklch(0.268618 0 0)", secondary: "oklch(0.268618 0 0)", muted: "oklch(0.268618 0 0)",
  "popover-foreground": "oklch(0.985104 0 0)", "secondary-foreground": "oklch(0.985104 0 0)",
  "muted-foreground": "oklch(0.709 0 0)",
  primary: "oklch(0.921906 0 0)",
  "primary-foreground": "oklch(0.204627 0 0)",
  accent: "oklch(0.371495 0 0)",
  "accent-foreground": "oklch(0.985104 0 0)",
  destructive: "oklch(0.702184 0.189226 22.227873)",
  "destructive-foreground": "oklch(0.985104 0 0)",
  border: "oklch(0.276848 0 0)",
  input: "oklch(0.325037 0 0)",
  ring: "oklch(0.555527 0 0)",
  "chart-1": LIGHT["chart-1"]!, "chart-2": LIGHT["chart-2"]!, "chart-3": LIGHT["chart-3"]!, "chart-4": LIGHT["chart-4"]!, "chart-5": LIGHT["chart-5"]!,
}
const layer = (y: string, blur: string, spread: string, alpha: number) => ({
  inset: false, offsetX: "0px", offsetY: y, blur, spread, color: `oklch(0 0 0 / ${alpha})`,
})
const FIRST = (alpha: number) => layer("1px", "3px", "0px", alpha)
const SHADOWS = {
  "2xs": [FIRST(0.05)],
  xs: [FIRST(0.05)],
  sm: [FIRST(0.1), layer("1px", "2px", "-1px", 0.1)],
  default: [FIRST(0.1), layer("1px", "2px", "-1px", 0.1)],
  md: [FIRST(0.1), layer("2px", "4px", "-1px", 0.1)],
  lg: [FIRST(0.1), layer("4px", "6px", "-1px", 0.1)],
  xl: [FIRST(0.1), layer("8px", "10px", "-1px", 0.1)],
  "2xl": [FIRST(0.25)],
}

const theme = (() => {
  const result = validateTheme(defaultFixture)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.theme
})()

describe("built-in Default matches the contract", () => {
  it("identity", () => {
    expect(theme).toMatchObject({ id: "default", name: "Default", revision: 1, schemaVersion: "2.0", kind: "personal-ui-theme" })
  })

  it("every light and dark colour, with no sidebar tokens", () => {
    for (const [mode, table] of [["light", LIGHT], ["dark", DARK]] as const) {
      expect(Object.keys(theme.colors[mode]).sort()).toEqual(Object.keys(table).sort())
      for (const [name, value] of Object.entries(table)) expect(theme.colors[mode][name as keyof Theme["colors"]["light"]].$value, `${mode}.${name}`).toBe(value)
    }
    expect(JSON.stringify(theme)).not.toMatch(/sidebar/)
  })

  it("typography stacks and tracking", () => {
    expect(theme.typography.sans.$value).toEqual([
      "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial",
      "Noto Sans", "sans-serif", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji",
    ])
    expect(theme.typography.serif.$value).toEqual(["ui-serif", "Georgia", "Cambria", "Times New Roman", "Times", "serif"])
    expect(theme.typography.mono.$value).toEqual([
      "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace",
    ])
    expect(theme.typography.tracking.$value).toBe("0em")
  })

  it("radius, spacing, density, and motion", () => {
    expect(Object.fromEntries(Object.entries(theme.radius).map(([k, v]) => [k, v.$value]))).toEqual({
      base: "1.475rem", sm: "1.225rem", md: "1.35rem", lg: "1.475rem", xl: "1.725rem",
    })
    expect(theme.space.base.$value).toBe("0.3rem")
    expect(theme.space.density.$value).toBe(1)
    expect(theme.motion.durationFast.$value).toBe("150ms")
    expect(theme.motion.durationBase.$value).toBe("200ms")
    expect(theme.motion.reducedMotion.$value).toBe("reduce")
  })

  it("exact shadow tiers", () => {
    expect(Object.fromEntries(Object.entries(theme.shadow).map(([k, v]) => [k, v.$value]))).toEqual(SHADOWS)
  })

  it("the radius and shadow tiers are exactly what the manual controls derive from the Default profile", () => {
    expect(deriveRadiusScale("1.475rem")).toEqual({ base: "1.475rem", sm: "1.225rem", md: "1.35rem", lg: "1.475rem", xl: "1.725rem" })
    const profile = readShadowProfile(theme)
    expect(profile).toEqual({ color: "oklch(0 0 0)", opacity: 0.1, blur: "3px", spread: "0px", offsetX: "0px", offsetY: "1px" })
    expect(deriveShadowTiers(profile)).toEqual(SHADOWS)
  })
})

describe("Default conversion report", () => {
  it("records source, precision policy, declared defaults, and unsupported sidebar/export boilerplate", () => {
    expect(report.source.document).toBe("docs/THEME_SYSTEM_V2_IMPLEMENTATION_CONTRACT.md")
    expect(report.precisionPolicy.color).toMatch(/6 decimal places/)
    expect(report.precisionPolicy.length).toMatch(/4 decimal places/)
    expect(Object.keys(report.declaredDefaults)).toEqual(expect.arrayContaining(["motion.durationFast", "motion.durationBase", "space.density"]))
    expect(report.unsupported.map((u) => u.field).join(" ")).toMatch(/sidebar/)
    expect(report.unsupported.map((u) => u.field).join(" ")).toMatch(/boilerplate/)
  })

  it("every normalized value equals the fixture and is a fixed point of the normalizer", () => {
    const values = report.values as Record<string, { source: unknown; normalized: unknown }>
    for (const mode of ["light", "dark"] as const) {
      for (const [name, token] of Object.entries(theme.colors[mode])) {
        const entry = values[`colors.${mode}.${name}`]!
        expect(entry.normalized).toBe(token.$value)
        expect(normalizeColor(entry.source)).toEqual({ ok: true, value: token.$value })
      }
    }
    for (const key of ["radius.base", "radius.sm", "radius.md", "radius.lg", "radius.xl", "space.base", "typography.tracking"]) {
      const entry = values[key]!
      expect(normalizeLength(entry.source)).toBe(entry.normalized)
    }
    for (const tier of Object.keys(SHADOWS)) expect(values[`shadow.${tier}`]!.normalized).toEqual(SHADOWS[tier as keyof typeof SHADOWS])
    expect(values["shadow.profile"]!.normalized).toEqual(readShadowProfile(theme))
  })
})
