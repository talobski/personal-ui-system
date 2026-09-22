export type Principle = { id: string; text: string; sourceId: string; sha256: string }

/**
 * Sourced verbatim from `BRIEF.md`'s "Design boundaries" section, "### Personal system owns" list. `sha256` is the
 * SHA-256 of the exact `text` string (not the whole file), so it stays valid even as unrelated parts of `BRIEF.md`
 * change. A dedicated test both recomputes this hash and asserts `text` appears verbatim in the live `BRIEF.md`.
 */
const BRIEF_PERSONAL_SYSTEM_OWNS = "BRIEF.md#design-boundaries-personal-system-owns"

const BUTTON_FORM_DENSITY_RESTRAINT: Principle = Object.freeze({
  id: "personal-system.button-hierarchy-form-density-restraint",
  text: "Button hierarchy, form behavior, information density principles, and restraint rules.",
  sourceId: BRIEF_PERSONAL_SYSTEM_OWNS,
  sha256: "42ed4903ed878594b5926842951aaf3c5456b0c0c1c4c11c2b0ef8b5e928d5d0",
})

const ACCESSIBILITY_AND_RESPONSIVE: Principle = Object.freeze({
  id: "personal-system.accessibility-and-responsive-constraints",
  text: "Accessibility and responsive constraints.",
  sourceId: BRIEF_PERSONAL_SYSTEM_OWNS,
  sha256: "c7636b025f3bd160b13f966a6cbc3b0f2d7b9f9575f48aca472dbe18d0df5a19",
})

/**
 * Only a resource with a genuinely sourced, applicable principle appears here. A resource id absent from this map
 * has none, and lookup returns `undefined` rather than an empty array, so `get` can omit the field entirely instead
 * of inventing or padding it. Every array and object below is frozen: these exact references are embedded directly
 * into every `get` result, so an unfrozen array/object here would let a caller's mutation of one result corrupt this
 * singleton for every later, unrelated call.
 */
const PRINCIPLES_BY_RESOURCE: Readonly<Record<string, readonly Principle[]>> = Object.freeze({
  button: Object.freeze([BUTTON_FORM_DENSITY_RESTRAINT]),
  input: Object.freeze([BUTTON_FORM_DENSITY_RESTRAINT]),
  "responsive-dialog": Object.freeze([ACCESSIBILITY_AND_RESPONSIVE]),
})

export function principlesFor(resourceId: string): readonly Principle[] | undefined {
  return PRINCIPLES_BY_RESOURCE[resourceId]
}
