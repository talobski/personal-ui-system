import { afterEach, describe, expect, it, vi } from "vitest"
import { ColorPickerController, PICKER_DEBOUNCE_MS } from "./colorPicker"
import { editTheme, loadBuiltInThemes } from "./lifecycle"
import { EMPTY_TRACK, isDirty, record, redo, undo } from "./history"

afterEach(() => vi.useRealTimers())

function setup() {
  vi.useFakeTimers()
  const begin = vi.fn(), end = vi.fn(), commit = vi.fn()
  const controller = new ColorPickerController(begin, end)
  const owner = { key: "color-primary-picker" }
  return { controller, owner, begin, end, commit }
}

describe("NGIP-12 shared color picker scheduling", () => {
  it("uses 120ms after the latest movement; a pause commits but does not end the gesture", () => {
    const { controller, owner, begin, end, commit } = setup()
    expect(PICKER_DEBOUNCE_MS).toBe(120)
    controller.move(owner, () => commit("first"))
    vi.advanceTimersByTime(100)
    controller.move(owner, () => commit("latest"))
    vi.advanceTimersByTime(119)
    expect(commit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(commit.mock.calls).toEqual([["latest"]])
    expect(begin).toHaveBeenCalledExactlyOnceWith(owner.key)
    expect(end).not.toHaveBeenCalled()
    controller.finish(owner)
    expect(end).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it.each(["pointerup", "change", "blur"])("completion (%s) immediately flushes once and rejects the cancelled callback", () => {
    const { controller, owner, end, commit } = setup()
    const spy = vi.spyOn(globalThis, "setTimeout")
    controller.move(owner, commit)
    const stale = spy.mock.calls.at(-1)![0] as () => void
    controller.finish(owner)
    stale()
    vi.runAllTimers()
    controller.finish(owner)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(end).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it("rejects out-of-order callbacks even when clearTimeout cannot remove an already queued task", () => {
    const { controller, owner, commit } = setup()
    const spy = vi.spyOn(globalThis, "setTimeout")
    controller.move(owner, () => commit("old"))
    const stale = spy.mock.calls.at(-1)![0] as () => void
    controller.move(owner, () => commit("new"))
    stale()
    expect(commit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(120)
    expect(commit.mock.calls).toEqual([["new"]])
    spy.mockRestore()
  })

  it("unmount/lock cancels pending work; a remount with the same key has a different identity", () => {
    const { controller, owner, commit, end } = setup()
    const spy = vi.spyOn(globalThis, "setTimeout")
    controller.move(owner, () => commit("old theme"))
    const stale = spy.mock.calls.at(-1)![0] as () => void
    controller.cancel(owner)
    const replacement = { key: owner.key }
    controller.move(replacement, () => commit("new theme"))
    controller.cancel(owner) // old cleanup cannot cancel its replacement
    stale()
    expect(commit).not.toHaveBeenCalled()
    controller.finish(replacement)
    vi.runAllTimers()
    expect(commit.mock.calls).toEqual([["new theme"]])
    expect(end).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  it("switching between semantic and shadow pickers flushes the first before beginning the second", () => {
    const events: string[] = []
    vi.useFakeTimers()
    const controller = new ColorPickerController(key => events.push(`begin:${key}`), () => events.push("end"))
    controller.move({ key: "semantic" }, () => events.push("semantic"))
    controller.move({ key: "shadow" }, () => events.push("shadow"))
    controller.finish()
    expect(events).toEqual(["begin:semantic", "semantic", "end", "begin:shadow", "shadow", "end"])
  })
})

describe("NGIP-13 canonical history integration", () => {
  it("a continuous gesture with a pause and final flush normalizes OKLCH and creates one undo checkpoint", () => {
    vi.useFakeTimers()
    const baseline = loadBuiltInThemes()[0]!
    let current = baseline, base = baseline, track = EMPTY_TRACK
    const controller = new ColorPickerController(() => { base = current }, () => { track = record(track, base, current) })
    const owner = { key: "semantic" }
    const move = (raw: string) => controller.move(owner, () => {
      const result = editTheme(base, { op: "setColor", mode: "light", token: "primary", value: raw })
      if (!result.ok) throw new Error("unexpected rejection")
      current = result.theme
    })
    move("#112233")
    move("#223344")
    expect(current).toBe(baseline)
    vi.advanceTimersByTime(120)
    expect(current.colors.light.primary.$value).toMatch(/^oklch\(/)
    expect(current.revision).toBe(baseline.revision + 1)
    expect(track.past).toHaveLength(0)
    move("#334455")
    controller.finish()
    vi.runAllTimers()
    expect(track.past).toHaveLength(1)
    expect(isDirty(current, baseline)).toBe(true)
    const expected = editTheme(baseline, { op: "setColor", mode: "light", token: "primary", value: "#334455" })
    expect(expected.ok && expected.theme).toEqual(current)
    const undone = undo(track, current)!
    expect(isDirty(undone.theme, baseline)).toBe(false)
    expect(undone.theme.revision).toBe(current.revision + 1)
    const redone = redo(undone.track, undone.theme)!
    expect(redone.theme.colors).toEqual(current.colors)
    expect(redone.theme.revision).toBe(current.revision + 2)
  })
})
