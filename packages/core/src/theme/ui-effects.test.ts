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
  TACTILE_SECONDARY_BUTTON_SELECTOR,
  TACTILE_SURFACE_TABS_LIST_SELECTOR,
  THEME_SCHEMA_URI,
  THEME_SCHEMA_VERSION,
  UI_EFFECTS_FLAT,
  validateMutation,
  validateTheme,
} from "../index"
import type { LegacyUiEffectsValue, Theme, ThemeOperation, UiEffectsValue } from "../index"
import defaultFixture from "./fixtures/default.json"
import quietFixture from "./fixtures/valid.json"
import v1Fixture from "./fixtures/legacy/quiet-editorial.v1.json"
import v20Fixture from "./fixtures/legacy/default.v2.0.json"
import v21Fixture from "./fixtures/legacy/default.v2.1.json"

/** PUI-113 / TUE-02, TUE-03, TUE-05, TUE-06 at the core boundary, as simplified by PUI-119/PUI-121 (IESP-02/03/05). */

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
/** The exact previously accepted PUI-113 payload, admitted only through the compatibility bridge. */
const LEGACY_FLAT: LegacyUiEffectsValue = { effect: "tactile", outlineButtons: false, tabs: false, strength: 50 }
const setLegacyUiEffects = (value: Partial<LegacyUiEffectsValue>): ThemeOperation => ({ op: "setUiEffects", value: { ...LEGACY_FLAT, ...value } })
/** Stored token objects, canonical and legacy. */
const storedCanonical = (effect: string, strength: number) => ({ effect: { $type: "string", $value: effect }, strength: { $type: "number", $value: strength } })
const storedLegacy = (outlineButtons: boolean, tabs: boolean, strength: number) => ({ effect: { $type: "string", $value: "tactile" }, outlineButtons: { $type: "boolean", $value: outlineButtons }, tabs: { $type: "boolean", $value: tabs }, strength: { $type: "number", $value: strength } })

const base = valid(defaultFixture)

describe("TUE-02 / IESP-02 Theme v3 compatibility", () => {
  it("keeps Theme v3.0 and imports every older input and both built-ins flat (Off), without a uiEffects field", () => {
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
    expect(UI_EFFECTS_FLAT).toEqual({ effect: "off", strength: 50 })
  })

  it("renders the committed built-in CSS byte-identically (flat themes gain nothing)", () => {
    const committed = readFileSync(new URL("./fixtures/default.css", import.meta.url), "utf8")
    expect(renderShadcnTailwindCss(base)).toBe(committed)
  })

  it("round-trips Effect and Strength only through canonical validation and JSON export", () => {
    const edited = apply(base, setUiEffects({ effect: "tactile", strength: 70 })).theme
    const reparsed = valid(JSON.parse(JSON.stringify(edited)))
    expect(reparsed).toEqual(edited)
    expect(reparsed.uiEffects).toEqual(storedCanonical("tactile", 70))
    const off = apply(base, setUiEffects({ effect: "off", strength: 20 })).theme
    expect(valid(JSON.parse(JSON.stringify(off))).uiEffects).toEqual(storedCanonical("off", 20))
  })

  it("migrates the exact prior four-field stored value by the any-target rule, preserving strength and all other data", () => {
    const withEffects = (uiEffects: unknown) => ({ ...structuredClone(defaultFixture), uiEffects })
    const cases: [boolean, boolean, "off" | "tactile"][] = [[true, false, "tactile"], [false, true, "tactile"], [true, true, "tactile"], [false, false, "off"]]
    for (const [outlineButtons, tabs, effect] of cases) {
      const migrated = valid(withEffects(storedLegacy(outlineButtons, tabs, 35)))
      expect(migrated.uiEffects).toEqual(storedCanonical(effect, 35))
      const { uiEffects: _u, ...rest } = migrated
      expect(rest).toEqual(base)
      // Re-validating the migrated theme is idempotent, and its export is the two-field canonical shape.
      expect(valid(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated)
      expect(Object.keys(JSON.parse(JSON.stringify(migrated)).uiEffects)).toEqual(["effect", "strength"])
    }
    // Direct schema use (the same parse the renderer and mutation pipeline use) normalizes too.
    expect(renderUiEffectsCss({ ...base, uiEffects: storedLegacy(false, true, 60) } as unknown as Theme)).toContain("strength 60")
    expect(renderUiEffectsCss({ ...base, uiEffects: storedLegacy(false, false, 60) } as unknown as Theme)).toBe("")
  })

  it("rejects out-of-bounds, unknown-effect, extra-field, partial and mixed uiEffects in stored themes", () => {
    const withEffects = (uiEffects: unknown) => ({ ...structuredClone(defaultFixture), uiEffects })
    const good = storedCanonical("tactile", 40)
    expect(validateTheme(withEffects(good)).ok).toBe(true)
    expect(validateTheme(withEffects(storedCanonical("off", 40))).ok).toBe(true)
    expect(validateTheme(withEffects({ ...good, strength: { $type: "number", $value: 101 } })).ok).toBe(false)
    expect(validateTheme(withEffects({ ...good, strength: { $type: "number", $value: 12.5 } })).ok).toBe(false)
    expect(validateTheme(withEffects({ ...good, effect: { $type: "string", $value: "glass" } })).ok).toBe(false)
    expect(validateTheme(withEffects({ ...good, inputs: { $type: "boolean", $value: true } })).ok).toBe(false)
    expect(validateTheme(withEffects({ ...good, css: "box-shadow: none" })).ok).toBe(false)
    const { effect: _effect, ...missing } = good
    expect(validateTheme(withEffects(missing)).ok).toBe(false)
    // Legacy input is admitted only in its exact accepted shape.
    const legacy = storedLegacy(true, true, 40)
    expect(validateTheme(withEffects(legacy)).ok).toBe(true)
    const { tabs: _tabs, ...partialLegacy } = legacy
    expect(validateTheme(withEffects(partialLegacy)).ok).toBe(false)
    expect(validateTheme(withEffects({ ...legacy, effect: { $type: "string", $value: "off" } })).ok).toBe(false)
    expect(validateTheme(withEffects({ ...legacy, strength: { $type: "number", $value: 101 } })).ok).toBe(false)
    expect(validateTheme(withEffects({ ...legacy, inputs: { $type: "boolean", $value: true } })).ok).toBe(false)
    expect(validateTheme(withEffects({ ...legacy, tabs: { $type: "boolean", $value: "yes" } })).ok).toBe(false)
    expect(validateTheme(withEffects({ ...good, tabs: { $type: "boolean", $value: true } })).ok).toBe(false)
  })
})

describe("TUE-03 / IESP-03 the one closed setUiEffects operation", () => {
  it("is the only addition: thirteen operations, value-only fields", () => {
    const names = describeOperations().map((o) => o.name)
    expect(names).toHaveLength(13)
    expect(names.filter((name) => /effect/i.test(name))).toEqual(["setUiEffects"])
    expect(describeOperations().at(-1)).toEqual({ name: "setUiEffects", fields: ["op", "value"] })
  })

  it("validates every canonical field, bound, and unknown key with stable rule ids and paths", () => {
    const check = (value: unknown) => validateMutation(request(base, [{ op: "setUiEffects", value }]), base)
    expect(check({ effect: "tactile", strength: 0 }).ok).toBe(true)
    expect(check({ effect: "off", strength: 100 }).ok).toBe(true)
    expect(check({ ...UI_EFFECTS_FLAT, strength: 101 })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.strength" }] })
    expect(check({ ...UI_EFFECTS_FLAT, strength: -1 })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.strength" }] })
    expect(check({ ...UI_EFFECTS_FLAT, strength: 0.5 })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.strength" }] })
    expect(check({ ...UI_EFFECTS_FLAT, effect: "glass" })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.effect" }] })
    expect(check({ strength: 50 })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.effect" }] })
    expect(check({ effect: "tactile" })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.strength" }] })
    expect(check({ ...UI_EFFECTS_FLAT, inputs: true })).toEqual({ ok: false, errors: [{ ruleId: "mutation.unknown-field", path: "operations[0].value.inputs" }] })
    expect(check({ ...UI_EFFECTS_FLAT, selector: ".x" })).toEqual({ ok: false, errors: [{ ruleId: "mutation.unknown-field", path: "operations[0].value.selector" }] })
    expect(check("box-shadow: none")).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value" }] })
    expect(validateMutation(request(base, [{ op: "setUiEffects", value: UI_EFFECTS_FLAT, target: "input" }]), base)).toEqual({ ok: false, errors: [{ ruleId: "mutation.unknown-field", path: "operations[0].target" }] })
  })

  it("admits the exact prior four-field payload with its accepted checks, and rejects mixed/partial/unknown legacy input", () => {
    const check = (value: unknown) => validateMutation(request(base, [{ op: "setUiEffects", value }]), base)
    expect(check({ ...LEGACY_FLAT, outlineButtons: true, strength: 0 }).ok).toBe(true)
    expect(check({ ...LEGACY_FLAT, tabs: true, strength: 100 }).ok).toBe(true)
    expect(check(LEGACY_FLAT).ok).toBe(true)
    expect(check({ ...LEGACY_FLAT, strength: 101 })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.strength" }] })
    expect(check({ ...LEGACY_FLAT, strength: 0.5 })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.strength" }] })
    expect(check({ ...LEGACY_FLAT, effect: "glass" })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.effect" }] })
    expect(check({ ...LEGACY_FLAT, tabs: "true" })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.tabs" }] })
    // Partial legacy: every prior field stays required.
    expect(check({ effect: "tactile", tabs: true, strength: 50 })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.outlineButtons" }] })
    // Mixed: the new `off` effect with a prior target field is neither shape.
    expect(check({ effect: "off", outlineButtons: true, tabs: false, strength: 50 })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.effect" }] })
    expect(check({ effect: "tactile", strength: 50, tabs: true })).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.outlineButtons" }] })
    expect(check({ ...LEGACY_FLAT, inputs: true })).toEqual({ ok: false, errors: [{ ruleId: "mutation.unknown-field", path: "operations[0].value.inputs" }] })
  })

  it("normalizes a prior payload by the any-target rule, atomically with the rest of the request", () => {
    expect(resolveUiEffects(apply(base, setLegacyUiEffects({ outlineButtons: true, strength: 70 })).theme)).toEqual({ effect: "tactile", strength: 70 })
    expect(resolveUiEffects(apply(base, setLegacyUiEffects({ tabs: true, strength: 30 })).theme)).toEqual({ effect: "tactile", strength: 30 })
    const bothOff = apply(base, setLegacyUiEffects({ strength: 80 })).theme
    expect(bothOff.uiEffects).toEqual(storedCanonical("off", 80))
    // One invalid operation rejects the whole request; nothing is applied.
    const rejected = applyMutation(base, request(base, [setLegacyUiEffects({ tabs: true }), { op: "setUiEffects", value: { effect: "off", tabs: true } }]))
    expect(rejected.ok).toBe(false)
  })

  it("replaces only uiEffects and advances the revision once; the input theme is never mutated", () => {
    const before = structuredClone(base)
    const { theme } = apply(base, setUiEffects({ effect: "tactile", strength: 30 }))
    expect(base).toEqual(before)
    expect(theme.revision).toBe(base.revision + 1)
    expect(diffThemeTokens(base, theme)).toEqual([
      { path: "uiEffects.effect", before: "off", after: "tactile" },
      { path: "uiEffects.strength", before: 50, after: 30 },
    ])
  })
})

describe("diff treats absence as the documented Off default", () => {
  it("an explicit default value is the same design as no field", () => {
    const explicit = apply(base, setUiEffects({})).theme
    expect(explicit.uiEffects).toBeDefined()
    expect(diffThemeTokens(base, explicit)).toEqual([])
    expect(renderShadcnTailwindCss(explicit)).toBe(renderShadcnTailwindCss(base).replace(`revision ${base.revision}.`, `revision ${explicit.revision}.`))
    // A prior both-off payload at the default strength is that same design.
    expect(diffThemeTokens(base, apply(base, setLegacyUiEffects({})).theme)).toEqual([])
  })

  it("Off keeps strength, so switching back to Tactile restores it", () => {
    const tactile = apply(base, setUiEffects({ effect: "tactile", strength: 80 })).theme
    const off = apply(tactile, setUiEffects({ effect: "off", strength: 80 })).theme
    expect(renderUiEffectsCss(off)).toBe("")
    expect(resolveUiEffects(off).strength).toBe(80)
    expect(diffThemeTokens(base, off)).toEqual([{ path: "uiEffects.strength", before: 50, after: 80 }])
  })

  it("the staged proposal pipeline carries uiEffects in its candidate without touching the active theme", () => {
    const session = createProposalSession()
    const staged = stageProposal(session, base, {
      schemaVersion: "1.0",
      proposalId: "ui-effects-1",
      base: { themeId: base.id, revision: base.revision },
      provenance: { source: "fixture", sourceId: "tue", createdAt: "2026-09-29T00:00:00Z" },
      operations: [setUiEffects({ effect: "tactile" })],
    }, "2026-09-29T00:00:00Z")
    if (!staged.ok) throw new Error(JSON.stringify(staged))
    expect(staged.session.staged!.candidate.uiEffects?.effect.$value).toBe("tactile")
    expect(base.uiEffects).toBeUndefined()
    const applied = applyProposal(staged.session, base, "ui-effects-1", "2026-09-29T00:00:01Z")
    if (!applied.ok) throw new Error(JSON.stringify(applied))
    expect(resolveUiEffects(applied.theme!).effect).toBe("tactile")
  })

  it("a staged prior-shape proposal is normalized in its candidate", () => {
    const staged = stageProposal(createProposalSession(), base, {
      schemaVersion: "1.0",
      proposalId: "ui-effects-legacy",
      base: { themeId: base.id, revision: base.revision },
      provenance: { source: "fixture", sourceId: "tue", createdAt: "2026-09-29T00:00:00Z" },
      operations: [setLegacyUiEffects({ outlineButtons: true, strength: 65 })],
    }, "2026-09-29T00:00:00Z")
    if (!staged.ok) throw new Error(JSON.stringify(staged))
    expect(staged.session.staged!.candidate.uiEffects).toEqual(storedCanonical("tactile", 65))
  })
})

describe("TUE-05/06 / IESP-05 / ADSR-04 targeted rendering", () => {
  const css = (value: Partial<UiEffectsValue>) => renderUiEffectsCss(apply(base, setUiEffects(value)).theme)
  const rule = (text: string, selector: string) => {
    const start = text.indexOf(`  ${selector} {\n`)
    return start < 0 ? undefined : text.slice(start, text.indexOf("\n  }", start) + 4)
  }
  const button = `:where(${TACTILE_SECONDARY_BUTTON_SELECTOR})`
  const tabsList = `:where(${TACTILE_SURFACE_TABS_LIST_SELECTOR})`
  const RING = [
    `  ${tabsList} {`,
    "    --tw-ring-shadow: var(--tw-ring-inset,) 0 0 0 calc(1px + var(--tw-ring-offset-width, 0px)) var(--tw-ring-color, currentcolor);",
    "    --tw-ring-color: color-mix(in oklab, var(--ring) 20%, transparent);",
    "    box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow, 0 0 #0000), var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow, 0 0 #0000);",
    "  }",
  ].join("\n")

  it("Tactile targets the Secondary Button with the recipe and a non-line surface TabsList with one fixed ring; no trigger", () => {
    expect(TACTILE_SECONDARY_BUTTON_SELECTOR).toBe('[data-variant="secondary"][data-size]:is([data-slot="button"], [data-slot$="-trigger"], [data-slot$="-close"])')
    expect(TACTILE_SURFACE_TABS_LIST_SELECTOR).toBe('[data-slot="tabs-list"]:not([data-variant="line"])')
    const tactile = css({ effect: "tactile" })
    const selectors = [...tactile.matchAll(/^ {2}(\S.*) \{$/gm)].map((m) => m[1])
    expect(selectors).toEqual([button, `${button}:is(.dark *)`, `${button}:active:not(:disabled)`, tabsList])
    expect(tactile).not.toMatch(/tabs-trigger|data-state|data-variant="(?:default|outline|ghost|destructive|link)"|toggle|input\]|card|slider|switch|dialog|sidebar/i)
    // The TabsList rule is exactly `ring-1 ring-ring/20` and carries nothing from the tactile recipe.
    expect(rule(tactile, tabsList)).toBe(RING)
    expect(rule(tactile, tabsList)).not.toMatch(/ui-tactile|background|--tw-inset-shadow:|--tw-shadow:/)
  })

  it("Off renders nothing at any strength; the targets are not separately configurable", () => {
    expect(css({ effect: "off" })).toBe("")
    expect(css({ effect: "off", strength: 90 })).toBe("")
    expect(css({ effect: "tactile", strength: 90 })).toContain(`${button} {`)
    expect(css({ effect: "tactile", strength: 90 })).toContain(`${tabsList} {`)
  })

  it("PUI-124 Strength scales only the Secondary Button: the TabsList ring is byte-identical at every strength, including 0", () => {
    const rings = [0, 1, 25, 50, 75, 100].map((strength) => rule(css({ effect: "tactile", strength }), tabsList))
    for (const ring of rings) expect(ring).toBe(RING)
    expect(rule(css({ effect: "tactile", strength: 0 }), button)).not.toBe(rule(css({ effect: "tactile", strength: 100 }), button))
  })

  it("uses only semantic tokens, sets no geometry/typography/colour property, keeps rings, and is layered below utilities", () => {
    const out = css({ effect: "tactile", strength: 100 })
    expect(out).toMatch(/^\/\* UI effects: tactile, strength 100\. \*\/\n@layer components \{/)
    const properties = [...out.matchAll(/^\s+([a-z-]+):/gm)].map((m) => m[1])
    expect(new Set(properties)).toEqual(new Set(["--ui-tactile-wash-top", "--ui-tactile-wash-bottom", "--ui-tactile-highlight", "--ui-tactile-lower", "--ui-tactile-edge", "--ui-tactile-press", "background-image", "--tw-inset-shadow", "box-shadow", "--tw-ring-shadow", "--tw-ring-color"]))
    // The base box-shadow is exactly Tailwind's own composition, so ring and shadow utilities keep composing with it.
    expect(out).toContain("    box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow, 0 0 #0000), var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow, 0 0 #0000);")
    expect(out.replaceAll("0 0 #0000", "")).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|oklch\(|hsl\(|white|black/i)
    const tokens = (text: string) => new Set([...text.matchAll(/var\(--([a-z-]+)[,)]/g)].map((m) => m[1]).filter((name) => !name.startsWith("ui-tactile-") && !name.startsWith("tw-")))
    expect(tokens(out.slice(0, out.indexOf(`  ${tabsList} {`)))).toEqual(new Set(["background", "foreground"]))
    expect(tokens(rule(out, tabsList)!)).toEqual(new Set(["ring"]))
    expect(out).toContain(":is(.dark *) {")
    expect(out).toContain(":active:not(:disabled) {")
  })

  it("strength scales the Secondary recipe linearly and is bounded: 0 is transparent, 100 caps every layer", () => {
    const percents = (text: string) => [...text.slice(0, text.indexOf(`  ${tabsList} {`)).matchAll(/ ([\d.]+)%, transparent/g)].map((m) => Number(m[1]))
    expect(percents(css({ effect: "tactile", strength: 0 })).every((p) => p === 0)).toBe(true)
    const half = percents(css({ effect: "tactile", strength: 50 }))
    const full = percents(css({ effect: "tactile", strength: 100 }))
    half.forEach((p, i) => expect(p).toBeCloseTo(full[i]! / 2, 2))
    expect(Math.max(...full)).toBeLessThanOrEqual(90)
  })

  it("is deterministic", () => {
    expect(css({ effect: "tactile", strength: 37 })).toBe(css({ effect: "tactile", strength: 37 }))
  })
})
