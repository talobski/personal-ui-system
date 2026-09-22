import { describe, expect, it } from "vitest"
import { DESIGN_COMMAND_STATE_VERSION, MAX_COMMAND_TEXT_LENGTH, buildDesignCommandState, isCommandTextUsable } from "./state"

describe("buildDesignCommandState", () => {
  it("trims and strips control characters", () => {
    const state = buildDesignCommandState("  make it \x00denser\x1f  ", "light")
    expect(state).toEqual({ schemaVersion: DESIGN_COMMAND_STATE_VERSION, commandText: "make it denser", activeMode: "light" })
  })

  it("caps at MAX_COMMAND_TEXT_LENGTH characters", () => {
    const long = "x".repeat(500)
    const state = buildDesignCommandState(long, "dark")
    expect(state.commandText.length).toBe(MAX_COMMAND_TEXT_LENGTH)
  })

  it("never includes any other field, e.g. no theme, revision, or credential", () => {
    const state = buildDesignCommandState("warm it up", "light")
    expect(Object.keys(state).sort()).toEqual(["activeMode", "commandText", "schemaVersion"])
  })

  it("empty/whitespace-only text is unusable", () => {
    expect(isCommandTextUsable(buildDesignCommandState("   ", "light"))).toBe(false)
    expect(isCommandTextUsable(buildDesignCommandState("", "light"))).toBe(false)
    expect(isCommandTextUsable(buildDesignCommandState("denser", "light"))).toBe(true)
  })
})
