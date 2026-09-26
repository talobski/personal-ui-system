import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { COLOR_TOKENS, renderShadcnTailwindCss, SHADOW_TOKENS, THEME_SCHEMA_VERSION, validateTheme } from "../index"
import type { Theme } from "../index"
import defaultFixture from "./fixtures/default.json"
import invalidFixture from "./fixtures/invalid.json"
import v1QuietEditorial from "./fixtures/legacy/quiet-editorial.v1.json"
import validFixture from "./fixtures/valid.json"

const goldenPath = (name: string) => new URL(`./fixtures/${name}.css`, import.meta.url)

const valid = (input: unknown): Theme => {
  const result = validateTheme(input)
  if (!result.ok) throw new Error(`invalid: ${JSON.stringify(result.issues)}`)
  return result.theme
}

describe("theme schema v3", () => {
  it("accepts the built-in Default fixture as canonical v3 and round-trips it byte-for-byte", () => {
    const theme = valid(defaultFixture)
    expect(theme.schemaVersion).toBe(THEME_SCHEMA_VERSION)
    expect(JSON.stringify(theme)).toBe(JSON.stringify(defaultFixture))
    expect(validateTheme(JSON.parse(JSON.stringify(theme)))).toEqual({ ok: true, theme })
  })

  it("STHG-04 commits the built-in Quiet Editorial as canonical v3 and round-trips it byte-for-byte", () => {
    const theme = valid(validFixture)
    expect(validFixture.schemaVersion).toBe("3.0")
    expect(JSON.stringify(theme)).toBe(JSON.stringify(validFixture))
    expect(validateTheme(JSON.parse(JSON.stringify(theme)))).toEqual({ ok: true, theme })
  })

  it("accepts the legacy v1 Quiet Editorial input, returns canonical v3, and is idempotent", () => {
    const theme = valid(v1QuietEditorial)
    expect(theme.schemaVersion).toBe("3.0")
    expect(theme.$schema).toBe("https://personal-ui.local/schema/theme-3.json")
    expect(valid(theme)).toEqual(theme)
    expect(JSON.stringify(valid(JSON.parse(JSON.stringify(theme))))).toBe(JSON.stringify(theme))
  })

  it("has both modes with every semantic color and every category", () => {
    for (const fixture of [validFixture, defaultFixture]) {
      const theme = valid(fixture)
      for (const mode of ["light", "dark"] as const) expect(Object.keys(theme.colors[mode])).toEqual([...COLOR_TOKENS])
      expect(Object.keys(theme.typography)).toEqual(["heading", "body", "mono"])
      for (const role of ["heading", "body"] as const) expect(Object.keys(theme.typography[role])).toEqual(["font", "weight", "tracking"])
      expect(Object.keys(theme.radius)).toEqual(["base", "sm", "md", "lg", "xl"])
      expect(Object.keys(theme.space)).toEqual(["base", "density"])
      expect(Object.keys(theme.shadow)).toEqual([...SHADOW_TOKENS])
      expect(Object.keys(theme.motion)).toEqual(["durationFast", "durationBase", "reducedMotion"])
    }
  })

  it("emits keys in schema order regardless of input key order", () => {
    const reversed = JSON.parse(JSON.stringify(defaultFixture), (_key, value) =>
      value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).reverse()) : value
    )
    expect(JSON.stringify(valid(reversed))).toBe(JSON.stringify(defaultFixture))
  })

  it("normalizes every colour and length leaf to canonical form", () => {
    const input = structuredClone(defaultFixture) as Record<string, any>
    input.colors.light.primary.$value = "#000"
    input.colors.dark.border.$value = "rgba(255, 255, 255, 10%)"
    input.radius.sm.$value = "1.2250rem"
    input.space.base.$value = ".3rem"
    input.shadow.md.$value[0].color = "hsla(0, 0%, 0%, 0.1)"
    const theme = valid(input)
    expect(theme.colors.light.primary.$value).toBe("oklch(0 0 0)")
    expect(theme.colors.dark.border.$value).toBe("oklch(1 0 0 / 0.1)")
    expect(theme.radius.sm.$value).toBe("1.225rem")
    expect(theme.space.base.$value).toBe("0.3rem")
    expect(theme.shadow.md.$value[0]!.color).toBe("oklch(0 0 0 / 0.1)")
  })

  it("rejects unknown keys at every level, aliases, arbitrary properties, and unknown extension data", () => {
    const cases: Array<(t: Record<string, any>) => void> = [
      (t) => (t.extra = 1),
      (t) => (t.colors.light["--evil"] = { $type: "color", $value: "oklch(0 0 0)" }),
      (t) => (t.colors.light.primary.$value = "{colors.light.secondary}"),
      (t) => (t.typography.weight = { $type: "number", $value: 400 }),
      (t) => (t.typography.sans = t.typography.body.font),
      (t) => (t.typography.tracking = t.typography.body.tracking),
      (t) => (t.typography.code = t.typography.mono),
      (t) => (t.typography.heading.size = { $type: "dimension", $value: "2rem" }),
      (t) => (t.typography.body.lineHeight = { $type: "number", $value: 1.5 }),
      (t) => (t.typography.heading.tracking.$value = "0.01rem"),
      (t) => (t.typography.body.tracking.$value = "0.5em"),
      (t) => (t.typography.heading.weight.$value = 650),
      (t) => (t.typography.heading.weight.$value = 1000),
      (t) => (t.typography.body.weight.$value = "400"),
      (t) => (t.typography.body.weight.$type = "number"),
      (t) => delete t.typography.mono,
      (t) => delete t.typography.heading.weight,
      (t) => (t.radius["2xl"] = { $type: "dimension", $value: "2rem" }),
      (t) => (t.shadow.md.$value[0].css = "x"),
      (t) => (t.shadow.md.$value = []),
      (t) => delete t.shadow["2xs"],
      (t) => (t.shadow.inner = t.shadow.md),
      (t) => (t.shadow.md.$value[0].blur = "-1px"),
      (t) => delete t.shadow.md.$value[0].inset,
      (t) => (t.colors.light["sidebar-input"] = { $type: "color", $value: "oklch(1 0 0)" }),
      (t) => (t.colors.dark["sidebar-card"] = { $type: "color", $value: "oklch(1 0 0)" }),
      (t) => delete t.colors.dark["sidebar-ring"],
      (t) => delete t.sidebar,
      (t) => (t.sidebar.extra = true),
      (t) => (t.sidebar.useDedicatedTokens.$value = "yes"),
      (t) => (t.sidebar.dedicatedValuesInitialized = { $type: "boolean", $value: true }),
      // An uninitialized dedicated set can never be the active source.
      (t) => (t.sidebar.useDedicatedTokens.$value = true),
      (t) => (t.typography.body.font.$value = []),
      (t) => (t.typography.heading.font.$value = ['x"; } a {']),
      (t) => (t.$extensions.other = { x: 1 }),
      (t) => (t.schemaVersion = "2.1"),
      (t) => (t.$schema = "https://personal-ui.local/schema/theme-2.json"),
      (t) => (t.colors.light.primary.$value = "oklch(0.7 0.4 150)"),
      (t) => (t.colors.light.primary.$value = "red"),
      (t) => (t.colors.light.primary.$value = "oklch(0.5 1e308 20)"),
      (t) => (t.radius.base.$value = "1e308px"),
    ]
    for (const mutate of cases) {
      const candidate = structuredClone(defaultFixture) as Record<string, any>
      mutate(candidate)
      expect(validateTheme(candidate).ok, mutate.toString()).toBe(false)
    }
  })

  it("rejects the invalid v1 fixture with a stable rule ID at each offending v1 path", () => {
    const result = validateTheme(invalidFixture)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.every((issue) => issue.ruleId === "theme.invalid")).toBe(true)
    const paths = result.issues.map((issue) => issue.path)
    expect(paths).toContain("modes.light.color.primary.$value")
    expect(paths).toContain("modes.dark.color.ring")
    expect(paths).toContain("")
  })

  it("reports (never drops) a v1 value that v2 cannot represent", () => {
    const input = structuredClone(v1QuietEditorial) as Record<string, any>
    input.modes.light.color.primary.$value = "oklch(0.7 0.4 150)"
    const result = validateTheme(input)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues.map((i) => i.path)).toEqual(["colors.light.primary.$value"])
  })
})

describe("renderShadcnTailwindCss", () => {
  const themes = { "quiet-editorial": valid(validFixture), default: valid(defaultFixture) }

  it("is byte-identical across runs and independent of input key order", () => {
    for (const theme of Object.values(themes)) {
      const a = renderShadcnTailwindCss(theme)
      const b = renderShadcnTailwindCss(structuredClone(theme))
      const reordered = Object.fromEntries(Object.entries(theme).reverse()) as typeof theme
      const c = renderShadcnTailwindCss(reordered)
      const sha = (s: string) => createHash("sha256").update(s).digest("hex")
      expect(sha(a)).toBe(sha(b))
      expect(sha(a)).toBe(sha(c))
    }
  })

  it("matches the committed golden CSS for both built-in themes", () => {
    for (const [name, theme] of Object.entries(themes)) expect(renderShadcnTailwindCss(theme)).toBe(readFileSync(goldenPath(name), "utf8"))
  })

  it("keeps radius and every shadow tier live: @theme inline only references :root properties", () => {
    const css = renderShadcnTailwindCss(themes.default)
    const [rootAndDark, inline] = css.split("@theme inline")
    for (const [utility, source] of [
      ["--radius-sm", "--radius-scale-sm"],
      ["--radius-md", "--radius-scale-md"],
      ["--radius-lg", "--radius-scale-lg"],
      ["--radius-xl", "--radius-scale-xl"],
      ["--shadow-2xs", "--shadow-layers-2xs"],
      ["--shadow-xs", "--shadow-layers-xs"],
      ["--shadow-sm", "--shadow-layers-sm"],
      ["--shadow", "--shadow-layers-default"],
      ["--shadow-md", "--shadow-layers-md"],
      ["--shadow-lg", "--shadow-layers-lg"],
      ["--shadow-xl", "--shadow-layers-xl"],
      ["--shadow-2xl", "--shadow-layers-2xl"],
    ] as const) {
      expect(inline).toContain(`  ${utility}: var(${source});`)
      expect(rootAndDark).toMatch(new RegExp(`^  ${source}: [^v].*;$`, "m"))
    }
    expect(inline).not.toMatch(/--(?:font|radius|shadow|tracking)[a-z0-9-]*: (?!var\()/)
    // STHG-05: typography primitives are plain runtime :root properties and never @theme entries, so they create no
    // competing font-*/tracking-* utilities and no text-heading/text-body namespace exists.
    expect(inline.slice(0, inline.indexOf("}"))).not.toMatch(/--(?:font|tracking|text|type)-/)
    expect(css).not.toMatch(/text-(?:heading|body)|--font-family-|--tracking-base|--font-(?:sans|serif):/)
  })

  it("renders the Default typography roles, radius base, spacing base, and exact shadow tiers", () => {
    const css = renderShadcnTailwindCss(themes.default)
    expect(css).toContain(
      '  --font-body: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";'
    )
    expect(css.match(/--font-heading: (.*);/)![1]).toBe(css.match(/--font-body: (.*);/)![1])
    expect(css).toContain('  --font-mono: ui-monospace, "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace;')
    for (const line of ["--font-weight-heading: 600;", "--font-weight-body: 400;", "--tracking-heading: 0em;", "--tracking-body: 0em;"]) expect(css).toContain(`  ${line}`)
    expect(css).toContain("  --radius: 0.7rem;")
    expect(css).toContain("  --space-base: 0.25rem;")
    expect(css).toContain("  --shadow-layers-2xs: 0px 1px 3px 0px oklch(0 0 0 / 0.05);")
    expect(css).toContain("  --shadow-layers-md: 0px 1px 3px 0px oklch(0 0 0 / 0.1), 0px 2px 4px -1px oklch(0 0 0 / 0.1);")
    expect(css).toContain("  --shadow-layers-2xl: 0px 1px 3px 0px oklch(0 0 0 / 0.25);")
    expect(css).toContain("@layer base {\n  body {\n    font-family: var(--font-body);\n    font-weight: var(--font-weight-body);\n    letter-spacing: var(--tracking-body);\n  }\n}")
  })

  it("STHG-05 exports composed type-heading and type-body utilities with family, weight, and tracking only", () => {
    const css = renderShadcnTailwindCss(themes.default)
    for (const role of ["heading", "body"]) {
      expect(css).toContain(`@utility type-${role} {\n  font-family: var(--font-${role});\n  font-weight: var(--font-weight-${role});\n  letter-spacing: var(--tracking-${role});\n}`)
    }
    const utilities = css.slice(css.indexOf("@utility"), css.indexOf("@layer base"))
    expect(utilities).not.toMatch(/font-size|line-height|color|text-/)
  })

  it("emits shadcn variables, Tailwind v4 aliases, dark mode, and the reduced-motion override", () => {
    const css = renderShadcnTailwindCss(themes.default)
    expect(css).toContain(":root {")
    expect(css).toContain(".dark {")
    expect(css).toContain("@theme inline {")
    expect(css).toContain("--color-primary: var(--primary);")
    expect(css).toContain("--color-destructive-foreground: var(--destructive-foreground);")
    expect(css).toContain("@media (prefers-reduced-motion: reduce)")
    for (const token of COLOR_TOKENS) expect(css).toContain(`--${token}:`)
    expect(css).not.toMatch(/sidebar-(?:input|card)/)
  })

  it("renders an inset layer with the inset keyword", () => {
    const theme = structuredClone(themes.default)
    theme.shadow.md.$value[0]!.inset = true
    expect(renderShadcnTailwindCss(theme)).toContain("  --shadow-layers-md: inset 0px 1px 3px 0px")
  })

  it("refuses to render a schema-invalid theme", () => {
    expect(() => renderShadcnTailwindCss(invalidFixture as never)).toThrow()
  })
})
