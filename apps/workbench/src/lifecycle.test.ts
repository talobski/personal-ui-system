import { describe, expect, it } from "vitest"
import { applyProposal, COLOR_TOKENS, createProposalSession, diffThemeTokens, discardProposal, normalizeColor, renderShadcnTailwindCss, stageProposal, validateTheme } from "@personal-ui/core"

import {
  createCustomTheme,
  customThemeId,
  editColor,
  editTheme,
  exampleProposalJson,
  exportThemeJson,
  DEFAULT_THEME_ID,
  loadBuiltInThemes,
  parseProposalJson,
  previewVariablesCss,
} from "./lifecycle"
import { buildFontOperation, buildShadowColorOperation, COLOR_GROUPS, NUMERIC_CONTROLS, pickedColorInput, pickerHex, parseNumericDraft, readShadowColor } from "./controls"
import type { NumericControlId } from "./controls"
import { emptySaved, loadSaved, saveSelection, saveTheme, STORAGE_KEY } from "./persistence"
import type { StorageLike } from "./persistence"
import v1QuietEditorial from "@personal-ui/core/theme/fixtures/valid.json"

const builtIns = loadBuiltInThemes()
const BUILT_IN_IDS = builtIns.map((theme) => theme.id)
const defaultTheme = builtIns[0]!
/** Quiet Editorial, the accepted v1 fixture migrated to v2; most lifecycle tests keep exercising it. */
const canonical = builtIns[1]!
const VALID = "oklch(0.4 0.1 150)"

const memoryStorage = (initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } => {
  const data = { ...initial }
  return { data, getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) }
}

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
    { id: "spacing", value: 0.25, diff: ["space.base"], css: "--space-base: 0.25rem;" },
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
    expect([read("tracking"), read("radius"), read("spacing"), read("density"), read("motion")]).toEqual([0, 1.475, 0.3, 1, 200])
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

  it("parses proposal JSON and reports unparsable text without reaching core", () => {
    expect(parseProposalJson('{"a":1}')).toEqual({ ok: true, value: { a: 1 } })
    expect(parseProposalJson("{nope")).toEqual({ ok: false, issues: [{ ruleId: "workbench.proposal.invalid-json", path: "" }] })
  })

  it("offers an example proposal that stages against the active theme", () => {
    const example = parseProposalJson(exampleProposalJson(canonical, "example-1"))
    if (!example.ok) throw new Error("example unparsable")
    expect(stageProposal(createProposalSession(), canonical, example.value, NOW).ok).toBe(true)
  })
})
