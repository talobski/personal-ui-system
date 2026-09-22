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
      { kind: "tabs", tabs: [{ id: "profile", label: "Profile", disabled: false }], activeTabId: "profile", css: "body{}" },
      { kind: "single-toggle-group", label: "Plan", options: [{ label: "A", value: "a", disabled: false }], value: "a", file: "/tmp/x" },
      { kind: "card", hasTitle: true, actionCount: 1, css: "body{}" },
      { kind: "switch", id: "x", accessibleName: "X", checked: false, disabled: false, path: "/etc/passwd" },
    ]) {
      const result = validateComponentState(state)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.issues.every((issue) => issue.ruleId === "constraint.invalid-state")).toBe(true)
    }
  })

  it("rejects unsupported Field composition with its stable rule and path", () => {
    expect(
      validateComponentState({ kind: "field-composition", orientation: "vertical", label: null, descriptionId: null, control: { kind: "combobox" } })
    ).toEqual({ ok: false, issues: [{ ruleId: "field.unsupported-composition", path: "control.kind" }] })
  })
})
