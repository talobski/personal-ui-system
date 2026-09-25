import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { applyProposal, COLOR_TOKENS, createProposalSession, diffThemeTokens, discardProposal, normalizeColor, renderShadcnTailwindCss, stageProposal, validateTheme } from "@personal-ui/core"

import {
  createCustomTheme,
  customThemeId,
  editColor,
  editTheme,
  exportThemeJson,
  DEFAULT_THEME_ID,
  loadBuiltInThemes,
  previewVariablesCss,
} from "./lifecycle"
import { buildFontOperation, fontControlCopy, buildShadowColorOperation, COLOR_GROUPS, NUMERIC_CONTROLS, pickedColorInput, pickerHex, parseNumericDraft, readShadowColor } from "./controls"
import type { NumericControlId } from "./controls"
import { deleteTheme, emptySaved, loadSaved, saveSelection, saveTheme, STORAGE_KEY } from "./persistence"
import type { StorageLike } from "./persistence"
import v1QuietEditorial from "@personal-ui/core/theme/fixtures/valid.json"

const builtIns = loadBuiltInThemes()
const BUILT_IN_IDS = builtIns.map((theme) => theme.id)
const defaultTheme = builtIns[0]!
/** Quiet Editorial, the accepted v1 fixture migrated to v2; most lifecycle tests keep exercising it. */
const canonical = builtIns[1]!
const VALID = "oklch(0.4 0.1 150)"

it("WRCP-05 section triggers use the minimum foreground step stronger than muted-foreground that passes 4.5:1", () => {
  const rgb = (color: string) => pickerHex(color).slice(1).match(/../g)!.map(channel => parseInt(channel, 16) / 255)
  const luminance = (channels: number[]) => channels.reduce((sum, c, i) => sum + [0.2126, 0.7152, 0.0722][i]! * (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4), 0)
  const ratio = (a: number[], b: number[]) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05)
  const over = (top: number[], alpha: number, bottom: number[]) => top.map((c, i) => c * alpha + bottom[i]! * (1 - alpha))
  // Admissible: at rest (bg-muted over the card sidebar) and on hover (bg-muted/80), stronger than muted-foreground on
  // the same surface, and at least 4.5:1, in both built-ins and both modes.
  const admissible = (alpha: number) => builtIns.every(theme => (["light", "dark"] as const).every(mode => {
    const colors = theme.colors[mode]
    const card = rgb(colors.card.$value), muted = rgb(colors.muted.$value), foreground = rgb(colors.foreground.$value)
    return [muted, over(muted, 0.8, card)].every(surface => {
      const label = ratio(over(foreground, alpha, surface), surface)
      return label >= 4.5 && label > ratio(rgb(colors["muted-foreground"].$value), surface)
    })
  }))
  // The prior muted-foreground label fails normal-text contrast on full-strength muted in Default light.
  expect(ratio(rgb(defaultTheme.colors.light["muted-foreground"].$value), rgb(defaultTheme.colors.light.muted.$value))).toBeLessThan(4.5)
  const steps = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]
  expect(steps.find(step => admissible(step / 100))).toBe(75)
  const source = readFileSync(new URL("./LiveControls.tsx", import.meta.url), "utf8")
  expect(source).toContain("h-auto w-fit rounded-sm bg-muted px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-foreground/75 ring-1 ring-border hover:bg-muted/80 hover:text-foreground/75 dark:hover:bg-muted/80 has-[>svg]:px-2")
  const trigger = source.match(/<CollapsibleTrigger asChild>[\s\S]*?<Button [^>]*className="([^"]+)"/)![1]!
  expect(trigger).not.toMatch(/bg-muted\/50|ring-border\/50|accent|muted-foreground|\[#|oklch|rgb|hsl/i)
})

describe("WRCP-03/04 Other-tab labels and shared shadow colour interaction", () => {
  it("shortens only the approved visible labels; ids and operations are unchanged", () => {
    const labels = (["shadowOpacity", "shadowBlur", "shadowSpread", "shadowOffsetX", "shadowOffsetY", "motion"] as const).map(id => NUMERIC_CONTROLS[id].label)
    expect(labels).toEqual(["Opacity", "Blur", "Spread", "Offset X", "Offset Y", "Duration"])
    expect([NUMERIC_CONTROLS.radius.label, NUMERIC_CONTROLS.spacing.label, NUMERIC_CONTROLS.tracking.label]).toEqual(["Radius", "Spacing", "Letter spacing"])
    expect(NUMERIC_CONTROLS.motion.build(320, defaultTheme)).toEqual({ op: "setMotionDuration", value: "320ms" })
    expect(NUMERIC_CONTROLS.shadowBlur.build(10, defaultTheme)).toMatchObject({ op: "setShadowProfile", value: { blur: "10px" } })
  })

  it("renders Shadow color with the Colors-tab picker/text field and no stored-value helper", () => {
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
    const controls = readFileSync(new URL("./LiveControls.tsx", import.meta.url), "utf8")
    expect(app).toMatch(/<LiveColorField\s+key=\{`\$\{current\.id\}-shadow-color`\}\s+id="shadow-color"\s+label="Shadow color"\s+value=\{readShadowColor\(current\)\}\s+build=\{buildShadowColorOperation\}/)
    expect(app + controls).not.toMatch(/LiveTextField|canonicalNote|Stored as/)
    // A picked opaque sRGB hex enters the canonical shadow-profile operation and core stores canonical OKLCH.
    const picked = pickedColorInput("#ff0000", readShadowColor(defaultTheme))
    expect(picked).toBe("#ff0000")
    const result = editTheme(defaultTheme, buildShadowColorOperation(picked, defaultTheme))
    if (!result.ok) throw new Error("picked shadow colour rejected")
    expect(readShadowColor(result.theme)).toBe("oklch(0.627955 0.257683 29.23388)")
    expect(pickerHex(readShadowColor(result.theme))).toBe("#ff0000")
    expect(editTheme(defaultTheme, buildShadowColorOperation("rgba(0, 0, 0, 0.5)", defaultTheme)).ok).toBe(false)
  })
})

const memoryStorage = (initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } => {
  const data = { ...initial }
  return { data, getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) }
}

describe("WTCP-03/09 baseline compatibility and concise font states", () => {
  it("keeps historical custom values while a saved Default selection resolves to the current fixture", () => {
    const custom = structuredClone(defaultTheme)
    custom.id = "historical-custom"
    custom.radius = { base: { $type: "dimension", $value: "1.475rem" }, sm: { $type: "dimension", $value: "1.225rem" }, md: { $type: "dimension", $value: "1.35rem" }, lg: { $type: "dimension", $value: "1.475rem" }, xl: { $type: "dimension", $value: "1.725rem" } }
    custom.space.base.$value = "0.3rem"
    custom.typography.sans.$value = ["My Exact Font", "system-ui", "sans-serif"]
    const oldDefault = { ...custom, id: "default" }
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ themes: { [custom.id]: custom, default: oldDefault }, activeId: "default", bases: { [custom.id]: "default" } }) })
    const loaded = loadSaved(storage, BUILT_IN_IDS)
    expect(loaded.activeId).toBe("default")
    expect(loaded.themes.default).toBeUndefined()
    expect(loaded.themes[custom.id]).toEqual(custom)
    expect(builtIns.find(t => t.id === loaded.activeId)!.radius.base.$value).toBe("0.7rem")
    expect(loadSaved(memoryStorage({ [STORAGE_KEY]: JSON.stringify({ ...loaded, activeId: custom.id }) }), BUILT_IN_IDS).themes[custom.id]).toEqual(custom)
    const quiet = validateTheme(v1QuietEditorial)
    expect(quiet.ok && quiet.theme).toEqual(canonical)
  })

  it.each([ ["sans", "Sans-serif font...", "Custom sans-serif stack"], ["serif", "Serif font...", "Custom serif stack"], ["mono", "Monospace font...", "Custom monospace stack"] ] as const)("uses exact copy and exact stack equality for %s", (category, placeholder, custom) => {
    const stack = defaultTheme.typography[category].$value
    expect(fontControlCopy(category, [...stack], stack)).toBe(placeholder)
    expect(fontControlCopy(category, ["Personal Font", ...stack], stack)).toBe(custom)
    expect(fontControlCopy(category, [...stack].reverse(), stack)).toBe(custom)
    expect(NUMERIC_CONTROLS.spacing.label).toBe("Spacing")
    expect(NUMERIC_CONTROLS.spacing.build(0.3, defaultTheme)).toEqual({ op: "setSpacingBase", value: "0.3rem" })
  })
})

describe("editColor", () => {
  it("applies a valid edit through the mutation API without touching the input", () => {
    const result = editColor(canonical, "light", "primary", VALID)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.theme.colors.light.primary.$value).toBe(VALID)
    expect(result.theme.colors.dark.primary.$value).toBe(canonical.colors.dark.primary.$value)
    expect(result.theme.revision).toBe(canonical.revision + 1)
    expect(canonical.colors.light.primary.$value).not.toBe(VALID)
  })

  it.each(["red", "#ffff0", "oklch(0.4 0.1)", "red; } body { display: none", "var(--x)", "", "oklch(0.7 0.4 150)"])(
    "blocks invalid value %j with a stable rule and path, yielding no theme",
    (value) => {
      const result = editColor(canonical, "dark", "ring", value)
      expect(result).toEqual({ ok: false, issues: [{ ruleId: "mutation.invalid-value", path: "operations[0].value" }] })
    }
  )
})

describe("built-in themes (TSV2-02, TSV2-03, TSV2-04)", () => {
  it("offers Default first, then Quiet Editorial, both canonical v2", () => {
    expect(BUILT_IN_IDS).toEqual([DEFAULT_THEME_ID, "quiet-editorial"])
    for (const theme of builtIns) expect(validateTheme(theme)).toEqual({ ok: true, theme })
    expect(defaultTheme.name).toBe("Default")
    expect(canonical.schemaVersion).toBe("2.0")
  })

  it("accepts all four colour families through the manual colour path and stores canonical OKLCH", () => {
    for (const value of ["#336699", "rgb(51 102 153)", "hsl(210 50% 40%)", "oklch(0.5 0.1 250)"]) {
      const result = editColor(defaultTheme, "light", "primary", value)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.theme.colors.light.primary.$value).toMatch(/^oklch\([\d.]+ [\d.]+ [\d.]+\)$/)
    }
  })
})

describe("manual controls (TSV2-10, TSV2-11)", () => {
  const cases: { id: NumericControlId; value: number; diff: string[]; css: string }[] = [
    { id: "tracking", value: 0.02, diff: ["typography.tracking"], css: "--tracking-base: 0.02em;" },
    { id: "radius", value: 0.5, diff: ["radius.base", "radius.lg", "radius.md", "radius.sm", "radius.xl"], css: "--radius: 0.5rem;" },
    { id: "spacing", value: 0.3, diff: ["space.base"], css: "--space-base: 0.3rem;" },
    { id: "density", value: 1.25, diff: ["space.density"], css: "--density: 1.25;" },
    { id: "motion", value: 320, diff: ["motion.durationBase"], css: "--motion-duration-base: 320ms;" },
    { id: "shadowOpacity", value: 0.2, diff: ["shadow.2xl", "shadow.2xs", "shadow.default", "shadow.lg", "shadow.md", "shadow.sm", "shadow.xl", "shadow.xs"], css: "--shadow-layers-sm: 0px 1px 3px 0px oklch(0 0 0 / 0.2)" },
    { id: "shadowBlur", value: 12, diff: ["shadow.2xl", "shadow.2xs", "shadow.default", "shadow.lg", "shadow.md", "shadow.sm", "shadow.xl", "shadow.xs"], css: "--shadow-layers-2xl: 0px 1px 12px 0px" },
    { id: "shadowSpread", value: 2, diff: ["shadow.2xl", "shadow.2xs", "shadow.default", "shadow.lg", "shadow.md", "shadow.sm", "shadow.xl", "shadow.xs"], css: "--shadow-layers-md: 0px 1px 3px 2px oklch(0 0 0 / 0.1), 0px 2px 4px 1px" },
    { id: "shadowOffsetX", value: -4, diff: ["shadow.2xl", "shadow.2xs", "shadow.default", "shadow.lg", "shadow.md", "shadow.sm", "shadow.xl", "shadow.xs"], css: "--shadow-layers-xs: -4px 1px 3px 0px" },
    { id: "shadowOffsetY", value: 6, diff: ["shadow.2xl", "shadow.2xs", "shadow.default", "shadow.lg", "shadow.md", "shadow.sm", "shadow.xl", "shadow.xs"], css: "--shadow-layers-2xs: 0px 6px 3px 0px" },
  ]

  it("covers every numeric control", () => {
    expect(Object.keys(NUMERIC_CONTROLS).sort()).toEqual(cases.map((c) => c.id).sort())
  })

  it.each(cases)("$id: reads the Default value, applies one typed operation, and renders it", ({ id, value, diff, css }) => {
    const control = NUMERIC_CONTROLS[id]
    expect(Number.isFinite(control.read(defaultTheme))).toBe(true)
    expect(control.min).toBeLessThan(control.max)
    const result = editTheme(defaultTheme, control.build(value, defaultTheme))
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(result.theme.revision).toBe(defaultTheme.revision + 1)
    expect(control.read(result.theme)).toBeCloseTo(value, 6)
    expect(diffThemeTokens(defaultTheme, result.theme).map((entry) => entry.path)).toEqual(diff)
    expect(previewVariablesCss(result.theme)).toContain(css)
  })

  it("reads the Default slider values exactly", () => {
    const read = (id: NumericControlId) => NUMERIC_CONTROLS[id].read(defaultTheme)
    expect([read("tracking"), read("radius"), read("spacing"), read("density"), read("motion")]).toEqual([0, 0.7, 0.25, 1, 200])
    expect([read("shadowOpacity"), read("shadowBlur"), read("shadowSpread"), read("shadowOffsetX"), read("shadowOffsetY")]).toEqual([0.1, 3, 0, 0, 1])
  })

  it("keeps invalid numeric drafts local: nothing out of range or non-numeric parses", () => {
    const radius = NUMERIC_CONTROLS.radius
    expect(parseNumericDraft(radius, "0.5")).toBe(0.5)
    expect(parseNumericDraft(radius, " .5 ")).toBe(0.5)
    for (const draft of ["", "-", ".", "abc", "1rem", "3", "-0.1", "1e1", "NaN", "Infinity", "0x1"]) expect(parseNumericDraft(radius, draft), draft).toBeNull()
  })

  it("replaces whole font stacks for sans, serif, and mono and rejects unsafe names", () => {
    for (const family of ["sans", "serif", "mono"] as const) {
      const result = editTheme(defaultTheme, buildFontOperation(family, ["Inter Variable", "Inter", "system-ui"]))
      if (!result.ok) throw new Error("font edit failed")
      expect(result.theme.typography[family].$value).toEqual(["Inter Variable", "Inter", "system-ui"])
      expect(diffThemeTokens(defaultTheme, result.theme).map((d) => d.path)).toEqual([`typography.${family}`])
    }
    for (const stack of [[], [""], ['x"; } a{'], ["Inter; color: red"]]) {
      expect(editTheme(defaultTheme, buildFontOperation("sans", stack))).toEqual({ ok: false, issues: [{ ruleId: "mutation.invalid-value", path: "operations[0].value" }] })
    }
  })

  it("edits the shadow colour through the profile and rejects translucent or invalid colours", () => {
    expect(readShadowColor(defaultTheme)).toBe("oklch(0 0 0)")
    const result = editTheme(defaultTheme, buildShadowColorOperation("#1e3a8a", defaultTheme))
    if (!result.ok) throw new Error("shadow colour failed")
    expect(readShadowColor(result.theme)).toMatch(/^oklch\(/)
    expect(NUMERIC_CONTROLS.shadowOpacity.read(result.theme)).toBe(0.1)
    for (const raw of ["rgba(0,0,0,0.5)", "blue", ""]) {
      expect(editTheme(defaultTheme, buildShadowColorOperation(raw, defaultTheme))).toEqual({
        ok: false,
        issues: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.color" }],
      })
    }
  })

  it("round-trips a manually edited theme through Save As, reload, and export", () => {
    let theme = defaultTheme
    for (const [id, value] of [["tracking", 0.01], ["radius", 0.75], ["shadowBlur", 8]] as const) {
      const edited = editTheme(theme, NUMERIC_CONTROLS[id].build(value, theme))
      if (!edited.ok) throw new Error("edit failed")
      theme = edited.theme
    }
    const copy = createCustomTheme(theme, "My Theme", BUILT_IN_IDS)
    if (!copy.ok) throw new Error("save as failed")
    const storage = memoryStorage()
    expect(saveTheme(storage, emptySaved(), copy.theme, BUILT_IN_IDS, DEFAULT_THEME_ID).ok).toBe(true)
    const reloaded = loadSaved(storage, BUILT_IN_IDS)
    expect(reloaded.themes["my-theme"]).toEqual(copy.theme)
    expect(reloaded.bases).toEqual({ "my-theme": DEFAULT_THEME_ID })
    expect(validateTheme(JSON.parse(exportThemeJson(copy.theme).json))).toEqual({ ok: true, theme: copy.theme })
  })
})

describe("Save As (WTEP-08)", () => {
  it("creates a schema-valid custom copy with a derived id, the given name, and revision 1, never touching the source", () => {
    const source = editColorOrThrow()
    const before = structuredClone(source)
    const result = createCustomTheme(source, "  My Warm   Theme 2 ", [canonical.id])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.theme).toMatchObject({ id: "my-warm-theme-2", name: "My Warm   Theme 2", revision: 1 })
    expect(result.theme.colors.light.primary.$value).toBe(VALID)
    expect(validateTheme(result.theme)).toEqual({ ok: true, theme: result.theme })
    expect(source).toEqual(before)
    expect(diffThemeTokens(source, result.theme)).toEqual([])
  })

  it("derives deterministic ids that never collide with built-in or saved ids", () => {
    expect(customThemeId("Default", BUILT_IN_IDS)).toBe("default-2")
    expect(customThemeId("Default", [...BUILT_IN_IDS, "default-2"])).toBe("default-3")
    expect(customThemeId("Quiet Editorial", BUILT_IN_IDS)).toBe("quiet-editorial-2")
    expect(customThemeId("Ocean", BUILT_IN_IDS)).toBe("ocean")
    expect(customThemeId("Ocean", BUILT_IN_IDS)).toBe(customThemeId("Ocean", BUILT_IN_IDS))
  })

  it("rejects names the theme schema rejects with one stable rule", () => {
    for (const name of ["", "   ", "Bad-Name!", "../etc", "a".repeat(81), "Tab\tName"]) {
      expect(createCustomTheme(canonical, name, [])).toEqual({ ok: false, issues: [{ ruleId: "workbench.save-as.invalid-name", path: "name" }] })
    }
  })
})

describe("grouped colour rows and native picker (WTEP-05, WTEP-06)", () => {
  it("lists every canonical colour token exactly once, in the approved groups", () => {
    expect(COLOR_GROUPS.map((group) => group.title)).toEqual(["Primary", "Secondary", "Accent", "Base", "Card", "Popover", "Muted", "Destructive", "Border, Input & Ring", "Charts"])
    expect(COLOR_GROUPS.find((group) => group.id === "base")?.tokens).toEqual(["background", "foreground"])
    const tokens = COLOR_GROUPS.flatMap((group) => group.tokens)
    expect([...tokens].sort()).toEqual([...COLOR_TOKENS].sort())
    expect(new Set(tokens).size).toBe(COLOR_TOKENS.length)
  })

  it("shows the nearest sRGB hex for a canonical value, and picked hex round-trips through core to canonical oklch", () => {
    expect(pickerHex("oklch(0.499314 0.098664 250.433057)")).toBe("#336699")
    expect(pickerHex("oklch(1 0 0)")).toBe("#ffffff")
    expect(pickerHex("oklch(0 0 0)")).toBe("#000000")
    expect(pickerHex("not a colour")).toBe("#000000")
    for (const theme of builtIns) {
      for (const mode of ["light", "dark"] as const) {
        for (const token of COLOR_TOKENS) {
          const hex = pickerHex(theme.colors[mode][token].$value)
          expect(hex).toMatch(/^#[0-9a-f]{6}$/)
          const input = pickedColorInput(hex, theme.colors[mode][token].$value)
          const normalized = normalizeColor(input)
          expect(normalized.ok).toBe(true)
          const edited = editColor(theme, mode, token, input)
          expect(edited.ok).toBe(true)
          if (edited.ok && normalized.ok) expect(edited.theme.colors[mode][token].$value).toBe(normalized.value)
          if (edited.ok) expect(edited.theme.colors[mode][token].$value).toMatch(/^oklch\(/)
        }
      }
    }
  })

  it("keeps a token's alpha when the opaque picker changes its colour", () => {
    expect(pickedColorInput("#336699", "oklch(0.5 0.1 250)")).toBe("#336699")
    expect(pickedColorInput("#336699", "oklch(1 0 0 / 0.1)")).toBe("rgb(51 102 153 / 0.1)")
    const result = editColor(canonical, "dark", "border", pickedColorInput("#336699", "oklch(1 0 0 / 0.1)"))
    expect(result.ok && result.theme.colors.dark.border.$value).toMatch(/ \/ 0\.1\)$/)
  })
})

function editColorOrThrow() {
  const result = editColor(canonical, "light", "primary", VALID)
  if (!result.ok) throw new Error("edit failed")
  return result.theme
}

describe("persistence (TSV2-04, TSV2-12)", () => {
  it("round-trips saved themes, the selection, and the internal base through storage", () => {
    const storage = memoryStorage()
    const fork = createCustomTheme(editColorOrThrow(), "My Fork", BUILT_IN_IDS)
    if (!fork.ok) throw new Error("save as failed")
    const saved = saveTheme(storage, emptySaved(), fork.theme, BUILT_IN_IDS, canonical.id)
    expect(saved.ok).toBe(true)
    // A fresh read from the same storage models a browser refresh.
    expect(loadSaved(storage, BUILT_IN_IDS)).toEqual({ themes: { "my-fork": fork.theme }, activeId: "my-fork", bases: { "my-fork": canonical.id } })
  })

  it("fresh storage selects nothing, so the Workbench falls back to Default", () => {
    expect(loadSaved(memoryStorage(), BUILT_IN_IDS)).toEqual(emptySaved())
  })

  it("persists a built-in selection without saving any theme data", () => {
    const storage = memoryStorage()
    const next = saveSelection(storage, emptySaved(), "quiet-editorial")
    expect(next).toEqual({ themes: {}, activeId: "quiet-editorial", bases: {} })
    expect(loadSaved(storage, BUILT_IN_IDS).activeId).toBe("quiet-editorial")
    expect(JSON.parse(storage.data[STORAGE_KEY]!).themes).toEqual({})
  })

  it("drops a removed or unknown selection so the Workbench falls back safely", () => {
    for (const activeId of ["removed-theme", 7, null, "__proto__"]) {
      const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ themes: {}, activeId, bases: {} }) })
      expect(loadSaved(storage, BUILT_IN_IDS).activeId).toBeNull()
    }
  })

  it("migrates a stored v1 theme to v2 on read (TSV2-12)", () => {
    const v1 = { ...structuredClone(v1QuietEditorial), id: "legacy-fork", name: "Legacy Fork" }
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ themes: { "legacy-fork": v1 }, activeId: "legacy-fork" }) })
    const loaded = loadSaved(storage, BUILT_IN_IDS)
    expect(loaded.activeId).toBe("legacy-fork")
    expect(loaded.themes["legacy-fork"]?.schemaVersion).toBe("2.0")
    expect(loaded.themes["legacy-fork"]?.colors.light.primary.$value).toBe(canonical.colors.light.primary.$value)
    expect(loaded.bases).toEqual({})
  })

  it("never lets a saved theme shadow a built-in id", () => {
    const shadowing = { ...structuredClone(defaultTheme), name: "Impostor" }
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ themes: { default: shadowing }, activeId: "default" }) })
    const loaded = loadSaved(storage, BUILT_IN_IDS)
    expect(loaded.themes).toEqual({})
    expect(loaded.activeId).toBe("default")
  })

  it("reserves every built-in id and does not write on rejection", () => {
    for (const theme of builtIns) {
      const storage = memoryStorage()
      expect(saveTheme(storage, emptySaved(), theme, BUILT_IN_IDS, theme.id)).toEqual({
        ok: false,
        issues: [{ ruleId: "workbench.save.reserved-id", path: "id" }],
      })
      expect(storage.data).toEqual({})
    }
  })

  it("reports storage failure with a stable rule", () => {
    const storage: StorageLike = { getItem: () => null, setItem: () => { throw new Error("quota") } }
    const fork = createCustomTheme(canonical, "My Fork", [])
    if (!fork.ok) throw new Error("save as failed")
    expect(saveTheme(storage, emptySaved(), fork.theme, [], canonical.id)).toEqual({
      ok: false,
      issues: [{ ruleId: "workbench.save.storage-unavailable", path: "" }],
    })
    expect(saveSelection(storage, emptySaved(), "default")).toEqual(emptySaved())
  })

  it("drops corrupt, invalid, or id-mismatched entries and bad bases instead of trusting them", () => {
    const fork = createCustomTheme(canonical, "Good", [])
    if (!fork.ok) throw new Error("save as failed")
    const bad = structuredClone(fork.theme)
    bad.colors.light.primary.$value = "red"
    const stored = { themes: { good: fork.theme, bad, mismatch: fork.theme }, activeId: "bad", bases: { good: "nope", bad: "default" } }
    expect(loadSaved(memoryStorage({ [STORAGE_KEY]: JSON.stringify(stored) }), BUILT_IN_IDS)).toEqual({ themes: { good: fork.theme }, activeId: null, bases: {} })
    expect(loadSaved(memoryStorage({ [STORAGE_KEY]: "{not json" }), BUILT_IN_IDS)).toEqual(emptySaved())
    expect(loadSaved(memoryStorage(), BUILT_IN_IDS)).toEqual(emptySaved())
  })
})

describe("export and preview css", () => {
  it("exports validated, deterministic, portable JSON that re-validates to the same theme", () => {
    const theme = editColorOrThrow()
    const out = exportThemeJson(theme)
    expect(out.filename).toBe("quiet-editorial.theme.json")
    expect(out.json.endsWith("\n")).toBe(true)
    expect(exportThemeJson(theme)).toEqual(out)
    const round = validateTheme(JSON.parse(out.json))
    expect(round).toEqual({ ok: true, theme })
  })

  it("derives preview variables from core's renderer, keeping :root/.dark and dropping @theme", () => {
    const css = previewVariablesCss(editColorOrThrow())
    expect(css).toContain(`--primary: ${VALID};`)
    expect(css).toContain(".dark {")
    expect(css).not.toContain("@theme")
    expect(renderShadcnTailwindCss(canonical)).toContain("@theme inline")
  })
})

const NOW = "2026-09-21T11:00:00Z"

describe("mutation proposal preview (non-committing)", () => {
  const envelope = (overrides: Record<string, unknown> = {}) => ({
    schemaVersion: "1.0",
    proposalId: "p-1",
    base: { themeId: canonical.id, revision: canonical.revision },
    provenance: { source: "agent", sourceId: "run-1", createdAt: "2026-09-21T10:00:00Z" },
    operations: [
      { op: "setMotionDuration", value: "320ms" },
      { op: "setColor", mode: "dark", token: "primary", value: "oklch(0.8 0.1 150)" },
      { op: "setRadius", value: "1rem" },
    ],
    ...overrides,
  })

  it("diffs active to candidate as sorted {path,before,after}", () => {
    const result = stageProposal(createProposalSession(), canonical, envelope(), NOW)
    if (!result.ok) throw new Error("stage failed")
    const diff = result.staged.evaluation.diff
    expect(diff).toEqual([
      { path: "colors.dark.primary", before: canonical.colors.dark.primary.$value, after: "oklch(0.8 0.1 150)" },
      { path: "motion.durationBase", before: canonical.motion.durationBase.$value, after: "320ms" },
      { path: "radius.md", before: canonical.radius.md.$value, after: "1rem" },
    ])
    expect(diff.map((entry) => entry.path)).toEqual([...diff.map((entry) => entry.path)].sort())
    for (const entry of diff) expect(Object.keys(entry).sort()).toEqual(["after", "before", "path"])
  })

  it("previews candidate CSS through the existing preview path without changing the active theme", () => {
    const before = JSON.stringify(canonical)
    const result = stageProposal(createProposalSession(), canonical, envelope(), NOW)
    if (!result.ok) throw new Error("stage failed")
    const candidateCss = previewVariablesCss(result.staged.candidate)
    expect(candidateCss).toContain("--motion-duration-base: 320ms;")
    expect(previewVariablesCss(canonical)).not.toContain("--motion-duration-base: 320ms;")
    expect(JSON.stringify(canonical)).toBe(before)
  })

  it("stage, discard, and stale leave active state and persistence byte-identical; only Apply then Save persists", () => {
    const fork = createCustomTheme(canonical, "My Fork", [])
    if (!fork.ok) throw new Error("save as failed")
    const storage = memoryStorage()
    const saved = saveTheme(storage, emptySaved(), fork.theme, BUILT_IN_IDS, canonical.id)
    if (!saved.ok) throw new Error("save failed")
    const active = fork.theme
    const request = (id: string) => envelope({ proposalId: id, base: { themeId: active.id, revision: active.revision } })
    const snapshot = () => ({ active: JSON.stringify(active), storage: JSON.stringify(storage.data) })
    const before = snapshot()

    // Staged then discarded.
    let session = stageProposal(createProposalSession(), active, request("a"), NOW).session
    expect(snapshot()).toEqual(before)
    session = discardProposal(session, active, "a", NOW).session
    expect(snapshot()).toEqual(before)

    // Staged, then the active revision moves: Apply is stale and applies nothing.
    session = stageProposal(session, active, request("b"), NOW).session
    const moved = editColor(active, "light", "primary", VALID)
    if (!moved.ok) throw new Error("edit failed")
    const stale = applyProposal(session, moved.theme, "b", NOW)
    expect(stale.ok).toBe(false)
    expect(stale.session.records.find((record) => record.proposalId === "b")?.status).toBe("stale")
    expect(stale.ok ? [] : stale.errors).toEqual([{ ruleId: "mutation.stale-revision", path: "base.revision" }])
    expect(moved.theme.revision).toBe(active.revision + 1)
    expect(moved.theme.radius.md.$value).toBe(active.radius.md.$value)
    expect(snapshot()).toEqual(before)

    // Applied: one revision step in memory, storage still untouched until Save.
    session = stageProposal(stale.session, active, request("c"), NOW).session
    const applied = applyProposal(session, active, "c", NOW)
    if (!applied.ok) throw new Error("apply failed")
    expect(applied.theme!.revision).toBe(active.revision + 1)
    expect(snapshot()).toEqual(before)
    expect(saveTheme(storage, saved.saved, applied.theme!, BUILT_IN_IDS, canonical.id).ok).toBe(true)
    expect(JSON.stringify(storage.data)).not.toBe(before.storage)
  })

})

describe("custom theme deletion (WSSP-06)", () => {
  const twoCustom = () => {
    const storage = memoryStorage()
    const studio = createCustomTheme(defaultTheme, "Studio", BUILT_IN_IDS)
    const archive = createCustomTheme(canonical, "Archive", BUILT_IN_IDS)
    if (!studio.ok || !archive.ok) throw new Error("expected valid copies")
    const first = saveTheme(storage, emptySaved(), archive.theme, BUILT_IN_IDS, canonical.id)
    if (!first.ok) throw new Error("expected save")
    const second = saveTheme(storage, first.saved, studio.theme, BUILT_IN_IDS, defaultTheme.id)
    if (!second.ok) throw new Error("expected save")
    return { storage, saved: second.saved, studio: studio.theme, archive: archive.theme }
  }

  it("removes the saved theme and its base record, persists Default as active, and keeps other custom themes", () => {
    const { storage, saved, studio, archive } = twoCustom()
    expect(saved.activeId).toBe(studio.id)
    const result = deleteTheme(storage, saved, studio.id, DEFAULT_THEME_ID)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.saved).toEqual({ themes: { [archive.id]: archive }, activeId: DEFAULT_THEME_ID, bases: { [archive.id]: canonical.id } })
    // The persisted format is unchanged and survives a reload: Default is restored, the deleted theme is gone.
    const reloaded = loadSaved(storage, BUILT_IN_IDS)
    expect(reloaded).toEqual(result.saved)
    expect(Object.keys(JSON.parse(storage.data[STORAGE_KEY]!)).sort()).toEqual(["activeId", "bases", "themes"])
  })

  it("never deletes a built-in or an unknown id, and writes nothing when rejected", () => {
    const { storage, saved } = twoCustom()
    const before = storage.data[STORAGE_KEY]
    for (const id of [...BUILT_IN_IDS, "missing"]) {
      expect(deleteTheme(storage, saved, id, DEFAULT_THEME_ID)).toEqual({ ok: false, issues: [{ ruleId: "workbench.delete.not-custom", path: "id" }] })
    }
    expect(storage.data[STORAGE_KEY]).toBe(before)
  })

  it("reports unavailable storage without changing the in-memory record", () => {
    const { saved, studio } = twoCustom()
    const broken: StorageLike = { getItem: () => null, setItem: () => { throw new Error("quota") } }
    expect(deleteTheme(broken, saved, studio.id, DEFAULT_THEME_ID)).toEqual({ ok: false, issues: [{ ruleId: "workbench.save.storage-unavailable", path: "" }] })
    expect(Object.hasOwn(saved.themes, studio.id)).toBe(true)
  })

  it("exposes the delete action only for the active custom theme, confirmed through ResponsiveDialog", () => {
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
    expect(app).toContain("const activeCustom = !builtInCopy && Object.hasOwn(saved.themes, current.id)")
    expect(app).toMatch(/\{activeCustom && \(\s*<ResponsiveDialog open=\{deleteOpen\}/)
    expect(app).toMatch(/<ResponsiveDialogTrigger asChild>\s*<SidebarMenuAction aria-label=\{`Delete \$\{current.name\}`\}/)
    expect(app).toMatch(/if \(locked \|\| builtInCopy \|\| !Object.hasOwn\(saved.themes, current.id\)\) return/)
    // The action is a sibling of the Select, never inside its trigger or rows.
    const trigger = app.slice(app.indexOf("<SelectTrigger"), app.indexOf("</Select>"))
    expect(trigger).not.toContain("SidebarMenuAction")
  })
})

describe("density boundary (WSSP-10)", () => {
  it("removes only the manual Density control; schema, renderer, mutation, persistence, and proposals keep density", () => {
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
    expect(app).not.toMatch(/numeric\("density"\)|NUMERIC_CONTROLS\.density|"Density"/)
    // Programmatic density is intact.
    const edited = editTheme(canonical, { op: "setDensity", value: 1.25 })
    expect(edited.ok).toBe(true)
    if (!edited.ok) return
    expect(edited.theme.space.density.$value).toBe(1.25)
    expect(renderShadcnTailwindCss(edited.theme)).toContain("--density: 1.25;")
    expect(editTheme(canonical, { op: "setDensity", value: 99 }).ok).toBe(false)
    const storage = memoryStorage()
    const copy = createCustomTheme(edited.theme, "Dense", BUILT_IN_IDS)
    if (!copy.ok) throw new Error("expected copy")
    const saved = saveTheme(storage, emptySaved(), copy.theme, BUILT_IN_IDS, canonical.id)
    expect(saved.ok).toBe(true)
    expect(loadSaved(storage, BUILT_IN_IDS).themes[copy.theme.id]!.space.density.$value).toBe(1.25)
    const v1 = validateTheme(v1QuietEditorial)
    expect(v1.ok && v1.theme.space.density.$value).toBeTypeOf("number")
    const proposal = { schemaVersion: "1.0", proposalId: "density-1", base: { themeId: canonical.id, revision: canonical.revision }, provenance: { source: "agent", sourceId: "density", createdAt: "2026-09-25T00:00:00Z" }, operations: [{ op: "setDensity", value: 1.5 }] }
    const staged = stageProposal(createProposalSession(), canonical, proposal, "2026-09-25T00:00:01Z")
    expect(staged.ok).toBe(true)
    if (staged.ok) expect(staged.staged.candidate.space.density.$value).toBe(1.5)
    expect(NUMERIC_CONTROLS.density.read(canonical)).toBe(canonical.space.density.$value)
  })
})
