import { describe, expect, it } from "vitest"
import { deriveRadiusScale, deriveShadowTiers, isSidebarColorToken, normalizeColor, normalizeLength, readShadowProfile, SIDEBAR_COLOR_TOKENS, SIDEBAR_TOKEN_ALIASES, validateTheme } from "../index"
import type { Theme } from "../index"
import report from "./fixtures/default.conversion.json"
import defaultFixture from "./fixtures/default.json"

/**
 * TSV2-02. Every expected value below is transcribed independently from the contract tables in
 * docs/THEME_SYSTEM_V2_IMPLEMENTATION_CONTRACT.md ("Exact built-in Default values"), with radius/spacing overrides
 * from docs/WORKBENCH_THEME_CONTROLS_POLISH_CONTRACT.md, not read from the fixture.
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
    expect(theme).toMatchObject({ id: "default", name: "Default", revision: 1, schemaVersion: "2.1", kind: "personal-ui-theme" })
  })

  it("every light and dark colour; Sidebar colours are uninitialized copies of their base aliases, off (WSTP-04)", () => {
    for (const [mode, table] of [["light", LIGHT], ["dark", DARK]] as const) {
      expect(Object.keys(theme.colors[mode]).sort()).toEqual([...Object.keys(table), ...SIDEBAR_COLOR_TOKENS].sort())
      for (const [name, value] of Object.entries(table)) expect(theme.colors[mode][name as keyof Theme["colors"]["light"]].$value, `${mode}.${name}`).toBe(value)
      for (const name of SIDEBAR_COLOR_TOKENS) expect(theme.colors[mode][name].$value, `${mode}.${name}`).toBe(table[SIDEBAR_TOKEN_ALIASES[name]])
    }
    expect(theme.sidebar).toEqual({ useDedicatedTokens: { $type: "boolean", $value: false }, dedicatedValuesInitialized: false })
    expect(JSON.stringify(theme)).not.toMatch(/sidebar-(?:input|card)/)
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
      base: "0.7rem", sm: "0.45rem", md: "0.575rem", lg: "0.7rem", xl: "0.95rem",
    })
    expect(theme.space.base.$value).toBe("0.25rem")
    expect(theme.space.density.$value).toBe(1)
    expect(theme.motion.durationFast.$value).toBe("150ms")
    expect(theme.motion.durationBase.$value).toBe("200ms")
    expect(theme.motion.reducedMotion.$value).toBe("reduce")
  })

  it("exact shadow tiers", () => {
    expect(Object.fromEntries(Object.entries(theme.shadow).map(([k, v]) => [k, v.$value]))).toEqual(SHADOWS)
  })

  it("the radius and shadow tiers are exactly what the manual controls derive from the Default profile", () => {
    expect(deriveRadiusScale("0.7rem")).toEqual({ base: "0.7rem", sm: "0.45rem", md: "0.575rem", lg: "0.7rem", xl: "0.95rem" })
    const profile = readShadowProfile(theme)
    expect(profile).toEqual({ color: "oklch(0 0 0)", opacity: 0.1, blur: "3px", spread: "0px", offsetX: "0px", offsetY: "1px" })
    expect(deriveShadowTiers(profile)).toEqual(SHADOWS)
  })
})

describe("Default conversion report", () => {
  it("WTCP-02 retains the historical import and separately records the owner-approved canonical overrides", () => {
    expect(report.values["radius.base"]).toEqual({ source: "1.475rem", normalized: "1.475rem" })
    expect(report.values["space.base"]).toEqual({ source: "0.3rem", normalized: "0.3rem" })
    expect(report.ownerOverrides.document).toBe("docs/WORKBENCH_THEME_CONTROLS_POLISH_CONTRACT.md")
    expect(report.ownerOverrides.values).toEqual({
      "radius.base": "0.7rem", "radius.sm": "0.45rem", "radius.md": "0.575rem",
      "radius.lg": "0.7rem", "radius.xl": "0.95rem", "space.base": "0.25rem",
    })
    for (const [path, value] of Object.entries(report.ownerOverrides.values)) {
      const [group, key] = path.split(".") as ["radius" | "space", string]
      expect((theme[group] as Record<string, { $value: unknown }>)[key]!.$value).toBe(value)
    }
    expect(deriveRadiusScale(theme.radius.base.$value)).toEqual(Object.fromEntries(Object.entries(theme.radius).map(([k, v]) => [k, v.$value])))
  })
  it("records source, precision policy, declared defaults, and unsupported sidebar/export boilerplate", () => {
    expect(report.source.document).toBe("docs/THEME_SYSTEM_V2_IMPLEMENTATION_CONTRACT.md")
    expect(report.precisionPolicy.color).toMatch(/6 decimal places/)
    expect(report.precisionPolicy.length).toMatch(/4 decimal places/)
    expect(Object.keys(report.declaredDefaults)).toEqual(expect.arrayContaining(["motion.durationFast", "motion.durationBase", "space.density"]))
    expect(report.unsupported.map((u) => u.field).join(" ")).toMatch(/sidebar-input/)
    expect(report.unsupported.map((u) => u.field).join(" ")).not.toMatch(/sidebar-(?!input)/)
    expect(report.unsupported.map((u) => u.field).join(" ")).toMatch(/boilerplate/)
  })

  it("WSTP-09 promotes the eight Sidebar tokens to canonical 1:1 and records the Default's alias-derived defaults", () => {
    expect(report.theme.schemaVersion).toBe("2.1")
    expect(report.sidebarTokens.mapping).toEqual(Object.fromEntries(SIDEBAR_COLOR_TOKENS.map((name) => [name, name])))
    expect(report.sidebarTokens.defaults).toEqual(SIDEBAR_TOKEN_ALIASES)
  })

  it("imported colors and shadows equal the fixture; historical lengths remain normalizer fixed points", () => {
    const values = report.values as Record<string, { source: unknown; normalized: unknown }>
    for (const mode of ["light", "dark"] as const) {
      for (const [name, token] of Object.entries(theme.colors[mode])) {
        // Sidebar colours are declared alias-derived defaults (see `sidebarTokens`), not transcribed source values.
        if (isSidebarColorToken(name)) continue
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
