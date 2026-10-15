import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { applyProposal, createProposalSession, discardProposal, resolveUiEffects, stageProposal, UI_EFFECTS_FLAT } from "@personal-ui/core"
import type { Theme, ThemeOperation } from "@personal-ui/core"

import { buildUiEffectsOperation, NUMERIC_CONTROLS, UI_EFFECT_HELP, UI_EFFECT_OPTIONS } from "./controls"
import { EMPTY_TRACK, isDirty, record, redo, reset, sameDesign, undo } from "./history"
import { createCustomTheme, editTheme, exportThemeJson, loadBuiltInThemes, previewVariablesCss } from "./lifecycle"
import { emptySaved, loadSaved, saveTheme, STORAGE_KEY } from "./persistence"
import type { StorageLike } from "./persistence"

/** PUI-113 Workbench integration (TUE-02/04/05/06/08) as simplified by PUI-119/PUI-121 (IESP-02..05). */

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

describe("TUE-04 / IESP-04 controls", () => {
  it("offer Off and Tactile (Off first and default), an effect-driven helper and one bounded Strength; no target toggles", () => {
    expect(UI_EFFECT_OPTIONS).toEqual([{ value: "off", label: "Off" }, { value: "tactile", label: "Tactile" }])
    // PUI-125 / ADSR-05: Off has no note; Tactile has exactly this copy. The mapping covers exactly the offered effects.
    expect(UI_EFFECT_HELP).toEqual({ off: null, tactile: "Applied to secondary buttons and tabs." })
    expect(Object.keys(UI_EFFECT_HELP)).toEqual(UI_EFFECT_OPTIONS.map((option) => option.value))
    expect(resolveUiEffects(defaultTheme).effect).toBe("off")
    const strength = NUMERIC_CONTROLS.uiEffectsStrength
    expect([strength.label, strength.min, strength.max, strength.read(defaultTheme)]).toEqual(["Strength", 0, 100, 50])
    expect(controlsSource).not.toMatch(/UI_EFFECT_TARGETS|outlineButtons|Outline buttons|ui-effects-.*-switch/)
  })

  it("every control emits the one setUiEffects operation with the full resolved canonical value", () => {
    expect(buildUiEffectsOperation(defaultTheme, { effect: "tactile" })).toEqual({ op: "setUiEffects", value: { ...UI_EFFECTS_FLAT, effect: "tactile" } })
    const tactile = edit(defaultTheme, buildUiEffectsOperation(defaultTheme, { effect: "tactile" }))
    expect(NUMERIC_CONTROLS.uiEffectsStrength.build(80, tactile)).toEqual({ op: "setUiEffects", value: { effect: "tactile", strength: 80 } })
    const strong = edit(tactile, NUMERIC_CONTROLS.uiEffectsStrength.build(80, tactile))
    // Off keeps Strength; choosing Tactile again restores the selected intensity.
    const off = edit(strong, buildUiEffectsOperation(strong, { effect: "off" }))
    expect(resolveUiEffects(off)).toEqual({ effect: "off", strength: 80 })
    expect(resolveUiEffects(edit(off, buildUiEffectsOperation(off, { effect: "tactile" })))).toEqual({ effect: "tactile", strength: 80 })
    expect(editTheme(defaultTheme, NUMERIC_CONTROLS.uiEffectsStrength.build(101, defaultTheme))).toEqual({ ok: false, issues: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.strength" }] })
  })

  it("Strength is semantically disabled and de-emphasized while Off, and active while Tactile", () => {
    const effects = app.indexOf('<ControlSection id="ui-effects" title="UI Effects">')
    const motion = app.indexOf('<ControlSection id="motion"')
    expect(app.slice(effects, motion)).toContain('inactive={resolveUiEffects(current).effect === "off"}')
    expect(controlsSource).toContain("data-disabled={inactive || undefined}")
    expect(controlsSource).toContain("disabled={disabled || inactive}")
  })

  it("the UI Effects section sits between Shadow and Motion, is lock-aware, and uses the accepted Select with its helper", () => {
    const shadow = app.indexOf('<ControlSection id="shadow"')
    const effects = app.indexOf('<ControlSection id="ui-effects" title="UI Effects">')
    const motion = app.indexOf('<ControlSection id="motion"')
    expect(shadow).toBeGreaterThan(0)
    expect(shadow < effects && effects < motion).toBe(true)
    expect(app.slice(effects, motion)).toContain('<UiEffectsFields theme={current} disabled={locked} apply={applyManual} />')
    expect(app.slice(effects, motion)).toContain('<LiveNumberField key={`${current.id}-uiEffectsStrength`} id="uiEffectsStrength" control={NUMERIC_CONTROLS.uiEffectsStrength} theme={current} disabled={locked}')
    expect(controlsSource).toMatch(/<Select items=\{UI_EFFECT_OPTIONS\}/)
    expect(controlsSource).toContain('aria-describedby={help ? "ui-effect-help" : undefined}')
    // The helper row renders only when the selected effect defines a note, with a decorative existing-library icon.
    const fields = controlsSource.slice(controlsSource.indexOf("export function UiEffectsFields"), controlsSource.indexOf("export function SidebarTokensSwitch"))
    expect(fields).toContain("const help = UI_EFFECT_HELP[effects.effect]")
    expect(fields).toMatch(/\{help && \(\s*<FieldDescription id="ui-effect-help"/)
    expect(fields).toContain('<Info aria-hidden="true"')
    expect(controlsSource).toContain('import { Info } from "@personal-ui/ui/lib/workbench-icons"')
    expect(fields).not.toMatch(/bg-|border|rounded|Alert|<svg/)
  })
})

describe("TUE-04 history, dirty, Undo/Redo and Reset", () => {
  it("counts every UI-effects value, and absence equals the explicit Off default", () => {
    expect(sameDesign(defaultTheme, edit(defaultTheme, buildUiEffectsOperation(defaultTheme, {})))).toBe(true)
    const on = edit(defaultTheme, buildUiEffectsOperation(defaultTheme, { effect: "tactile" }))
    expect(isDirty(on, defaultTheme)).toBe(true)
    const off = edit(on, buildUiEffectsOperation(on, { effect: "off" }))
    expect(isDirty(off, defaultTheme)).toBe(false)
    expect(isDirty(edit(defaultTheme, buildUiEffectsOperation(defaultTheme, { strength: 60 })), defaultTheme)).toBe(true)
  })

  it("undo, redo and reset restore UI-effects state as one checkpoint each", () => {
    let track = EMPTY_TRACK
    const on = edit(defaultTheme, buildUiEffectsOperation(defaultTheme, { effect: "tactile", strength: 70 }))
    track = record(track, defaultTheme, on)
    expect(track.past).toHaveLength(1)
    const undone = undo(track, on)!
    expect(undone.theme.uiEffects).toBeUndefined()
    expect(previewVariablesCss(undone.theme)).toBe(previewVariablesCss({ ...defaultTheme, revision: undone.theme.revision }))
    const redone = redo(undone.track, undone.theme)!
    expect(resolveUiEffects(redone.theme)).toEqual({ effect: "tactile", strength: 70 })
    const cleared = reset(redone.track, redone.theme, defaultTheme)!
    expect(cleared.theme.uiEffects).toBeUndefined()
    expect(isDirty(cleared.theme, defaultTheme)).toBe(false)
    expect(reset(cleared.track, cleared.theme, defaultTheme)).toBeNull()
  })
})

describe("TUE-02 persistence and export", () => {
  it("export, Save As, save and reload keep Effect and Strength only; older themes stay flat", () => {
    const edited = edit(quietEditorial, buildUiEffectsOperation(quietEditorial, { effect: "tactile", strength: 35 }))
    const exported = JSON.parse(exportThemeJson(edited).json)
    expect(exported.uiEffects).toEqual(edited.uiEffects)
    expect(exported.uiEffects).toEqual({ effect: { $type: "string", $value: "tactile" }, strength: { $type: "number", $value: 35 } })

    const copy = createCustomTheme(edited, "Tactile Copy", BUILT_IN_IDS)
    if (!copy.ok) throw new Error("save as failed")
    const storage = memoryStorage()
    const saved = saveTheme(storage, emptySaved(), copy.theme, BUILT_IN_IDS, quietEditorial.id)
    expect(saved.ok).toBe(true)
    const reloaded = loadSaved(storage, BUILT_IN_IDS).themes[copy.theme.id]!
    expect(resolveUiEffects(reloaded)).toEqual({ effect: "tactile", strength: 35 })

    // An exported/saved theme from before PUI-113 has no field and loads flat.
    const legacy = memoryStorage()
    legacy.setItem(STORAGE_KEY, JSON.stringify({ themes: { old: { ...structuredClone(defaultTheme), id: "old", name: "Old" } }, activeId: "old", bases: { old: "default" } }))
    const old = loadSaved(legacy, BUILT_IN_IDS).themes.old!
    expect(old.uiEffects).toBeUndefined()
    expect(previewVariablesCss(old)).not.toContain("ui-tactile")
    expect(exportThemeJson(defaultTheme).json).not.toContain("uiEffects")
  })

  it("a saved theme from the accepted toggle-based build loads normalized, and saves back in the two-field shape", () => {
    const legacyEffects = (outlineButtons: boolean, tabs: boolean) => ({ effect: { $type: "string", $value: "tactile" }, outlineButtons: { $type: "boolean", $value: outlineButtons }, tabs: { $type: "boolean", $value: tabs }, strength: { $type: "number", $value: 65 } })
    const storage = memoryStorage()
    const themes = {
      outline: { ...structuredClone(defaultTheme), id: "outline", name: "Outline", uiEffects: legacyEffects(true, false) },
      tabs: { ...structuredClone(defaultTheme), id: "tabs", name: "Tabs", uiEffects: legacyEffects(false, true) },
      none: { ...structuredClone(defaultTheme), id: "none", name: "None", uiEffects: legacyEffects(false, false) },
      bad: { ...structuredClone(defaultTheme), id: "bad", name: "Bad", uiEffects: { ...legacyEffects(true, false), inputs: { $type: "boolean", $value: true } } },
    }
    storage.setItem(STORAGE_KEY, JSON.stringify({ themes, activeId: "outline", bases: { outline: "default", tabs: "default", none: "default", bad: "default" } }))
    const loaded = loadSaved(storage, BUILT_IN_IDS)
    expect(resolveUiEffects(loaded.themes.outline!)).toEqual({ effect: "tactile", strength: 65 })
    expect(resolveUiEffects(loaded.themes.tabs!)).toEqual({ effect: "tactile", strength: 65 })
    expect(resolveUiEffects(loaded.themes.none!)).toEqual({ effect: "off", strength: 65 })
    expect(previewVariablesCss(loaded.themes.none!)).not.toContain("ui-tactile")
    // A malformed value is rejected, never silently stripped.
    expect(loaded.themes.bad).toBeUndefined()
    const outline = loaded.themes.outline!
    expect(Object.keys(JSON.parse(exportThemeJson(outline).json).uiEffects)).toEqual(["effect", "strength"])
    const resaved = saveTheme(storage, loaded, outline, BUILT_IN_IDS, "default")
    expect(resaved.ok).toBe(true)
    expect(Object.keys(JSON.parse(storage.getItem(STORAGE_KEY)!).themes.outline.uiEffects)).toEqual(["effect", "strength"])
  })
})

describe("TUE-05/06/08 surface wiring", () => {
  it("flat themes render the exact pre-PUI-113 runtime CSS; Tactile appends only the effects block", () => {
    for (const theme of builtIns) expect(previewVariablesCss(theme)).not.toMatch(/ui-tactile|@layer|data-slot/)
    const on = edit(defaultTheme, buildUiEffectsOperation(defaultTheme, { effect: "tactile" }))
    const css = previewVariablesCss(on)
    const flat = previewVariablesCss({ ...defaultTheme, revision: on.revision })
    expect(css.startsWith(`${flat}\n\n/* UI effects: tactile, strength 50. */\n@layer components {`)).toBe(true)
    expect(css).toContain('[data-variant="secondary"][data-size]:is([data-slot="button"], [data-slot$="-trigger"], [data-slot$="-close"])')
    expect(css).toContain(':where([data-slot="tabs-list"]:not([data-variant="line"])) {')
    expect(css).not.toContain("tabs-trigger")
    expect(css).not.toContain('data-variant="outline"')
    const off = edit(on, buildUiEffectsOperation(on, { effect: "off" }))
    expect(previewVariablesCss(off)).toBe(previewVariablesCss({ ...defaultTheme, revision: off.revision }))
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
      operations: [buildUiEffectsOperation(defaultTheme, { effect: "tactile" })],
    }, "2026-09-29T00:00:00Z")
    if (!staged.ok) throw new Error("stage failed")
    expect(previewVariablesCss(staged.session.staged!.candidate)).toContain("@layer components")
    expect(previewVariablesCss(defaultTheme)).not.toContain("@layer components")
    expect(discardProposal(staged.session, defaultTheme, "tue-staged", "2026-09-29T00:00:01Z").ok).toBe(true)
    const applied = applyProposal(staged.session, defaultTheme, "tue-staged", "2026-09-29T00:00:01Z")
    if (!applied.ok) throw new Error("apply failed")
    expect(resolveUiEffects(applied.theme!)).toMatchObject({ effect: "tactile" })
  })

  it("IESP-06 / ADSR-04 both Workbench category lists are unmarked default surface lists, so Tactile reaches their TabsList", () => {
    const lines = (source: string) => source.match(/<TabsList[^>]*>/g) ?? []
    expect(lines(app)).toEqual([
      // PUI-134/PUI-138: the Theme code dialog's format list is an ordinary unmarked surface list too.
      '<TabsList aria-label="Code format" className="w-max max-w-full">',
      '<TabsList className="w-max flex-nowrap justify-start" aria-label="Editor categories">',
    ])
    expect(lines(previewFrame)).toEqual([
      '<TabsList className="w-max flex-nowrap justify-start" aria-label="Preview views">',
      // The States view's ordinary surface/pill sample: unmarked, so its list is the Tabs target.
      '<TabsList aria-label="Surface tabs sample">',
    ])
    // No local surface/tactile override: the shared fixed ring alone styles the list.
    for (const source of [app, previewFrame]) expect(source).not.toMatch(/data-variant="line"|bg-transparent p-0|tactile|ui-tactile/)
    const surfaceUsages = ["../../../packages/ui/src/compositions/workspace-settings.tsx", "../../../packages/ui/src/components/tabs.stories.tsx"]
    for (const path of surfaceUsages) expect(readFileSync(new URL(path, import.meta.url), "utf8")).not.toContain('data-variant="line"')
  })

  it("IESP-07 section triggers, Manage storage and the social Buttons are plain Secondary Buttons with no local recipe", () => {
    const planUsage = readFileSync(new URL("../../../packages/ui/src/compositions/plan-usage.tsx", import.meta.url), "utf8")
    const signup = readFileSync(new URL("../../../packages/ui/src/compositions/signup-form.tsx", import.meta.url), "utf8")
    expect(planUsage.match(/<Button [^>]*>Manage storage<\/Button>/g)).toEqual(['<Button variant="secondary" type="button" className="w-full cursor-pointer">Manage storage</Button>'])
    expect(planUsage).not.toMatch(/onClick|href|useState|fetch\(|navigate/)
    expect(signup).toContain('<Button key={provider.name} variant="secondary" type="button" className="cursor-pointer">')
    expect(signup).not.toMatch(/variant="outline"|fetch\(|https?:\/\/|oauth|signIn\(/i)
    expect(controlsSource).toMatch(/<CollapsibleTrigger asChild>[\s\S]*?<Button variant="secondary" size="sm"/)
    const section = controlsSource.slice(controlsSource.indexOf("export function ControlSection"), controlsSource.indexOf("export function LiveNumberField"))
    for (const source of [planUsage, signup, section]) expect(source).not.toMatch(/tactile|inset-shadow/i)
  })

  it("does not change the public Button or Tabs components", () => {
    const button = readFileSync(new URL("../../../packages/ui/src/components/button.tsx", import.meta.url), "utf8")
    const tabs = readFileSync(new URL("../../../packages/ui/src/components/tabs.tsx", import.meta.url), "utf8")
    expect(button).not.toMatch(/tactile|uiEffects/i)
    expect(tabs).not.toMatch(/tactile|uiEffects|variant/i)
  })
})
