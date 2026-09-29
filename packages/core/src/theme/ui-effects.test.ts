import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  applyMutation,
  createProposalSession,
  applyProposal,
  describeOperations,
  diffThemeTokens,
  MUTATION_SCHEMA_VERSION,
  renderShadcnTailwindCss,
  renderUiEffectsCss,
  resolveUiEffects,
  stageProposal,
  TACTILE_OUTLINE_BUTTON_SELECTOR,
  TACTILE_SURFACE_TAB_SELECTOR,
  THEME_SCHEMA_URI,
  THEME_SCHEMA_VERSION,
  UI_EFFECTS_FLAT,
  validateMutation,
  validateTheme,
} from "../index"
import type { Theme, ThemeOperation, UiEffectsValue } from "../index"
import defaultFixture from "./fixtures/default.json"
import quietFixture from "./fixtures/valid.json"
import v1Fixture from "./fixtures/legacy/quiet-editorial.v1.json"
import v20Fixture from "./fixtures/legacy/default.v2.0.json"
import v21Fixture from "./fixtures/legacy/default.v2.1.json"

/** PUI-113 / TUE-02, TUE-03, TUE-05, TUE-06 at the core boundary. */

const valid = (input: unknown): Theme => {
  const result = validateTheme(input)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.theme
}
const request = (theme: Theme, operations: unknown[]) => ({ schemaVersion: MUTATION_SCHEMA_VERSION, requestId: "r", base: { themeId: theme.id, revision: theme.revision }, operations })
const apply = (theme: Theme, operation: ThemeOperation) => {
  const result = applyMutation(theme, request(theme, [operation]))
  if (!result.ok) throw new Error(JSON.stringify(result.errors))
  return result
}
const setUiEffects = (value: Partial<UiEffectsValue>): ThemeOperation => ({ op: "setUiEffects", value: { ...UI_EFFECTS_FLAT, ...value } })

const base = valid(defaultFixture)

describe("TUE-02 Theme v3 compatibility", () => {
  it("keeps Theme v3.0 and imports every older input and both built-ins flat, without a uiEffects field", () => {
    for (const fixture of [defaultFixture, quietFixture, v1Fixture, v20Fixture, v21Fixture]) {
      const theme = valid(fixture)
      expect(theme.schemaVersion).toBe(THEME_SCHEMA_VERSION)
      expect(theme.$schema).toBe(THEME_SCHEMA_URI)
      expect(theme.uiEffects).toBeUndefined()
      expect(resolveUiEffects(theme)).toEqual(UI_EFFECTS_FLAT)
      expect(renderUiEffectsCss(theme)).toBe("")
      expect(renderShadcnTailwindCss(theme)).not.toMatch(/ui-tactile|@layer components|data-slot/)
    }
    expect(THEME_SCHEMA_VERSION).toBe("3.0")
  })

  it("renders the committed built-in CSS byte-identically (flat themes gain nothing)", () => {
    const committed = readFileSync(new URL("./fixtures/default.css", import.meta.url), "utf8")
    expect(renderShadcnTailwindCss(base)).toBe(committed)
  })

  it("round-trips all four values through canonical validation and JSON export", () => {
    const edited = apply(base, setUiEffects({ outlineButtons: true, tabs: false, strength: 70 })).theme
    const reparsed = valid(JSON.parse(JSON.stringify(edited)))
    expect(reparsed).toEqual(edited)
    expect(reparsed.uiEffects).toEqual({
      effect: { $type: "string", $value: "tactile" },
      outlineButtons: { $type: "boolean", $value: true },
      tabs: { $type: "boolean", $value: false },
      strength: { $type: "number", $value: 70 },
    })
  })

  it("rejects out-of-bounds, unknown-effect, and extra-field uiEffects in stored themes", () => {
    const withEffects = (uiEffects: unknown) => ({ ...structuredClone(defaultFixture), uiEffects })
    const good = { effect: { $type: "string", $value: "tactile" }, outlineButtons: { $type: "boolean", $value: true }, tabs: { $type: "boolean", $value: true }, strength: { $type: "number", $value: 40 } }
    expect(validateTheme(withEffects(good)).ok).toBe(true)
    expect(validateTheme(withEffects({ ...good, strength: { $type: "number", $value: 101 } })).ok).toBe(false)
    expect(validateTheme(withEffects({ ...good, strength: { $type: "number", $value: 12.5 } })).ok).toBe(false)
    expect(validateTheme(withEffects({ ...good, effect: { $type: "string", $value: "glass" } })).ok).toBe(false)
    expect(validateTheme(withEffects({ ...good, inputs: { $type: "boolean", $value: true } })).ok).toBe(false)
    expect(validateTheme(withEffects({ ...good, css: "box-shadow: none" })).ok).toBe(false)
    const { tabs: _tabs, ...missing } = good
    expect(validateTheme(withEffects(missing)).ok).toBe(false)
  })
})

describe("TUE-03 the one closed setUiEffects operation", () => {
  it("is the only addition: thirteen operations, value-only fields", () => {
    const names = describeOperations().map((o) => o.name)
    expect(names).toHaveLength(13)
    expect(names.filter((name) => /effect/i.test(name))).toEqual(["setUiEffects"])
    expect(describeOperations().at(-1)).toEqual({ name: "setUiEffects", fields: ["op", "value"] })
  })

  it("validates every field, bound, and unknown key with stable rule ids and paths", () => {
    const check = (value: unknown) => validateMutation(request(base, [{ op: "setUiEffects", value }]), base)
    expect(check({ ...UI_EFFECTS_FLAT, outlineButtons: true, strength: 0 }).ok).toBe(true)
    expect(check({ ...UI_EFFECTS_FLAT, tabs: true, strength: 100 }).ok).toBe(true)
    expect(check({ ...UI_EFFECTS_FLAT, strength: 101 })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.strength" }] })
    expect(check({ ...UI_EFFECTS_FLAT, strength: -1 })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.strength" }] })
    expect(check({ ...UI_EFFECTS_FLAT, strength: 0.5 })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.strength" }] })
    expect(check({ ...UI_EFFECTS_FLAT, effect: "glass" })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.effect" }] })
    expect(check({ ...UI_EFFECTS_FLAT, tabs: "true" })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.tabs" }] })
    expect(check({ effect: "tactile", tabs: true, strength: 50 })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.outlineButtons" }] })
    expect(check({ ...UI_EFFECTS_FLAT, inputs: true })).toEqual({ ok: false, errors: [{ ruleId: "mutation.unknown-field", path: "operations[0].value.inputs" }] })
    expect(check({ ...UI_EFFECTS_FLAT, selector: ".x" })).toEqual({ ok: false, errors: [{ ruleId: "mutation.unknown-field", path: "operations[0].value.selector" }] })
    expect(check("box-shadow: none")).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value" }] })
    expect(validateMutation(request(base, [{ op: "setUiEffects", value: UI_EFFECTS_FLAT, target: "input" }]), base)).toEqual({ ok: false, errors: [{ ruleId: "mutation.unknown-field", path: "operations[0].target" }] })
  })

  it("replaces only uiEffects and advances the revision once; the input theme is never mutated", () => {
    const before = structuredClone(base)
    const { theme } = apply(base, setUiEffects({ tabs: true, strength: 30 }))
    expect(base).toEqual(before)
    expect(theme.revision).toBe(base.revision + 1)
    expect(diffThemeTokens(base, theme)).toEqual([
      { path: "uiEffects.strength", before: 50, after: 30 },
      { path: "uiEffects.tabs", before: false, after: true },
    ])
  })
})

describe("diff treats absence as the documented flat default", () => {
  it("an explicit flat value is the same design as no field", () => {
    const explicit = apply(base, setUiEffects({})).theme
    expect(explicit.uiEffects).toBeDefined()
    expect(diffThemeTokens(base, explicit)).toEqual([])
    expect(renderShadcnTailwindCss(explicit)).toBe(renderShadcnTailwindCss(base).replace(`revision ${base.revision}.`, `revision ${explicit.revision}.`))
  })

  it("the staged proposal pipeline carries uiEffects in its candidate without touching the active theme", () => {
    const session = createProposalSession()
    const staged = stageProposal(session, base, {
      schemaVersion: "1.0",
      proposalId: "ui-effects-1",
      base: { themeId: base.id, revision: base.revision },
      provenance: { source: "fixture", sourceId: "tue", createdAt: "2026-09-29T00:00:00Z" },
      operations: [setUiEffects({ outlineButtons: true })],
    }, "2026-09-29T00:00:00Z")
    if (!staged.ok) throw new Error(JSON.stringify(staged))
    expect(staged.session.staged!.candidate.uiEffects?.outlineButtons.$value).toBe(true)
    expect(base.uiEffects).toBeUndefined()
    const applied = applyProposal(staged.session, base, "ui-effects-1", "2026-09-29T00:00:01Z")
    if (!applied.ok) throw new Error(JSON.stringify(applied))
    expect(resolveUiEffects(applied.theme!).outlineButtons).toBe(true)
  })
})

describe("TUE-05/06 targeted rendering", () => {
  const css = (value: Partial<UiEffectsValue>) => renderUiEffectsCss(apply(base, setUiEffects(value)).theme)

  it("targets only the Outline Button and the active trigger of a non-line Tabs list", () => {
    expect(TACTILE_OUTLINE_BUTTON_SELECTOR).toBe('[data-variant="outline"][data-size]:is([data-slot="button"], [data-slot$="-trigger"], [data-slot$="-close"])')
    expect(TACTILE_SURFACE_TAB_SELECTOR).toBe('[data-slot="tabs-list"]:not([data-variant="line"]) > [data-slot="tabs-trigger"][data-state="active"]')
    const both = css({ outlineButtons: true, tabs: true })
    const where = `:where(${TACTILE_OUTLINE_BUTTON_SELECTOR}, ${TACTILE_SURFACE_TAB_SELECTOR})`
    const selectors = [...both.matchAll(/^ {2}(\S.*) \{$/gm)].map((m) => m[1])
    expect(selectors).toEqual([where, `${where}:is(.dark *)`, `${where}:active:not(:disabled)`])
    expect(both).not.toMatch(/data-variant="(?:default|secondary|ghost|destructive|link)"|data-state="inactive"|toggle|input|card|slider|switch|dialog|sidebar/i)
  })

  it("each toggle is independent", () => {
    expect(css({ outlineButtons: true })).toContain(`:where(${TACTILE_OUTLINE_BUTTON_SELECTOR}) {`)
    expect(css({ outlineButtons: true })).not.toContain("tabs-trigger")
    expect(css({ tabs: true })).toContain(`:where(${TACTILE_SURFACE_TAB_SELECTOR}) {`)
    expect(css({ tabs: true })).not.toContain('data-variant="outline"')
    expect(css({ strength: 90 })).toBe("")
  })

  it("uses only semantic tokens, sets no geometry/typography/colour property, keeps rings, and is layered below utilities", () => {
    const out = css({ outlineButtons: true, tabs: true, strength: 100 })
    expect(out).toMatch(/^\/\* UI effects: tactile, strength 100\. \*\/\n@layer components \{/)
    const properties = [...out.matchAll(/^\s+([a-z-]+):/gm)].map((m) => m[1])
    expect(new Set(properties)).toEqual(new Set(["--ui-tactile-wash-top", "--ui-tactile-wash-bottom", "--ui-tactile-highlight", "--ui-tactile-lower", "--ui-tactile-edge", "--ui-tactile-press", "background-image", "--tw-inset-shadow"]))
    expect(out).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|oklch\(|hsl\(|white|black/i)
    expect([...out.matchAll(/var\(--([a-z-]+)\)/g)].map((m) => m[1]).filter((name) => !name.startsWith("ui-tactile-"))).toEqual(expect.arrayContaining(["background", "foreground"]))
    expect(new Set([...out.matchAll(/var\(--([a-z-]+)\)/g)].map((m) => m[1]).filter((name) => !name.startsWith("ui-tactile-")))).toEqual(new Set(["background", "foreground"]))
    expect(out).toContain(":is(.dark *) {")
    expect(out).toContain(":active:not(:disabled) {")
  })

  it("strength scales the recipe linearly and is bounded: 0 is transparent, 100 caps every layer", () => {
    const percents = (text: string) => [...text.matchAll(/ ([\d.]+)%, transparent/g)].map((m) => Number(m[1]))
    expect(percents(css({ outlineButtons: true, strength: 0 })).every((p) => p === 0)).toBe(true)
    const half = percents(css({ outlineButtons: true, strength: 50 }))
    const full = percents(css({ outlineButtons: true, strength: 100 }))
    half.forEach((p, i) => expect(p).toBeCloseTo(full[i]! / 2, 2))
    expect(Math.max(...full)).toBeLessThanOrEqual(90)
  })

  it("is deterministic", () => {
    expect(css({ outlineButtons: true, tabs: true, strength: 37 })).toBe(css({ outlineButtons: true, tabs: true, strength: 37 }))
  })
})
