import { describe, expect, it } from "vitest"
import { validateComponentState } from "../index"
import invalidFixtures from "./fixtures/invalid.json"
import validFixtures from "./fixtures/valid.json"

describe("component-state constraints", () => {
  it.each(validFixtures)("admits valid $kind structured state", (state) => {
    expect(validateComponentState(state)).toEqual({ ok: true, state })
  })

  it.each(invalidFixtures)("rejects $name with its stable rule and path", ({ state, expected }) => {
    const result = validateComponentState(state)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues).toContainEqual(expected)
  })

  it("rejects unknown kinds, fields, and CSS/file-shaped escape hatches", () => {
    for (const state of [
      { kind: "arbitrary", css: "body{}" },
      { kind: "button-group", buttons: [], file: "/tmp/theme.css" },
      { kind: "responsive-dialog", viewportWidth: 1024, rendered: "dialog", hasTitle: true, hasDescription: true, focusManagement: "primitive", css: "x" },
    ]) {
      const result = validateComponentState(state)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.issues.every((issue) => issue.ruleId === "constraint.invalid-state")).toBe(true)
    }
  })
})
