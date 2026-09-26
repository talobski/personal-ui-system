import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { applyProposal, createProposalSession, stageProposal, validateTheme } from "@personal-ui/core"
import type { Theme, ThemeOperation } from "@personal-ui/core"

import { EMPTY_TRACK, isDirty, MAX_HISTORY_ENTRIES, record, redo, reset, restoreContent, sameDesign, undo } from "./history"
import type { HistoryTrack } from "./history"
import { createCustomTheme, editTheme, loadBuiltInThemes } from "./lifecycle"
import { NUMERIC_CONTROLS } from "./controls"

const [defaultTheme, quietEditorial] = loadBuiltInThemes() as [Theme, Theme]

const edit = (theme: Theme, operation: ThemeOperation) => {
  const result = editTheme(theme, operation)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.theme
}

/** A committed manual edit as the Workbench records it: one checkpoint from the theme it was built on. */
const commit = (track: HistoryTrack, theme: Theme, operation: ThemeOperation) => {
  const next = edit(theme, operation)
  return { track: record(track, theme, next), theme: next }
}

const radius = (value: string): ThemeOperation => ({ op: "setRadiusBase", value })

describe("STHG-09 history correctness", () => {
  it("undo and redo restore design content with a new, monotonically increasing, schema-valid revision", () => {
    let state = { track: EMPTY_TRACK, theme: defaultTheme }
    state = commit(state.track, state.theme, radius("0.5rem"))
    state = commit(state.track, state.theme, { op: "setFontWeight", target: "heading", value: 800 })
    expect(state.theme.revision).toBe(3)
    expect(state.track.past).toHaveLength(2)

    const undone = undo(state.track, state.theme)!
    expect(undone.theme.revision).toBe(4)
    expect(undone.theme.typography.heading.weight.$value).toBe(600)
    expect(undone.theme.radius.base.$value).toBe("0.5rem")
    expect(validateTheme(undone.theme)).toEqual({ ok: true, theme: undone.theme })

    const twice = undo(undone.track, undone.theme)!
    expect(twice.theme.revision).toBe(5)
    expect(sameDesign(twice.theme, defaultTheme)).toBe(true)
    expect(undo(twice.track, twice.theme)).toBeNull()

    const redone = redo(twice.track, twice.theme)!
    expect(redone.theme.revision).toBe(6)
    expect(redone.theme.radius.base.$value).toBe("0.5rem")
    const again = redo(redone.track, redone.theme)!
    expect(again.theme.revision).toBe(7)
    expect(again.theme.typography.heading.weight.$value).toBe(800)
    expect(redo(again.track, again.theme)).toBeNull()
  })

  it("a new committed edit after Undo clears Redo", () => {
    const first = commit(EMPTY_TRACK, defaultTheme, radius("0.5rem"))
    const undone = undo(first.track, first.theme)!
    expect(undone.track.future).toHaveLength(1)
    const branched = commit(undone.track, undone.theme, radius("1rem"))
    expect(branched.track.future).toHaveLength(0)
    expect(redo(branched.track, branched.theme)).toBeNull()
  })

  it("no-op edits create no history", () => {
    const same = edit(defaultTheme, radius("0.7rem"))
    expect(record(EMPTY_TRACK, defaultTheme, same)).toBe(EMPTY_TRACK)
  })

  it("restores content under the current identity, never an old identity or revision", () => {
    const custom = createCustomTheme(edit(defaultTheme, radius("0.5rem")), "Mine", ["default", "quiet-editorial"])
    if (!custom.ok) throw new Error("save as")
    const restored = restoreContent(defaultTheme, { ...custom.theme, revision: 9 })
    expect(restored).toMatchObject({ id: "mine", name: "Mine", revision: 10 })
    expect(restored.radius.base.$value).toBe("0.7rem")
  })

  it("dirty compares design values with the durable baseline, excluding revision and Sidebar bookkeeping", () => {
    expect(isDirty(defaultTheme, defaultTheme)).toBe(false)
    const edited = edit(defaultTheme, radius("0.5rem"))
    expect(isDirty(edited, defaultTheme)).toBe(true)
    const back = undo(record(EMPTY_TRACK, defaultTheme, edited), edited)!.theme
    expect(back.revision).toBe(3)
    expect(isDirty(back, defaultTheme)).toBe(false)
    // Activating then deactivating dedicated Sidebar tokens initializes bookkeeping but changes no design value.
    const toggled = edit(edit(defaultTheme, { op: "setSidebarTokensEnabled", value: true }), { op: "setSidebarTokensEnabled", value: false })
    expect(toggled.sidebar.dedicatedValuesInitialized).toBe(true)
    expect(isDirty(toggled, defaultTheme)).toBe(false)
  })

  it("keeps one bounded track: the oldest checkpoints beyond the limit are dropped deterministically", () => {
    let state = { track: EMPTY_TRACK, theme: defaultTheme }
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i++) state = commit(state.track, state.theme, radius(`${(i % 2 === 0 ? 0.5 : 0.6) + i / 1000}rem`))
    expect(state.track.past).toHaveLength(MAX_HISTORY_ENTRIES)
    expect(state.track.past[0]!.revision).toBe(6)
  })
})

describe("STHG-10 coalescing and reset", () => {
  it("a continuous gesture rebuilt from its captured base is one checkpoint and one revision", () => {
    // What the Workbench does for a drag: every step is built against the gesture base, then one record at the end.
    const base = defaultTheme
    const steps = [0.8, 0.9, 1.0, 1.1].map((value) => edit(base, NUMERIC_CONTROLS.radius.build(value, base)))
    for (const step of steps) expect(step.revision).toBe(base.revision + 1)
    const track = record(EMPTY_TRACK, base, steps.at(-1)!)
    expect(track.past).toEqual([base])
    const undone = undo(track, steps.at(-1)!)!
    expect(sameDesign(undone.theme, base)).toBe(true)
    expect(undone.theme.revision).toBe(base.revision + 2)
  })

  it("Reset targets the immutable built-in fixture, is one undoable transition, and is a no-op when clean", () => {
    const edited = commit(commit(EMPTY_TRACK, defaultTheme, radius("0.5rem")).track, edit(defaultTheme, radius("0.5rem")), { op: "setTracking", target: "body", value: "0.02em" })
    const resetStep = reset(edited.track, edited.theme, defaultTheme)!
    expect(sameDesign(resetStep.theme, defaultTheme)).toBe(true)
    expect(resetStep.theme.revision).toBe(edited.theme.revision + 1)
    expect(resetStep.track.past).toHaveLength(edited.track.past.length + 1)
    const undone = undo(resetStep.track, resetStep.theme)!
    expect(sameDesign(undone.theme, edited.theme)).toBe(true)
    expect(reset(EMPTY_TRACK, defaultTheme, defaultTheme)).toBeNull()
  })

  it("Reset of a custom theme targets its last saved snapshot, not the built-in it came from", () => {
    const saved = createCustomTheme(edit(defaultTheme, radius("1rem")), "Soft", ["default", "quiet-editorial"])
    if (!saved.ok) throw new Error("save as")
    const working = commit(EMPTY_TRACK, saved.theme, { op: "setDensity", value: 1.5 })
    const resetStep = reset(working.track, working.theme, saved.theme)!
    expect(sameDesign(resetStep.theme, saved.theme)).toBe(true)
    expect(resetStep.theme.radius.base.$value).toBe("1rem")
    expect(sameDesign(resetStep.theme, defaultTheme)).toBe(false)
  })
})

describe("STHG-11 lifecycle integration", () => {
  it("Design Command Apply is one atomic checkpoint; staging and discarding never touch history", () => {
    const proposal = {
      schemaVersion: "1.0",
      proposalId: "dc-1",
      base: { themeId: quietEditorial.id, revision: quietEditorial.revision },
      provenance: { source: "agent", sourceId: "jev-design-command.1", createdAt: "2026-09-26T00:00:00Z" },
      operations: [radius("1rem"), { op: "setFontFamily", target: "heading", value: ["Newsreader Variable", "Newsreader", "ui-serif", "Georgia", "serif"] }, { op: "setDensity", value: 1.3 }],
    }
    const session = stageProposal(createProposalSession(), quietEditorial, proposal, "2026-09-26T00:00:00Z")
    if (!session.ok) throw new Error(JSON.stringify(session.errors))
    const applied = applyProposal(session.session, quietEditorial, "dc-1", "2026-09-26T00:00:01Z")
    if (!applied.ok) throw new Error(JSON.stringify(applied.errors))
    const track = record(EMPTY_TRACK, quietEditorial, applied.theme!)
    expect(track.past).toHaveLength(1)
    const undone = undo(track, applied.theme!)!
    expect(sameDesign(undone.theme, quietEditorial)).toBe(true)
    expect(undone.theme.revision).toBe(applied.theme!.revision + 1)
  })

  it("Save re-baselines without clearing history; Undo after Save makes the theme dirty again", () => {
    const created = createCustomTheme(defaultTheme, "Keep", ["default", "quiet-editorial"])
    if (!created.ok) throw new Error("save as")
    const edited = commit(EMPTY_TRACK, created.theme, radius("0.25rem"))
    const savedSnapshot = edited.theme
    expect(isDirty(edited.theme, savedSnapshot)).toBe(false)
    const undone = undo(edited.track, edited.theme)!
    expect(isDirty(undone.theme, savedSnapshot)).toBe(true)
  })

  it("the Workbench wires tracks per theme, working-state switching, Save As, Apply, and reload semantics", () => {
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
    // Per-theme session tracks and working states live only in React state/refs: never persisted.
    expect(app).toContain("const tracksRef = React.useRef<Readonly<Record<string, HistoryTrack>>>({})")
    expect(app).toContain("const working = React.useRef<Readonly<Record<string, Theme>>>({})")
    expect(app).not.toMatch(/localStorage[^\n]*(?:tracks|working|history)/i)
    expect(app).toContain("const next = working.current[id] ?? builtInById(id) ?? saved.themes[id]")
    expect(app).toContain("working.current = without(working.current, builtInCopy.id, copy.theme.id)")
    expect(app).toContain("writeTracks(without(tracksRef.current, builtInCopy.id, copy.theme.id))")
    expect(app).toContain("writeTrack(current.id, record(trackOf(current.id), current, result.theme!))")
    // Stage/Discard paths create no history.
    const discard = app.slice(app.indexOf("const discardStaged"), app.indexOf("const save = "))
    expect(discard).not.toMatch(/writeTrack|record\(/)
    const evaluate = app.slice(app.indexOf("const evaluateCommand"), app.indexOf("const discardStaged"))
    expect(evaluate).not.toMatch(/writeTrack|record\(/)
  })
})

describe("STHG-12 recovery UI source contract", () => {
  const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
  it("places Undo, Redo, Reset immediately before Export and Save, with accessible names and disabled states", () => {
    const toolbar = app.slice(app.indexOf('data-testid="workbench-toolbar"'))
    const order = ['aria-label="Undo"', 'aria-label="Redo"', 'aria-label="Reset"', 'title="Export"', 'title="Save"'].map((needle) => toolbar.indexOf(needle))
    expect(order.every((index) => index > 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(toolbar).toContain('disabled={locked || track.past.length === 0} onClick={undoEdit}')
    expect(toolbar).toContain('disabled={locked || track.future.length === 0} onClick={redoEdit}')
    expect(toolbar).toContain("disabled={locked || !dirty || baseline === undefined}")
    // Reset confirms through the accepted Responsive Dialog/Drawer pattern.
    expect(toolbar.slice(toolbar.indexOf('aria-label="Reset"') - 400, toolbar.indexOf('title="Export"'))).toContain("<ResponsiveDialog open={resetOpen} onOpenChange={setResetOpen}>")
  })
})
