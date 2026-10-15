import { describe, expect, it } from "vitest"
import { applyProposal, createProposalSession, diffThemeTokens, discardProposal, renderUiEffectsCss, stageProposal } from "@personal-ui/core"
import type { Theme } from "@personal-ui/core"
import { buildDesignCommandProposal } from "./designCommand"
import { record, reset, undo, redo, EMPTY_TRACK, isDirty } from "./history"
import { createCustomTheme, editColor, editTheme, exportThemeJson, loadBuiltInThemes, previewVariablesCss } from "./lifecycle"
import { emptySaved, loadSaved, saveTheme } from "./persistence"
import type { StorageLike } from "./persistence"

/** ADSR-03 (PUI-123): Amber Dusk uses only the existing built-in, history, Save As, persistence, export and proposal flows. */

const builtIns = loadBuiltInThemes()
const ids = builtIns.map((theme) => theme.id)
const amber = builtIns.find((theme) => theme.id === "amber-dusk")!
const byId = (id: string) => builtIns.find((theme) => theme.id === id)!
const memoryStorage = (): StorageLike & { data: Record<string, string> } => {
  const data: Record<string, string> = {}
  return { data, getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) }
}
const ok = <T,>(result: { ok: true; theme: T } | { ok: false }) => {
  if (!result.ok) throw new Error("expected ok")
  return result.theme
}
const NOW = "2026-09-30T00:00:00Z"

describe("ADSR-03 Amber Dusk through existing Workbench flows", () => {
  it("is the third built-in and switching previews its own values without leaking into other built-ins", () => {
    expect(ids.slice(0, 3)).toEqual(["default", "quiet-editorial", "amber-dusk"])
    expect(amber.name).toBe("Amber Dusk")
    const css = previewVariablesCss(amber)
    expect(css).toContain(`--primary: ${amber.colors.light.primary.$value};`)
    expect(css).toContain(`--sidebar: ${amber.colors.light.sidebar.$value};`)
    expect(css).toContain(`--chart-2: ${amber.colors.light["chart-2"].$value};`)
    for (const other of ["default", "quiet-editorial"]) {
      const otherCss = previewVariablesCss(byId(other))
      expect(otherCss).not.toContain(amber.colors.light.primary.$value)
      expect(otherCss).not.toContain(amber.colors.dark.sidebar.$value)
      // Re-selection is a pure function of the fixture: no residue from having edited Amber Dusk.
      const edited = ok(editColor(amber, "light", "primary", "#336699"))
      expect(previewVariablesCss(byId(other))).toBe(otherCss)
      expect(previewVariablesCss(amber)).toBe(css)
      expect(edited.colors.light.primary.$value).not.toBe(amber.colors.light.primary.$value)
    }
  })

  it("history records, undoes, redoes, and resets to the immutable built-in baseline", () => {
    const edited = ok(editTheme(amber, { op: "setRadius", value: "1rem" }))
    const track = record(EMPTY_TRACK, amber, edited)
    expect(isDirty(edited, amber)).toBe(true)
    const back = undo(track, edited)!
    expect(isDirty(back.theme, amber)).toBe(false)
    const forward = redo(back.track, back.theme)!
    expect(diffThemeTokens(forward.theme, edited)).toEqual([])
    const restored = reset(forward.track, forward.theme, amber)!
    expect(isDirty(restored.theme, amber)).toBe(false)
    expect(loadBuiltInThemes().find((theme) => theme.id === "amber-dusk")).toEqual(amber)
  })

  it("Save As creates a custom copy, saves and reloads it with its built-in base; the built-in id stays reserved", () => {
    const copy = ok(createCustomTheme(amber, "Amber Dusk", ids))
    expect(copy.id).toBe("amber-dusk-2")
    expect(diffThemeTokens(amber, copy)).toEqual([])
    const storage = memoryStorage()
    const saved = saveTheme(storage, emptySaved(), copy, ids, amber.id)
    if (!saved.ok) throw new Error("save failed")
    const reloaded = loadSaved(storage, ids)
    expect(reloaded.themes["amber-dusk-2"]).toEqual(copy)
    expect(reloaded.bases["amber-dusk-2"]).toBe("amber-dusk")
    expect(saveTheme(storage, emptySaved(), amber, ids, amber.id)).toEqual({ ok: false, issues: [{ ruleId: "workbench.save.reserved-id", path: "id" }] })
    // A custom save of an edited copy persists the edit; compare reports exactly the changed token.
    const edited = ok(editColor(copy, "dark", "primary", "oklch(0.7 0.1 40)"))
    expect(diffThemeTokens(copy, edited).map((entry) => entry.path)).toEqual(["colors.dark.primary"])
  })

  it("exports portable JSON carrying Amber Dusk's design tokens without its identity", () => {
    const { filename, json } = exportThemeJson(amber)
    expect(filename).toBe("amber-dusk.theme.json")
    expect(JSON.parse(json).colors).toEqual(amber.colors)
    expect(json).not.toMatch(/amber|Amber|schemaVersion|revision/)
  })

  it("Design Command proposals stage, discard and apply against Amber Dusk through the unchanged pipeline", () => {
    const proposal = (id: string) => buildDesignCommandProposal("make it softer", [{ op: "setRadius", value: "0.75rem" }], { themeId: amber.id, revision: amber.revision }, id, NOW)
    let session = stageProposal(createProposalSession(), amber, proposal("a"), NOW).session
    session = discardProposal(session, amber, "a", NOW).session
    const staged = stageProposal(session, amber, proposal("b"), NOW)
    if (!staged.ok) throw new Error("stage failed")
    expect(staged.staged.evaluation.diff.map((entry) => entry.path)).toEqual(["radius.md"])
    const applied = applyProposal(staged.session, amber, "b", NOW)
    if (!applied.ok) throw new Error("apply failed")
    const theme: Theme = applied.theme!
    expect(theme.radius.md.$value).toBe("0.75rem")
    expect(theme.sidebar.useDedicatedTokens.$value).toBe(true)
  })

  it("UI Effects Tactile uses the generic recipe on Amber Dusk", () => {
    const tactile = ok(editTheme(amber, { op: "setUiEffects", value: { effect: "tactile", strength: 50 } }))
    const reference = ok(editTheme(byId("default"), { op: "setUiEffects", value: { effect: "tactile", strength: 50 } }))
    expect(renderUiEffectsCss(tactile)).toBe(renderUiEffectsCss(reference))
    expect(renderUiEffectsCss(amber)).toBe("")
  })
})
