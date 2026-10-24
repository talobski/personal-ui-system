import { describe, expect, it } from "vitest"
import {
  applyMutation,
  COLOR_TOKENS,
  defaultToneSets,
  diffThemeTokens,
  LEGACY_TONE_NAMES,
  LEGACY_TONE_TOKEN_RENAMES,
  MUTATION_SCHEMA_VERSION,
  normalizeColor,
  parseCanonicalOklch,
  renderShadcnTailwindCss,
  resolveTones,
  toPortableTheme,
  TONE_DEFAULTS,
  TONE_NAMES,
  TONE_TOKENS,
  validateTheme,
} from "../index"
import type { Theme, ThemeOperation, ToneToken } from "../index"
import amberDuskFixture from "./fixtures/amber-dusk.json"
import defaultFixture from "./fixtures/default.json"
import pocketmarketFixture from "./fixtures/pocketmarket.json"
import secunaFixture from "./fixtures/secuna.json"
import report from "./fixtures/tones.conversion.json"
import quietEditorialFixture from "./fixtures/valid.json"

/**
 * The owner-approved Figma Tones palette (sRGB HEX after conversion), transcribed independently from the owner's table:
 * light background, light foreground, dark background, dark foreground. Rows are in the table's order (Blue, Orange,
 * Purple, Pink, Teal, Violet), which is the ordinal order of tones 1 to 6.
 */
const FIGMA: Record<(typeof TONE_NAMES)[number], readonly [string, string, string, string]> = {
  1: ["#E4F2FF", "#316CA5", "#1E354B", "#97C9FD"],
  2: ["#FEECE1", "#A95F23", "#462C19", "#F2B58C"],
  3: ["#F7EBFB", "#835392", "#3D2A43", "#DDB2EA"],
  4: ["#FDEAF5", "#793E63", "#45283A", "#CF97B8"],
  5: ["#DEF6F7", "#007B82", "#083A3D", "#78D6DB"],
  6: ["#EEEEFF", "#635EA5", "#302F4B", "#BDBCFD"],
}

const source = (mode: "light" | "dark", token: ToneToken) => {
  const name = token.replace(/^tone-/, "").replace(/-foreground$/, "") as (typeof TONE_NAMES)[number]
  const [lb, lf, db, df] = FIGMA[name]
  const foreground = token.endsWith("-foreground")
  return mode === "light" ? (foreground ? lf : lb) : foreground ? df : db
}

/** A canonical OKLCH colour as the 8-bit sRGB HEX a browser renders. */
function renderedHex(value: string): string {
  const p = parseCanonicalOklch(value)!
  const [a, b] = [p.c * Math.cos((p.h * Math.PI) / 180), p.c * Math.sin((p.h * Math.PI) / 180)]
  const [l, m, s] = [p.l + 0.3963377774 * a + 0.2158037573 * b, p.l - 0.1055613458 * a - 0.0638541728 * b, p.l - 0.0894841775 * a - 1.291485548 * b].map((x) => x ** 3) as [number, number, number]
  const linear = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
  return `#${linear
    .map((c) => {
      const encoded = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(c, 0) ** (1 / 2.4) - 0.055
      return Math.round(Math.min(1, Math.max(0, encoded)) * 255).toString(16).padStart(2, "0")
    })
    .join("")}`.toUpperCase()
}

/** WCAG 2.x contrast of two sRGB HEX colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) =>
    [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      .reduce((sum, c, i) => sum + [0.2126, 0.7152, 0.0722][i]! * c, 0)
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

const valid = (input: unknown): Theme => {
  const result = validateTheme(input)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.theme
}

const builtIns = { default: defaultFixture, "quiet-editorial": quietEditorialFixture, "amber-dusk": amberDuskFixture, pocketmarket: pocketmarketFixture, secuna: secunaFixture }
/** Default without its stored tones: a theme that stores none, as a saved custom copy does before its first tone edit. */
const { tones: _defaultTones, ...defaultWithoutTones } = defaultFixture
const base = valid(defaultWithoutTones)

const setColor = (theme: Theme, operations: ThemeOperation[]) =>
  applyMutation(theme, { schemaVersion: MUTATION_SCHEMA_VERSION, requestId: "tones", base: { themeId: theme.id, revision: theme.revision }, operations })

const block = (css: string, selector: ":root {" | ".dark {" | "@theme inline {") => css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)))
const declared = (css: string, selector: ":root {" | ".dark {" | "@theme inline {", name: string) => new RegExp(`^  ${name}: (.*);$`, "m").exec(block(css, selector))?.[1]

describe("tone tokens", () => {
  it("are six background/foreground pairs, kept out of the 32 canonical colour tokens", () => {
    expect(TONE_TOKENS).toEqual(TONE_NAMES.flatMap((name) => [`tone-${name}`, `tone-${name}-foreground`]))
    expect(COLOR_TOKENS).toHaveLength(32)
    expect(COLOR_TOKENS.some((token) => token.startsWith("tone-"))).toBe(false)
  })
})

describe("shared tone defaults", () => {
  it("are the Figma HEX values normalized to canonical OKLCH, unchanged and rendering back to their source HEX", () => {
    for (const mode of ["light", "dark"] as const) {
      for (const token of TONE_TOKENS) {
        const hex = source(mode, token)
        const normalized = normalizeColor(hex)
        expect(normalized.ok, `${mode}.${token}`).toBe(true)
        const value = (normalized as { ok: true; value: string }).value
        expect(TONE_DEFAULTS[mode][token], `${mode}.${token}`).toBe(value)
        expect(normalizeColor(value)).toEqual({ ok: true, value })
        expect(renderedHex(value), `${mode}.${token}`).toBe(hex)
        expect(report.values[`tones.${mode}.${token}` as keyof typeof report.values]).toEqual({ source: hex, normalized: value })
      }
    }
    expect(Object.keys(report.values)).toHaveLength(24)
  })

  it("records every pair's measured contrast, with exactly the two light shortfalls as debt, not adjusted", () => {
    const pairs = TONE_NAMES.flatMap((name) => {
      const [lb, lf, db, df] = FIGMA[name]
      return [
        { mode: "light", name, ratio: contrast(lf, lb) },
        { mode: "dark", name, ratio: contrast(df, db) },
      ]
    })
    for (const { mode, name, ratio } of pairs) {
      const entry = report.contrast.pairs.find((pair) => pair.mode === mode && pair.pair === `tone-${name}-foreground on tone-${name}`)
      expect(entry?.ratio, `${mode}.${name}`).toBe(Number(ratio.toFixed(2)))
      expect(entry?.meets4_5, `${mode}.${name}`).toBe(ratio >= 4.5)
    }
    const short = pairs.filter((pair) => pair.ratio < 4.5).map(({ mode, name }) => `${mode}.${name}`)
    expect(short).toEqual(["light.2", "light.5"])
    expect(report.contrastDebt.pairs.map((pair) => `${pair.mode}.${pair.pair}`)).toEqual(["light.tone-2-foreground on tone-2", "light.tone-5-foreground on tone-5"])
  })
})

describe("optional tones field", () => {
  it("is stored by every built-in as a copy of Secuna's palette (apart from Pocketmarket's own Tone 1), rendered in place of the shared defaults", () => {
    const secuna = valid(secunaFixture).tones!
    for (const [id, fixture] of Object.entries(builtIns)) {
      const theme = valid(fixture)
      const own = (token: ToneToken) => id === "pocketmarket" && (token === "tone-1" || token === "tone-1-foreground")
      for (const mode of ["light", "dark"] as const) {
        for (const token of TONE_TOKENS) {
          if (own(token)) expect(theme.tones![mode][token], `${id} ${mode} ${token}`).not.toEqual(secuna[mode][token])
          else expect(theme.tones![mode][token], `${id} ${mode} ${token}`).toEqual(secuna[mode][token])
        }
      }
      const css = renderShadcnTailwindCss(theme)
      for (const token of TONE_TOKENS) {
        expect(declared(css, ":root {", `--${token}`), `${id} light ${token}`).toBe(theme.tones!.light[token].$value)
        expect(declared(css, ".dark {", `--${token}`), `${id} dark ${token}`).toBe(theme.tones!.dark[token].$value)
        expect(declared(css, "@theme inline {", `--color-${token}`), `${id} ${token}`).toBe(`var(--${token})`)
      }
    }
  })

  it("resolves and renders the shared defaults when a theme stores none", () => {
    expect(base.tones).toBeUndefined()
    expect(resolveTones(base)).toEqual(defaultToneSets())
    const css = renderShadcnTailwindCss(base)
    for (const token of TONE_TOKENS) {
      expect(declared(css, ":root {", `--${token}`), `light ${token}`).toBe(TONE_DEFAULTS.light[token])
      expect(declared(css, ".dark {", `--${token}`), `dark ${token}`).toBe(TONE_DEFAULTS.dark[token])
    }
  })

  it("accepts a complete override in any supported colour syntax and stores canonical OKLCH", () => {
    const tones = defaultToneSets()
    tones.light["tone-1"] = { $type: "color", $value: "#336699" }
    const theme = valid({ ...structuredClone(defaultFixture), tones })
    expect(theme.tones!.light["tone-1"].$value).toBe((normalizeColor("#336699") as { ok: true; value: string }).value)
    expect(theme.tones!.dark).toEqual(defaultToneSets().dark)
    expect(valid(JSON.parse(JSON.stringify(theme)))).toEqual(theme)
    expect(declared(renderShadcnTailwindCss(theme), ":root {", "--tone-1")).toBe(theme.tones!.light["tone-1"].$value)
  })

  it("rejects a partial set, a missing mode, an unknown key, and an out-of-gamut value", () => {
    const issues = (tones: unknown) => {
      const result = validateTheme({ ...structuredClone(defaultFixture), tones })
      return result.ok ? [] : result.issues.map((issue) => issue.path)
    }
    const partial = defaultToneSets() as Record<string, Record<string, unknown>>
    delete partial.dark!["tone-6-foreground"]
    expect(issues(partial)).toContain("tones.dark.tone-6-foreground")
    expect(issues({ light: defaultToneSets().light })).toContain("tones.dark")
    expect(issues({ ...defaultToneSets(), light: { ...defaultToneSets().light, "tone-red": { $type: "color", $value: "#ff0000" } } }).length).toBeGreaterThan(0)
    expect(issues({ ...defaultToneSets(), light: { ...defaultToneSets().light, "tone-1": { $type: "color", $value: "oklch(0.955 0.025 250)" } } })).toEqual(["tones.light.tone-1.$value"])
  })

  it("renders an explicit copy of the defaults exactly like an absent field, and diffs as no change", () => {
    const explicit = valid({ ...structuredClone(defaultWithoutTones), tones: defaultToneSets() })
    expect(renderShadcnTailwindCss(explicit)).toBe(renderShadcnTailwindCss(base))
    expect(diffThemeTokens(base, explicit)).toEqual([])
  })
})

describe("editing a tone through setColor", () => {
  it("stores the resolved defaults for both modes, then changes only the one value", () => {
    const result = setColor(base, [{ op: "setColor", mode: "dark", token: "tone-5-foreground", value: "#00FF00" }])
    if (!result.ok) throw new Error(JSON.stringify(result.errors))
    const expected = defaultToneSets()
    expected.dark["tone-5-foreground"].$value = (normalizeColor("#00FF00") as { ok: true; value: string }).value
    expect(result.theme.tones).toEqual(expected)
    expect(result.theme.colors).toEqual(base.colors)
    expect(result.theme.sidebar).toEqual(base.sidebar)
    expect(result.theme.revision).toBe(base.revision + 1)
    expect(diffThemeTokens(base, result.theme)).toEqual([{ path: "tones.dark.tone-5-foreground", before: TONE_DEFAULTS.dark["tone-5-foreground"], after: expected.dark["tone-5-foreground"].$value }])
    expect(declared(result.css, ".dark {", "--tone-5-foreground")).toBe(expected.dark["tone-5-foreground"].$value)
  })

  it("keeps earlier tone edits and leaves the input theme untouched", () => {
    const first = setColor(base, [{ op: "setColor", mode: "light", token: "tone-4", value: "#ffeeff" }])
    if (!first.ok) throw new Error("first")
    const second = setColor(first.theme, [{ op: "setColor", mode: "light", token: "tone-1", value: "#eeeeff" }])
    if (!second.ok) throw new Error("second")
    expect(second.theme.tones!.light["tone-4"]).toEqual(first.theme.tones!.light["tone-4"])
    expect(diffThemeTokens(base, second.theme).map((entry) => entry.path)).toEqual(["tones.light.tone-1", "tones.light.tone-4"])
    expect(base.tones).toBeUndefined()
  })

  it("rejects an unknown tone token, including a former colour-word name", () => {
    for (const token of ["tone-red", "tone-blue"]) {
      const result = setColor(base, [{ op: "setColor", mode: "light", token: token as ToneToken, value: "#ff0000" }])
      expect(result, token).toEqual({ ok: false, errors: [{ ruleId: "mutation.unknown-token", path: "operations[0].token" }] })
    }
  })
})

describe("former colour-word tone names", () => {
  /** A stored tones value as the earlier build wrote it: the given sets with every key renamed back to its colour word. */
  const legacyStored = (tones: ReturnType<typeof defaultToneSets>) => {
    const back = Object.fromEntries(Object.entries(LEGACY_TONE_TOKEN_RENAMES).map(([legacy, current]) => [current, legacy]))
    const set = (mode: "light" | "dark") => Object.fromEntries(Object.entries(tones[mode]).map(([key, value]) => [back[key]!, value]))
    return { light: set("light"), dark: set("dark") }
  }
  const custom = () => {
    const tones = defaultToneSets()
    tones.light["tone-1"] = { $type: "color", $value: "#336699" }
    tones.dark["tone-6-foreground"] = { $type: "color", $value: "oklch(0.8 0.1 290)" }
    return valid({ ...structuredClone(defaultFixture), tones }).tones!
  }

  it("map in ordinal order: blue is 1 through violet 6, each with its foreground", () => {
    expect(LEGACY_TONE_NAMES).toEqual(["blue", "orange", "purple", "pink", "teal", "violet"])
    expect(LEGACY_TONE_TOKEN_RENAMES).toEqual({
      "tone-blue": "tone-1", "tone-blue-foreground": "tone-1-foreground",
      "tone-orange": "tone-2", "tone-orange-foreground": "tone-2-foreground",
      "tone-purple": "tone-3", "tone-purple-foreground": "tone-3-foreground",
      "tone-pink": "tone-4", "tone-pink-foreground": "tone-4-foreground",
      "tone-teal": "tone-5", "tone-teal-foreground": "tone-5-foreground",
      "tone-violet": "tone-6", "tone-violet-foreground": "tone-6-foreground",
    })
  })

  it("are renamed on load with every value kept, so a stored override renders and diffs exactly as before", () => {
    const tones = custom()
    const current = valid({ ...structuredClone(defaultFixture), tones })
    const migrated = valid({ ...structuredClone(defaultFixture), tones: legacyStored(tones) })
    expect(migrated).toEqual(current)
    expect(Object.keys(migrated.tones!.light)).toEqual([...TONE_TOKENS])
    expect(renderShadcnTailwindCss(migrated)).toBe(renderShadcnTailwindCss(current))
    expect(diffThemeTokens(current, migrated)).toEqual([])
    expect(valid(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated)
  })

  it("still validate their values, and are renamed only as a complete set", () => {
    const issues = (tones: unknown) => {
      const result = validateTheme({ ...structuredClone(defaultFixture), tones })
      return result.ok ? [] : result.issues.map((issue) => issue.path)
    }
    const legacy = legacyStored(defaultToneSets())
    expect(issues({ ...legacy, light: { ...legacy.light, "tone-blue": { $type: "color", $value: "oklch(0.955 0.025 250)" } } })).toEqual(["tones.light.tone-1.$value"])
    const partial = structuredClone(legacy)
    delete (partial.dark as Record<string, unknown>)["tone-violet-foreground"]
    expect(issues(partial).length).toBeGreaterThan(0)
    const mixed = { light: legacy.light, dark: defaultToneSets().dark }
    expect(issues(mixed).length).toBeGreaterThan(0)
    expect(issues({ ...legacy, light: { ...legacy.light, "tone-1": { $type: "color", $value: "#ffffff" } } }).length).toBeGreaterThan(0)
  })
})

describe("portable export", () => {
  it("always carries the resolved tones after colours", () => {
    expect(toPortableTheme(base).tones).toEqual(defaultToneSets())
    expect(Object.keys(toPortableTheme(base)).slice(0, 3)).toEqual(["colors", "tones", "typography"])
    const edited = setColor(base, [{ op: "setColor", mode: "light", token: "tone-2-foreground", value: "#8a4a17" }])
    if (!edited.ok) throw new Error("edited")
    expect(toPortableTheme(edited.theme).tones).toEqual(edited.theme.tones)
  })
})
