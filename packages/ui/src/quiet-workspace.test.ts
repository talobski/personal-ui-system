import { readFileSync } from "node:fs"
import { expect, it } from "vitest"
import { validateComponentState, evaluateContextRequest, getContract } from "@personal-ui/core"
import { editorBounds, initialPreviewWidth } from "../../../apps/workbench/src/layout"

it("initializes preview width at the outer Workbench desktop breakpoint", () => {
  for (const width of [320, 390, 1023]) expect(initialPreviewWidth(width)).toBe("mobile")
  for (const width of [1024, 1440, 1600]) expect(initialPreviewWidth(width)).toBe("desktop")
})

it("clamps editor bounds at desktop sizes without widening the theme", () => {
  expect(editorBounds(1440)).toEqual({ min: 352, max: 480, defaultSize: 352 })
  expect(editorBounds(1024)).toEqual({ min: 352, max: 384, defaultSize: 352 })
  expect(editorBounds(990).min).toBeLessThanOrEqual(editorBounds(990).max)
})
it("rejects unordered panel bounds and inaccessible separators with stable rules", () => {
  const valid = { kind: "resizable-panel", minPx: 352, defaultPx: 352, maxPx: 480, separatorName: "Resize editor", primitiveSeparator: true, visibleFocus: true }
  expect(validateComponentState(valid).ok).toBe(true)
  for (const patch of [{ defaultPx: 600 }, { maxPx: 300 }]) expect(validateComponentState({ ...valid, ...patch })).toMatchObject({ ok: false, issues: [{ ruleId: "resizable-panel.bounds" }] })
  for (const patch of [{ separatorName: null }, { primitiveSeparator: false }, { visibleFocus: false }]) expect(validateComponentState({ ...valid, ...patch })).toMatchObject({ ok: false, issues: [{ ruleId: "resizable-panel.accessible-separator" }] })
  expect(validateComponentState({ ...valid, minPx: Infinity }).ok).toBe(false)
  expect(validateComponentState({ ...valid, customHandler: true }).ok).toBe(false)
})
it("retrieves the sole new resource deterministically with provenance", async () => {
  const request = { version: "personal-ui-context/1", operation: "get", theme: "quiet-editorial", resource: "resizable-panel" }
  expect(await evaluateContextRequest(request)).toEqual(await evaluateContextRequest(request))
  expect((await getContract("resizable-panel"))?.composition.join(" ")).toContain("react-resizable-panels@4.13.2")
  const result = await evaluateContextRequest(request)
  expect(result.ok).toBe(true)
  expect(JSON.stringify(result)).toContain("packages/core/src/contracts/data/resizable-panel.ts")
})
it("uses exactly eight shared modules and thin stories, preserving accepted fixture variants", async () => {
  const names = ["productive-week", "account-profile", "team-access", "workspace-settings", "notification-preferences", "support-request", "recent-activity", "room-to-think"]
  const gallery = readFileSync(new URL("../../../apps/workbench/src/Gallery.tsx", import.meta.url), "utf8")
  for (const name of names) {
    const implementation = await import(`./compositions/${name}.tsx`)
    const storyModule = await import(`./compositions/${name}.stories.tsx`)
    expect(Object.values(implementation)).toContain(storyModule.default.component)
    const story = readFileSync(new URL(`./compositions/${name}.stories.tsx`, import.meta.url), "utf8")
    expect(gallery).toContain(`@personal-ui/ui/compositions/${name}`)
    expect(story).toContain(`from "./${name}"`)
    expect(story).not.toMatch(/function |<Card|<Input/)
  }
  expect(gallery.match(/from "@personal-ui\/ui\/compositions\//g)).toHaveLength(8)
  const resize = readFileSync(new URL("./components/resizable-panel.tsx", import.meta.url), "utf8")
  expect(resize).toContain('from "react-resizable-panels"')
  expect(resize).not.toMatch(/onPointer|onKeyDown|addEventListener/)
})
