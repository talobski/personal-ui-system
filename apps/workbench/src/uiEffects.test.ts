import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { applyProposal, createProposalSession, discardProposal, resolveUiEffects, stageProposal, UI_EFFECTS_FLAT, validateTheme } from "@personal-ui/core"
import type { Theme, ThemeOperation } from "@personal-ui/core"

import { buildUiEffectsOperation, NUMERIC_CONTROLS, UI_EFFECT_OPTIONS, UI_EFFECT_TARGETS } from "./controls"
import { EMPTY_TRACK, isDirty, record, redo, reset, sameDesign, undo } from "./history"
import { createCustomTheme, editTheme, exportThemeJson, loadBuiltInThemes, previewVariablesCss } from "./lifecycle"
import { emptySaved, loadSaved, saveTheme, STORAGE_KEY } from "./persistence"
import type { StorageLike } from "./persistence"

/** PUI-113 Workbench integration: TUE-02, TUE-04, TUE-05/06 surface wiring, and TUE-08 boundaries. */

const builtIns = loadBuiltInThemes()
const BUILT_IN_IDS = builtIns.map((theme) => theme.id)
const [defaultTheme, quietEditorial] = builtIns as [Theme, Theme]
const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
const controlsSource = readFileSync(new URL("./LiveControls.tsx", import.meta.url), "utf8")
const previewFrame = readFileSync(new URL("./PreviewFrame.tsx", import.meta.url), "utf8")

const edit = (theme: Theme, operation: ThemeOperation) => {
  const result = editTheme(theme, operation)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.theme
}
const memoryStorage = (): StorageLike & { data: Record<string, string> } => {
  const data: Record<string, string> = {}
  return { data, getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) }
}

describe("TUE-04 controls", () => {
  it("offer Tactile only, two independent targets and one bounded Strength", () => {
    expect(UI_EFFECT_OPTIONS).toEqual([{ value: "tactile", label: "Tactile" }])
    expect(UI_EFFECT_TARGETS.map((t) => t.label)).toEqual(["Outline buttons", "Tabs"])
    const strength = NUMERIC_CONTROLS.uiEffectsStrength
    expect([strength.label, strength.min, strength.max, strength.read(defaultTheme)]).toEqual(["Strength", 0, 100, 50])
  })

  it("every control emits the one setUiEffects operation with the full resolved value", () => {
    expect(buildUiEffectsOperation(defaultTheme, { tabs: true })).toEqual({ op: "setUiEffects", value: { ...UI_EFFECTS_FLAT, tabs: true } })
    const outline = edit(defaultTheme, buildUiEffectsOperation(defaultTheme, { outlineButtons: true }))
    expect(NUMERIC_CONTROLS.uiEffectsStrength.build(80, outline)).toEqual({ op: "setUiEffects", value: { effect: "tactile", outlineButtons: true, tabs: false, strength: 80 } })
    const both = edit(outline, buildUiEffectsOperation(outline, { tabs: true }))
    expect(resolveUiEffects(both)).toEqual({ effect: "tactile", outlineButtons: true, tabs: true, strength: 50 })
    // Toggling one target never changes the other.
    expect(resolveUiEffects(edit(both, buildUiEffectsOperation(both, { outlineButtons: false })))).toEqual({ effect: "tactile", outlineButtons: false, tabs: true, strength: 50 })
    expect(editTheme(defaultTheme, NUMERIC_CONTROLS.uiEffectsStrength.build(101, defaultTheme))).toEqual({ ok: false, issues: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.strength" }] })
  })

  it("the UI Effects section sits between Shadow and Motion, is lock-aware, and uses the accepted Select and Switch", () => {
    const shadow = app.indexOf('<ControlSection id="shadow"')
    const effects = app.indexOf('<ControlSection id="ui-effects" title="UI Effects">')
    const motion = app.indexOf('<ControlSection id="motion"')
    expect(shadow).toBeGreaterThan(0)
    expect(shadow < effects && effects < motion).toBe(true)
    expect(app.slice(effects, motion)).toContain('<UiEffectsFields theme={current} disabled={locked} apply={applyManual} />')
    expect(app.slice(effects, motion)).toContain('{numeric("uiEffectsStrength")}')
    expect(controlsSource).toMatch(/<Select items=\{UI_EFFECT_OPTIONS\}/)
    expect(controlsSource).toMatch(/<Switch id=\{switchId\}/)
  })
})

describe("TUE-04 history, dirty, Undo/Redo and Reset", () => {
  it("counts every UI-effects value, and absence equals the flat default", () => {
    expect(sameDesign(defaultTheme, edit(defaultTheme, buildUiEffectsOperation(defaultTheme, {})))).toBe(true)
    const on = edit(defaultTheme, buildUiEffectsOperation(defaultTheme, { outlineButtons: true }))
    expect(isDirty(on, defaultTheme)).toBe(true)
    const off = edit(on, buildUiEffectsOperation(on, { outlineButtons: false }))
    expect(isDirty(off, defaultTheme)).toBe(false)
    expect(isDirty(edit(defaultTheme, buildUiEffectsOperation(defaultTheme, { strength: 60 })), defaultTheme)).toBe(true)
  })

  it("undo, redo and reset restore UI-effects state as one checkpoint each", () => {
    let track = EMPTY_TRACK
    const on = edit(defaultTheme, buildUiEffectsOperation(defaultTheme, { tabs: true, strength: 70 }))
    track = record(track, defaultTheme, on)
    expect(track.past).toHaveLength(1)
    const undone = undo(track, on)!
    expect(undone.theme.uiEffects).toBeUndefined()
    expect(previewVariablesCss(undone.theme)).toBe(previewVariablesCss({ ...defaultTheme, revision: undone.theme.revision }))
    const redone = redo(undone.track, undone.theme)!
    expect(resolveUiEffects(redone.theme)).toEqual({ effect: "tactile", outlineButtons: false, tabs: true, strength: 70 })
    const cleared = reset(redone.track, redone.theme, defaultTheme)!
    expect(cleared.theme.uiEffects).toBeUndefined()
    expect(isDirty(cleared.theme, defaultTheme)).toBe(false)
    expect(reset(cleared.track, cleared.theme, defaultTheme)).toBeNull()
  })
})

describe("TUE-02 persistence and export", () => {
  it("export, Save As, save and reload keep effect, both toggles and strength; older themes stay flat", () => {
    const edited = edit(quietEditorial, buildUiEffectsOperation(quietEditorial, { outlineButtons: true, tabs: true, strength: 35 }))
    const exported = JSON.parse(exportThemeJson(edited).json)
    expect(exported.schemaVersion).toBe("3.0")
    expect(exported.uiEffects).toEqual(edited.uiEffects)
    expect(validateTheme(exported)).toEqual({ ok: true, theme: edited })

    const copy = createCustomTheme(edited, "Tactile Copy", BUILT_IN_IDS)
    if (!copy.ok) throw new Error("save as failed")
    const storage = memoryStorage()
    const saved = saveTheme(storage, emptySaved(), copy.theme, BUILT_IN_IDS, quietEditorial.id)
    expect(saved.ok).toBe(true)
    const reloaded = loadSaved(storage, BUILT_IN_IDS).themes[copy.theme.id]!
    expect(resolveUiEffects(reloaded)).toEqual({ effect: "tactile", outlineButtons: true, tabs: true, strength: 35 })

    // An exported/saved theme from before PUI-113 has no field and loads flat.
    const legacy = memoryStorage()
    legacy.setItem(STORAGE_KEY, JSON.stringify({ themes: { old: { ...structuredClone(defaultTheme), id: "old", name: "Old" } }, activeId: "old", bases: { old: "default" } }))
    const old = loadSaved(legacy, BUILT_IN_IDS).themes.old!
    expect(old.uiEffects).toBeUndefined()
    expect(previewVariablesCss(old)).not.toContain("ui-tactile")
    expect(exportThemeJson(defaultTheme).json).not.toContain("uiEffects")
  })
})

describe("TUE-05/06/08 surface wiring", () => {
  it("flat themes render the exact pre-PUI-113 runtime CSS; enabled targets append only the effects block", () => {
    for (const theme of builtIns) expect(previewVariablesCss(theme)).not.toMatch(/ui-tactile|@layer|data-slot/)
    const on = edit(defaultTheme, buildUiEffectsOperation(defaultTheme, { outlineButtons: true }))
    const css = previewVariablesCss(on)
    const flat = previewVariablesCss({ ...defaultTheme, revision: on.revision })
    expect(css.startsWith(`${flat}\n\n/* UI effects: tactile, strength 50. */\n@layer components {`)).toBe(true)
    expect(css).toContain('[data-slot="button"][data-variant="outline"]')
    expect(css).not.toContain("tabs-trigger")
  })

  it("chrome renders the active theme's effects; a staged candidate reaches only the preview", () => {
    // Chrome and preview share one runtime CSS function; chrome is always fed the active theme, the preview the candidate.
    expect(app).toContain("const activeCss = React.useMemo(() => previewVariablesCss(current), [current])")
    expect(app).toContain("const previewTheme = staged?.candidate ?? current")
    expect(app).toContain("css: previewVariablesCss(previewTheme)")
    const session = createProposalSession()
    const staged = stageProposal(session, defaultTheme, {
      schemaVersion: "1.0",
      proposalId: "tue-staged",
      base: { themeId: defaultTheme.id, revision: defaultTheme.revision },
      provenance: { source: "fixture", sourceId: "tue", createdAt: "2026-09-29T00:00:00Z" },
      operations: [buildUiEffectsOperation(defaultTheme, { outlineButtons: true, tabs: true })],
    }, "2026-09-29T00:00:00Z")
    if (!staged.ok) throw new Error("stage failed")
    expect(previewVariablesCss(staged.session.staged!.candidate)).toContain("@layer components")
    expect(previewVariablesCss(defaultTheme)).not.toContain("@layer components")
    expect(discardProposal(staged.session, defaultTheme, "tue-staged", "2026-09-29T00:00:01Z").ok).toBe(true)
    const applied = applyProposal(staged.session, defaultTheme, "tue-staged", "2026-09-29T00:00:01Z")
    if (!applied.ok) throw new Error("apply failed")
    expect(resolveUiEffects(applied.theme!)).toMatchObject({ outlineButtons: true, tabs: true })
  })

  it("marks only the two line/minimal Workbench category lists, which the surface-tab selector excludes", () => {
    const lines = (source: string) => source.match(/<TabsList[^>]*>/g) ?? []
    expect(lines(app)).toEqual(['<TabsList className="quiet-categories w-max flex-nowrap justify-start bg-transparent p-0" data-variant="line" aria-label="Editor categories">'])
    expect(lines(previewFrame)).toEqual(['<TabsList className="quiet-categories w-max flex-nowrap justify-start bg-transparent p-0" data-variant="line" aria-label="Preview views">'])
    const surfaceUsages = ["../../../packages/ui/src/compositions/workspace-settings.tsx", "../../../packages/ui/src/components/tabs.stories.tsx"]
    for (const path of surfaceUsages) expect(readFileSync(new URL(path, import.meta.url), "utf8")).not.toContain('data-variant="line"')
  })

  it("does not change the public Button or Tabs components", () => {
    const button = readFileSync(new URL("../../../packages/ui/src/components/button.tsx", import.meta.url), "utf8")
    const tabs = readFileSync(new URL("../../../packages/ui/src/components/tabs.tsx", import.meta.url), "utf8")
    expect(button).not.toMatch(/tactile|uiEffects/i)
    expect(tabs).not.toMatch(/tactile|uiEffects|variant/i)
  })
})
