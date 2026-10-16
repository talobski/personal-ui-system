import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  applyMutation,
  createProposalSession,
  applyProposal,
  describeOperations,
  diffThemeTokens,
  MUTATION_SCHEMA_VERSION,
  renderPortableThemeCss,
  renderShadcnTailwindCss,
  renderUiEffectsCss,
  resolveUiEffects,
  stageProposal,
  TACTILE_SECONDARY_BUTTON_SELECTOR,
  TACTILE_SURFACE_TABS_LIST_SELECTOR,
  TACTILE_TARGETS,
  THEME_SCHEMA_URI,
  THEME_SCHEMA_VERSION,
  UI_EFFECTS_FLAT,
  validateMutation,
  validateTheme,
} from "../index"
import type { LegacyUiEffectsValue, Theme, ThemeOperation, UiEffectsValue } from "../index"
import amberDuskFixture from "./fixtures/amber-dusk.json"
import defaultFixture from "./fixtures/default.json"
import pocketmarketFixture from "./fixtures/pocketmarket.json"
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

describe("Tactile interaction depth: targeted rendering", () => {
  const css = (value: Partial<UiEffectsValue>, theme: Theme = base) => renderUiEffectsCss(apply(theme, setUiEffects(value)).theme)
  type Rule = { selector: string; decls: Map<string, string> }
  const rules = (text: string): Rule[] =>
    [...text.matchAll(/^ {2}(\S.*) \{\n((?: {4}.*\n)*?) {2}\}$/gm)].map((m) => ({
      selector: m[1]!,
      decls: new Map([...m[2]!.matchAll(/^ {4}([a-z-]+): (.*);$/gm)].map((d) => [d[1]!, d[2]!])),
    }))
  /** A target's own resting rule. */
  const rest = (text: string, selector: string, property: string) => rules(text).find((r) => r.selector === `:where(${selector})`)?.decls.get(property)
  const T = TACTILE_TARGETS
  const roleVar = (text: string, name: string) => rules(text).find((r) => r.selector === ":root, .dark")!.decls.get(name)
  const fixtures = [defaultFixture, quietFixture, amberDuskFixture, pocketmarketFixture].map(valid)

  it("keeps the accepted selectors and reads only stable shadcn slot, variant and state hooks", () => {
    expect(TACTILE_SECONDARY_BUTTON_SELECTOR).toBe('[data-variant="secondary"][data-size]:is([data-slot="button"], [data-slot$="-trigger"], [data-slot$="-close"])')
    expect(TACTILE_SURFACE_TABS_LIST_SELECTOR).toBe('[data-slot="tabs-list"]:not([data-variant="line"])')
    expect(T.primaryButton).toBe(TACTILE_SECONDARY_BUTTON_SELECTOR.replace("secondary", "default"))
    expect(T.outlineButton).toBe(TACTILE_SECONDARY_BUTTON_SELECTOR.replace("secondary", "outline"))
    const tactile = css({ effect: "tactile" })
    for (const { selector } of rules(tactile)) {
      if (selector === ":root" || selector === ".dark" || selector === ":root, .dark") continue
      expect(selector).toMatch(/^:where\(.*\)$/)
      expect(selector.replace(/\[(?:data-slot|data-variant|data-size|data-state|data-checked|data-pressed|data-popup-open|data-disabled|data-tactile|aria-[a-z]+)[$]?(?:="[^"]*")?\]/g, "")).not.toMatch(/[[.#]/)
    }
  })

  it("Off and Tactile at strength 0 both render nothing, so strength 0 leaves no residual styling, the TabsList edge included", () => {
    expect(css({ effect: "off" })).toBe("")
    expect(css({ effect: "off", strength: 90 })).toBe("")
    expect(css({ effect: "tactile", strength: 0 })).toBe("")
    const zero = apply(base, setUiEffects({ effect: "tactile", strength: 0 })).theme
    const off = apply(base, setUiEffects({ effect: "off", strength: 0 })).theme
    expect(renderPortableThemeCss(zero)).toBe(renderPortableThemeCss(off))
    expect(css({ effect: "tactile", strength: 1 })).toContain("@layer components {")
  })

  it("the TabsList edge and the outer elevation fade in to the theme's own value at the default strength, then hold", () => {
    const edge = (strength: number) => roleVar(css({ effect: "tactile", strength }), "--ui-tactile-track-edge")
    expect(edge(10)).toBe("color-mix(in oklab, var(--border) 16%, transparent)")
    expect(edge(25)).toBe("color-mix(in oklab, var(--border) 40%, transparent)")
    // At and above the default, exactly the accepted `inset-ring-border/80` (PUI-129/PUI-133).
    for (const strength of [50, 75, 100]) expect(edge(strength)).toBe("color-mix(in oklab, var(--border) 80%, transparent)")
    const out = css({ effect: "tactile" })
    expect(rest(out, T.tabsList, "--tw-inset-ring-shadow")).toBe("inset 0 0 0 1px var(--tw-inset-ring-color, currentcolor)")
    expect(rest(out, T.tabsList, "--tw-inset-ring-color")).toBe("var(--ui-tactile-track-edge)")
    // Elevation: the theme's xs shadow itself from the default up; below it the same layers with only their alpha faded.
    const elevation = (strength: number, theme: Theme = base) => roleVar(css({ effect: "tactile", strength }, theme), "--ui-tactile-elevation")
    for (const strength of [50, 80, 100]) expect(elevation(strength)).toBe("var(--shadow-layers-xs)")
    for (const theme of fixtures) {
      const layers = theme.shadow.xs.$value
      const faded = (percent: number) => layers.map((l) => `${l.inset ? "inset " : ""}${l.offsetX} ${l.offsetY} ${l.blur} ${l.spread} color-mix(in oklab, ${l.color} ${percent}%, transparent)`).join(", ")
      expect(elevation(10, theme)).toBe(faded(20))
      expect(elevation(25, theme)).toBe(faded(50))
    }
  })

  it("strength scales every depth alpha and hover mix linearly and never touches a semantic colour value", () => {
    // The palette and hover mix; the theme-token contributions (track edge, elevation) are covered separately.
    const percents = (text: string) => [...text.split("\n").filter((line) => !/--ui-tactile-(?:track-edge|elevation):/.test(line)).join("\n").matchAll(/ ([\d.]+)%(?:, transparent)?\)/g)].map((m) => Number(m[1]))
    const [quarter, half, full] = [25, 50, 100].map((strength) => percents(css({ effect: "tactile", strength })))
    expect(full!.length).toBeGreaterThan(20)
    half!.forEach((p, i) => expect(p).toBeCloseTo(full![i]! / 2, 2))
    quarter!.forEach((p, i) => expect(p).toBeCloseTo(full![i]! / 4, 2))
    expect(Math.max(...full!)).toBeLessThanOrEqual(90)
    // Only the selectors' own state and the alphas change with strength.
    const shape = (strength: number) => css({ effect: "tactile", strength }).replace(/strength \d+/, "").replace(/[\d.]+%/g, "N%")
    expect(shape(60)).toBe(shape(90))
    expect(shape(10)).toBe(shape(40))
  })

  it("gives each control its semantic role: Raised, Filled, Recessed", () => {
    const out = css({ effect: "tactile" })
    expect(rest(out, T.secondaryButton, "--tw-inset-shadow")).toBe("var(--ui-tactile-raised), 0 0 0 1px var(--ui-tactile-edge)")
    expect(rest(out, T.secondaryButton, "background-image")).toBe("linear-gradient(to bottom, var(--ui-tactile-wash-top), var(--ui-tactile-wash-bottom))")
    for (const raised of [T.outlineButton, T.outlineToggle]) expect(rules(out).find((r) => r.selector.includes(raised) && r.decls.get("--tw-inset-shadow") === "var(--ui-tactile-raised)"), raised).toBeDefined()
    expect(rest(out, T.primaryButton, "--tw-inset-shadow")).toBe("var(--ui-tactile-filled)")
    // Primary and Secondary have no shadow utility, so Tactile gives them its elevation, from the theme's xs shadow.
    for (const filled of [T.primaryButton, T.secondaryButton]) expect(rest(out, filled, "--tw-shadow")).toBe("var(--ui-tactile-elevation)")
    const recessed = rules(out).find((r) => r.decls.get("--tw-inset-shadow") === "var(--ui-tactile-recessed)")!
    for (const target of [T.field, T.fieldGroup, T.tabsList, T.checkbox, T.radio, T.switch]) expect(recessed.selector).toContain(target)
    for (const slot of ["input", "textarea", "select-trigger", "native-select"]) expect(T.field).toContain(`[data-slot="${slot}"]`)
    expect(rest(out, T.switchThumb, "--tw-shadow")).toBe("var(--ui-tactile-elevation)")
    // The roles compose the palette once, on :root and .dark, so a dark subtree recomposes them.
    const roles = rules(out).find((r) => r.selector === ":root, .dark")!.decls
    expect(roles.get("--ui-tactile-raised")).toBe("inset 0 1px 0 0 var(--ui-tactile-highlight), inset 0 -1px 0 0 var(--ui-tactile-shade)")
    expect(roles.get("--ui-tactile-filled")).toBe("inset 0 1px 0 0 var(--ui-tactile-fill-highlight), inset 0 -1px 0 0 var(--ui-tactile-fill-shade)")
    expect(roles.get("--ui-tactile-recessed")).toBe("inset 0 1px 2px 0 var(--ui-tactile-recess)")
    expect(roles.get("--ui-tactile-pressed")).toBe("inset 0 1px 2px 0 var(--ui-tactile-press)")
  })

  it("a field inside a group leaves the recess to its group, so depth is never doubled", () => {
    expect(T.fieldGroup).toBe(':is([data-slot$="input-group"], :has(> [data-slot="input-group-control"]))')
    expect(T.field.endsWith(`:not(${T.fieldGroup} *)`)).toBe(true)
    // shadcn's InputGroupInput takes the `input-group-control` slot, which is no field target.
    expect(T.field).not.toContain("input-group-control\"]),")
    expect(Object.values(T).filter((selector) => selector.includes('[data-slot="input-group-control"]'))).toEqual([T.field, T.fieldGroup])
  })

  it("checked, selected, open and pressed states switch to the intended depth, after hover and before Flat", () => {
    const out = css({ effect: "tactile" })
    const all = rules(out)
    const index = (predicate: (r: Rule) => boolean) => all.findIndex(predicate)
    const checked = index((r) => r.selector.includes('[data-state="checked"]'))
    expect(all[checked]!.decls.get("--tw-inset-shadow")).toBe("var(--ui-tactile-filled)")
    for (const target of [T.checkbox, T.radio, T.switch]) expect(all[checked]!.selector).toContain(target)
    const pressed = index((r) => r.decls.get("--tw-inset-shadow") === "var(--ui-tactile-pressed)")
    const pressedSelector = all[pressed]!.selector
    for (const state of [":active", '[aria-pressed="true"]', '[data-state="open"]', '[aria-expanded="true"]', '[data-state="on"]', '[aria-checked="true"]']) expect(pressedSelector).toContain(state)
    // Pressed removes the outer elevation, including a `shadow-xs` utility's, by zeroing the theme token on the control.
    expect(all[pressed]!.decls.get("--shadow-layers-xs")).toBe("0 0 #0000")
    expect(all[pressed]!.decls.get("--ui-tactile-elevation")).toBe("0 0 #0000")
    const secondaryPressed = index((r) => r.selector.includes(T.secondaryButton) && r.selector.includes(":active"))
    expect(all[secondaryPressed]!.decls.get("background-image")).toBe("linear-gradient(to bottom, var(--ui-tactile-wash-bottom), var(--ui-tactile-wash-top))")
    // Secondary's open Collapsible state is not pressed: only Outline Buttons read open as inset.
    expect(all.filter((r) => r.selector.includes('[data-state="open"]')).every((r) => !r.selector.includes(T.secondaryButton))).toBe(true)
    const hover = index((r) => r.selector.includes(":hover"))
    const flat = index((r) => r.selector.includes('[data-tactile="flat"]'))
    expect(hover).toBeLessThan(checked)
    expect(checked).toBeLessThan(pressed)
    expect(pressed).toBeLessThan(flat)
    expect(flat).toBe(all.length - 1)
  })

  it("Flat (disabled or data-tactile=\"flat\") is the last rule and removes every tactile layer from every target", () => {
    const out = css({ effect: "tactile", strength: 100 })
    const flat = rules(out).at(-1)!
    for (const target of Object.values(T)) expect(flat.selector).toContain(target)
    for (const state of [":disabled", "[data-disabled]", '[aria-disabled="true"]', '[data-tactile="flat"]', '[data-tactile="flat"] *']) expect(flat.selector).toContain(state)
    expect(Object.fromEntries(flat.decls)).toEqual({
      "box-shadow": "none",
      "background-image": "none",
      "--tw-inset-shadow": "0 0 #0000",
      "--tw-inset-ring-shadow": "0 0 #0000",
      "--tw-shadow": "0 0 #0000",
      "--tw-duration": "initial",
      "--ui-tactile-elevation": "inherit",
      "--shadow-layers-xs": "inherit",
      "--border": "inherit",
      "--input": "inherit",
      "--primary": "inherit",
    })
    // Everything another rule sets on a control is reset here.
    const set = new Set(rules(out).filter((r) => r.selector.startsWith(":where(")).flatMap((r) => [...r.decls.keys()]))
    for (const property of set) if (property !== "--tw-inset-ring-color") expect(flat.decls.has(property), property).toBe(true)
  })

  it("line Tabs, ghost/link/destructive Buttons, static surfaces and overlays are never targets", () => {
    const out = css({ effect: "tactile" })
    for (const selector of Object.values(T)) expect(selector).not.toMatch(/data-variant="(?:ghost|link|destructive)"/)
    expect(T.tabsList).toContain(':not([data-variant="line"])')
    // Tabs triggers keep shadcn's own styling: the active one already rises on its shadow-sm.
    expect(out).not.toContain("tabs-trigger")
    expect(out).not.toMatch(/card|table|badge|avatar|dialog|popover|menu|sheet|drawer|sidebar|slider|label|separator/i)
  })

  it("never touches focus or invalid rings, borders' own colour, geometry, typography or motion values, and adds no press translation", () => {
    const out = css({ effect: "tactile", strength: 100 })
    const properties = new Set(rules(out).flatMap((r) => [...r.decls.keys()]))
    for (const property of properties) expect(property, property).toMatch(/^(?:--ui-tactile-[a-z-]+|--tw-(?:inset-shadow|inset-ring-shadow|inset-ring-color|shadow|duration)|--shadow-layers-xs|--border|--input|--primary|box-shadow|background-image)$/)
    expect(out).not.toMatch(/:focus|aria-invalid/)
    // Hover and Flat redefine --border/--input/--primary only from captured theme colours, never a literal.
    expect(out.replaceAll("0 0 #0000", "")).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|oklch\(|hsl\(|white|black/i)
    expect(out).toContain("--tw-duration: var(--motion-duration-fast);")
    expect(out).toMatch(/^\/\* UI effects: tactile, strength 100\. \*\/\n@layer components \{/)
  })

  it("derives light and dark depth from each palette's own background and foreground", () => {
    for (const theme of fixtures) {
      const out = css({ effect: "tactile", strength: 60 }, theme)
      const light = rules(out).find((r) => r.selector === ":root")!.decls
      const dark = rules(out).find((r) => r.selector === ".dark")!.decls
      expect([...light.keys()]).toEqual([...dark.keys()])
      expect(light.get("--ui-tactile-highlight")).toMatch(/^color-mix\(in oklab, var\(--background\) [\d.]+%, transparent\)$/)
      expect(dark.get("--ui-tactile-highlight")).toMatch(/^color-mix\(in oklab, var\(--foreground\) [\d.]+%, transparent\)$/)
      expect(light.get("--ui-tactile-shade")).toContain("var(--foreground)")
      expect(dark.get("--ui-tactile-shade")).toContain("var(--background)")
      // From the default strength up the CSS is the same for every palette: depth colours come from the theme at runtime.
      expect(out).toBe(css({ effect: "tactile", strength: 60 }))
      const tokens = new Set([...out.matchAll(/var\(--([a-z-]+)[,)]/g)].map((m) => m[1]).filter((name) => !name!.startsWith("ui-tactile-") && !name!.startsWith("tw-")))
      expect(tokens).toEqual(new Set(["background", "foreground", "border", "input", "primary", "shadow-layers-xs", "motion-duration-fast"]))
    }
  })

  it("the exported Theme Code CSS carries exactly the live preview's block", () => {
    for (const theme of fixtures) {
      const tactile = apply(theme, setUiEffects({ effect: "tactile", strength: 42 })).theme
      const block = renderUiEffectsCss(tactile)
      expect(renderPortableThemeCss(tactile).endsWith(`\n${block}`)).toBe(true)
      expect(renderShadcnTailwindCss(tactile).endsWith(`\n${block}`)).toBe(true)
    }
  })

  it("is deterministic", () => {
    expect(css({ effect: "tactile", strength: 37 })).toBe(css({ effect: "tactile", strength: 37 }))
  })
})
