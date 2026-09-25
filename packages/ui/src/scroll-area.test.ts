import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { evaluateContextRequest, getContract, validateComponentState } from "../../core/src/index"

const valid = { kind: "scroll-area", bounded: true, accessibleName: "Activity", keyboardReachable: true, visibleFocus: true, nativeInput: true, competingScroller: false }
describe("ScrollArea public resource (WCN-02/03)", () => {
  it("retrieves only its validated contract, deterministically, with source provenance", async () => {
    const request = { version: "personal-ui-context/1", operation: "get", resource: "scroll-area", theme: "default" }
    const result = await evaluateContextRequest(request)
    expect(result.ok).toBe(true)
    expect(result).toEqual(await evaluateContextRequest(request))
    expect(JSON.stringify(result)).toContain("packages/core/src/contracts/data/scroll-area.ts")
    expect((await getContract("scroll-area"))?.composition.join(" ")).toContain("radix-ui@1.6.7")
  })
  it("enforces bounded, accessible, native scrolling and rejects undeclared fields", () => {
    expect(validateComponentState(valid).ok).toBe(true)
    for (const [patch, ruleId] of [
      [{ bounded: false }, "scroll-area.bounded"],
      [{ accessibleName: " " }, "scroll-area.accessible-viewport"],
      [{ keyboardReachable: false }, "scroll-area.accessible-viewport"],
      [{ visibleFocus: false }, "scroll-area.accessible-viewport"],
      [{ nativeInput: false }, "scroll-area.native-input"],
      [{ competingScroller: true }, "scroll-area.native-input"],
      [{ customHandler: true }, "constraint.invalid-state"],
    ] as const) expect(validateComponentState({ ...valid, ...patch })).toMatchObject({ ok: false, issues: [{ ruleId }] })
  })
  it("delegates every scrolling modality to Radix and declares no bespoke input handlers", () => {
    const source = readFileSync(new URL("./components/scroll-area.tsx", import.meta.url), "utf8")
    expect(source).toContain('import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"')
    for (const part of ["Root", "Viewport", "ScrollAreaScrollbar", "ScrollAreaThumb", "Corner"]) expect(source).toContain(`<ScrollAreaPrimitive.${part}`)
    expect(source).not.toMatch(/onWheel|onPointer|onTouch|onKeyDown|addEventListener|preventDefault/)
    expect(source).toContain("viewportProps")
    expect(source).toContain('orientation !== "horizontal"')
    expect(source).toContain('orientation !== "vertical"')
  })
})
